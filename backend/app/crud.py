from datetime import datetime, timezone
from typing import List, Optional, Tuple
from sqlalchemy import func, or_
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models import Category, Customer, DailySummary, License, MenuItem, Order, OrderLine
from app.schemas import (
    CustomerRegisterRequest, CustomerUpdateRequest,
    DailySummarySyncRequest, MenuSyncRequest, OrderSyncItem
)
from app.utils import (
    calculate_new_license_expiry, generate_customer_id,
    generate_license_code, normalize_phone, normalize_text
)

# ----------------- Customer CRUD -----------------

def get_customer(db: Session, customer_id: str) -> Optional[Customer]:
    return db.query(Customer).filter(Customer.customer_id == customer_id).first()

def get_customer_by_phone(db: Session, phone: str) -> Optional[Customer]:
    cleaned = normalize_phone(phone)
    # Check all customers matching digits
    return db.query(Customer).filter(
        func.regexp_replace(Customer.phone, r"[^0-9]", "", "g") == cleaned
    ).first()

def check_customer_duplicate(db: Session, business_name: str, phone: str, location: str) -> Optional[Customer]:
    norm_name = normalize_text(business_name)
    norm_phone = normalize_phone(phone)
    norm_loc = normalize_text(location)

    # Search for match on normalized name, phone digits, and normalized location
    customers = db.query(Customer).all()
    for c in customers:
        if (
            normalize_text(c.business_name) == norm_name and
            normalize_phone(c.phone) == norm_phone and
            normalize_text(c.location) == norm_loc
        ):
            return c
    return None

def register_customer(db: Session, req: CustomerRegisterRequest) -> Customer:
    # 1. Duplicate check on (name, phone, location)
    existing = check_customer_duplicate(db, req.business_name, req.phone, req.location)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Customer already exists with matching Business Name ('{existing.business_name}'), "
                f"Phone ('{existing.phone}'), and Location. Customer ID: {existing.customer_id}."
            )
        )

    # 2. Generate non-sequential 9-character alphanumeric ID
    for _ in range(10):
        new_id = generate_customer_id(9)
        if not get_customer(db, new_id):
            break
    else:
        raise HTTPException(status_code=500, detail="Failed to allocate unique customer ID. Please retry.")

    plan = (req.plan or "super").lower()
    if plan not in ("super", "gold", "premium"):
        plan = "super"

    license_code = None
    license_expires_at = None

    # If license code was provided during registration, apply it
    if req.license_code:
        lic = db.query(License).filter(
            License.license_code == req.license_code.strip(),
            License.is_used == False
        ).first()
        if not lic:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"License code '{req.license_code}' is invalid or already used."
            )
        plan = lic.plan
        license_code = lic.license_code
        license_expires_at = calculate_new_license_expiry(None, lic.duration_days)
        lic.is_used = True
        lic.used_by_customer_id = new_id
        lic.activated_at = datetime.now(timezone.utc)
    else:
        # Default 365-day trial/active period for the chosen plan
        license_expires_at = calculate_new_license_expiry(None, 365)

    customer = Customer(
        customer_id=new_id,
        business_name=req.business_name.strip(),
        phone=req.phone.strip(),
        email=req.email.strip() if req.email else None,
        location=req.location.strip(),
        plan=plan,
        license_code=license_code,
        license_expires_at=license_expires_at,
        status="active",
    )
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer

def update_customer(db: Session, customer_id: str, req: CustomerUpdateRequest) -> Customer:
    customer = get_customer(db, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail=f"Customer '{customer_id}' not found.")

    if req.business_name is not None:
        customer.business_name = req.business_name.strip()
    if req.phone is not None:
        customer.phone = req.phone.strip()
    if req.email is not None:
        customer.email = req.email.strip() if req.email else None
    if req.location is not None:
        customer.location = req.location.strip()

    customer.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(customer)
    return customer

def get_days_remaining(expires_at: Optional[datetime]) -> int:
    if not expires_at:
        return 0
    now = datetime.now(timezone.utc)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    diff = (expires_at - now).total_seconds()
    return max(0, int(diff // 86400))

# ----------------- License CRUD -----------------

def create_licenses(db: Session, plan: str, duration_days: int = 365, count: int = 1) -> List[License]:
    plan = plan.lower()
    if plan not in ("super", "gold", "premium"):
        raise HTTPException(status_code=400, detail="Plan must be 'super', 'gold', or 'premium'.")

    created = []
    for _ in range(count):
        for _ in range(10):
            code = generate_license_code(plan)
            if not db.query(License).filter(License.license_code == code).first():
                break
        lic = License(
            license_code=code,
            plan=plan,
            duration_days=duration_days,
            is_used=False
        )
        db.add(lic)
        created.append(lic)

    db.commit()
    for lic in created:
        db.refresh(lic)
    return created

def activate_license(db: Session, customer_id: str, license_code: str) -> Customer:
    customer = get_customer(db, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail=f"Customer '{customer_id}' not found.")

    lic = db.query(License).filter(
        License.license_code == license_code.strip(),
        License.is_used == False
    ).first()

    if not lic:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"License code '{license_code}' is invalid or has already been used."
        )

    # Core Rule: Calculate 365 days from given date. If customer has leftover days,
    # add those days too and increase expiry accordingly.
    new_expiry = calculate_new_license_expiry(customer.license_expires_at, lic.duration_days)

    customer.plan = lic.plan
    customer.license_code = lic.license_code
    customer.license_expires_at = new_expiry
    customer.status = "active"
    customer.updated_at = datetime.now(timezone.utc)

    lic.is_used = True
    lic.used_by_customer_id = customer.customer_id
    lic.activated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(customer)
    return customer

# ----------------- Daily Summary Sync (Gold & Premium) -----------------

def upsert_daily_summary(db: Session, req: DailySummarySyncRequest) -> DailySummary:
    customer = get_customer(db, req.customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail=f"Customer '{req.customer_id}' not found.")

    if customer.plan == "super":
        raise HTTPException(
            status_code=403,
            detail="Super plan stores data on local device only. Upgrade to Gold or Premium to sync summaries."
        )

    existing = db.query(DailySummary).filter(
        DailySummary.customer_id == req.customer_id,
        DailySummary.business_date == req.business_date,
        DailySummary.shift_name == req.shift_name
    ).first()

    if existing:
        existing.orders_count = req.orders_count
        existing.gross_sales = req.gross_sales
        existing.discount_total = req.discount_total
        existing.tax_total = req.tax_total
        existing.round_off_total = req.round_off_total
        existing.net_sales = req.net_sales
        existing.cash_total = req.cash_total
        existing.upi_total = req.upi_total
        existing.card_total = req.card_total
        existing.unpaid_total = req.unpaid_total
        existing.synced_at = datetime.now(timezone.utc)
        record = existing
    else:
        record = DailySummary(
            customer_id=req.customer_id,
            business_date=req.business_date,
            shift_name=req.shift_name,
            orders_count=req.orders_count,
            gross_sales=req.gross_sales,
            discount_total=req.discount_total,
            tax_total=req.tax_total,
            round_off_total=req.round_off_total,
            net_sales=req.net_sales,
            cash_total=req.cash_total,
            upi_total=req.upi_total,
            card_total=req.card_total,
            unpaid_total=req.unpaid_total,
            synced_at=datetime.now(timezone.utc)
        )
        db.add(record)

    db.commit()
    db.refresh(record)
    return record

# ----------------- Menu Sync (Premium) -----------------

def sync_menu(db: Session, req: MenuSyncRequest) -> dict:
    customer = get_customer(db, req.customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail=f"Customer '{req.customer_id}' not found.")

    if customer.plan != "premium":
        raise HTTPException(
            status_code=403,
            detail="Menu sync is only available on Premium plan."
        )

    # Upsert categories
    cat_count = 0
    for cat in req.categories:
        existing = db.query(Category).filter(
            Category.customer_id == req.customer_id,
            Category.local_id == cat.local_id
        ).first()
        if existing:
            existing.name = cat.name
            existing.sort_order = cat.sort_order
            existing.synced_at = datetime.now(timezone.utc)
        else:
            db.add(Category(
                customer_id=req.customer_id,
                local_id=cat.local_id,
                name=cat.name,
                sort_order=cat.sort_order
            ))
        cat_count += 1

    # Upsert items
    item_count = 0
    for item in req.items:
        existing = db.query(MenuItem).filter(
            MenuItem.customer_id == req.customer_id,
            MenuItem.local_id == item.local_id
        ).first()
        if existing:
            existing.name = item.name
            existing.price = item.price
            existing.category_local_id = item.category_local_id
            existing.is_active = item.is_active
            existing.synced_at = datetime.now(timezone.utc)
        else:
            db.add(MenuItem(
                customer_id=req.customer_id,
                local_id=item.local_id,
                category_local_id=item.category_local_id,
                name=item.name,
                price=item.price,
                is_active=item.is_active
            ))
        item_count += 1

    db.commit()
    return {"categories_synced": cat_count, "items_synced": item_count}

# ----------------- Order Batch Sync (Premium) -----------------

def sync_orders_batch(db: Session, customer_id: str, orders: List[OrderSyncItem]) -> Tuple[int, int, List[str]]:
    customer = get_customer(db, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail=f"Customer '{customer_id}' not found.")

    if customer.plan != "premium":
        raise HTTPException(
            status_code=403,
            detail="Order sync is only available on Premium plan. Super and Gold do not sync individual orders."
        )

    synced_ids = []
    failed_count = 0

    for o in orders:
        try:
            existing = db.query(Order).filter(
                Order.customer_id == customer_id,
                Order.local_order_id == o.local_order_id
            ).first()

            if existing:
                # Update status/amounts idempotently
                existing.status = o.status
                existing.payment_mode = o.payment_mode
                existing.subtotal = o.subtotal
                existing.discount = o.discount
                existing.tax = o.tax
                existing.round_off = o.round_off
                existing.total = o.total
                existing.billed_at = o.billed_at
                existing.paid_at = o.paid_at
                existing.synced_at = datetime.now(timezone.utc)
                order_rec = existing
            else:
                order_rec = Order(
                    customer_id=customer_id,
                    local_order_id=o.local_order_id,
                    bill_no=o.bill_no,
                    token=o.token,
                    type=o.type,
                    status=o.status,
                    business_date=o.business_date,
                    shift_name=o.shift_name,
                    table_name=o.table_name,
                    customer_name=o.customer_name,
                    payment_mode=o.payment_mode,
                    subtotal=o.subtotal,
                    discount=o.discount,
                    tax_percent=o.tax_percent,
                    tax=o.tax,
                    round_off=o.round_off,
                    total=o.total,
                    created_at=o.created_at,
                    billed_at=o.billed_at,
                    paid_at=o.paid_at,
                    synced_at=datetime.now(timezone.utc)
                )
                db.add(order_rec)
                db.flush()

                # Add order lines
                for l in o.lines:
                    db.add(OrderLine(
                        order_id=order_rec.id,
                        customer_id=customer_id,
                        item_local_id=l.item_local_id,
                        name=l.name,
                        price=l.price,
                        qty=l.qty,
                        note=l.note
                    ))

            synced_ids.append(o.local_order_id)
        except Exception as e:
            failed_count += 1
            print(f"Error syncing order {o.local_order_id}: {e}")

    db.commit()
    return len(synced_ids), failed_count, synced_ids
