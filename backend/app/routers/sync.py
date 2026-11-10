from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.crud import get_customer, sync_menu, sync_orders_batch, upsert_daily_summary
from app.models import DailySummary, Order, OrderLine
from app.schemas import (
    DailySummaryResponse, DailySummarySyncRequest,
    MenuSyncRequest, OrderBatchSyncRequest, OrderBatchSyncResponse
)

router = APIRouter(prefix="/sync", tags=["Sync"])

# ----------------- Daily Summary (Gold & Premium) -----------------

@router.post("/daily-summary", response_model=DailySummaryResponse, status_code=status.HTTP_200_OK)
def sync_daily(req: DailySummarySyncRequest, db: Session = Depends(get_db)):
    """
    Syncs end-of-day / shift sales summary report to the cloud.
    - Used by Gold and Premium plans.
    - Super plan is rejected (local device only).
    """
    record = upsert_daily_summary(db, req)
    return record

@router.get("/daily-summary/{customer_id}", response_model=List[DailySummaryResponse])
def get_daily_summaries(
    customer_id: str,
    from_date: str = Query(None, description="Start date YYYY-MM-DD"),
    to_date: str = Query(None, description="End date YYYY-MM-DD"),
    db: Session = Depends(get_db)
):
    customer = get_customer(db, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found.")

    query = db.query(DailySummary).filter(DailySummary.customer_id == customer_id)
    if from_date:
        query = query.filter(DailySummary.business_date >= from_date)
    if to_date:
        query = query.filter(DailySummary.business_date <= to_date)

    return query.order_by(DailySummary.business_date.desc()).all()

# ----------------- Menu Sync (Premium) -----------------

@router.post("/menu")
def sync_menu_items(req: MenuSyncRequest, db: Session = Depends(get_db)):
    """
    Batch syncs categories and menu items for a customer.
    - Used exclusively by Premium plan.
    """
    return sync_menu(db, req)

# ----------------- Order Batch Sync (Premium) -----------------

@router.post("/orders/batch", response_model=OrderBatchSyncResponse)
def sync_orders(req: OrderBatchSyncRequest, db: Session = Depends(get_db)):
    """
    Batch syncs completed/billed orders from the mobile app to server.
    - Handled in background without blocking billing.
    - Completely idempotent by local_order_id.
    - Exclusively for Premium plan.
    """
    synced, failed, ids = sync_orders_batch(db, req.customer_id, req.orders)
    return OrderBatchSyncResponse(
        synced_count=synced,
        failed_count=failed,
        order_ids=ids,
        message=f"Successfully synced {synced} orders ({failed} failed)."
    )

# ----------------- Multi-Counter / Multi-Device Sync (Premium) -----------------

@router.get("/orders/changes")
def get_order_changes(
    customer_id: str = Query(...),
    since: Optional[str] = Query(None, description="ISO timestamp to fetch changes since"),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db)
):
    """
    Fetches orders created or updated since a given timestamp for multi-counter sync.
    Exclusively for Premium plan.
    """
    customer = get_customer(db, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found.")
    if customer.plan != "premium":
        raise HTTPException(status_code=403, detail="Multi-device sync is for Premium plan.")

    query = db.query(Order).filter(Order.customer_id == customer_id)
    if since:
        try:
            since_dt = datetime.fromisoformat(since.replace("Z", "+00:00"))
            query = query.filter(Order.synced_at > since_dt)
        except Exception:
            pass

    orders = query.order_by(Order.synced_at.asc()).limit(limit).all()
    results = []
    for o in orders:
        lines = [
            {
                "item_local_id": l.item_local_id,
                "name": l.name,
                "price": l.price,
                "qty": l.qty,
                "note": l.note
            }
            for l in o.lines
        ]
        results.append({
            "local_order_id": o.local_order_id,
            "bill_no": o.bill_no,
            "token": o.token,
            "type": o.type,
            "status": o.status,
            "business_date": o.business_date,
            "shift_name": o.shift_name,
            "table_name": o.table_name,
            "customer_name": o.customer_name,
            "payment_mode": o.payment_mode,
            "subtotal": o.subtotal,
            "discount": o.discount,
            "tax": o.tax,
            "round_off": o.round_off,
            "total": o.total,
            "created_at": o.created_at.isoformat() if o.created_at else None,
            "billed_at": o.billed_at.isoformat() if o.billed_at else None,
            "paid_at": o.paid_at.isoformat() if o.paid_at else None,
            "synced_at": o.synced_at.isoformat() if o.synced_at else None,
            "lines": lines
        })
    return {"customer_id": customer_id, "changes_count": len(results), "orders": results}

@router.get("/tables/live")
def get_live_tables(
    customer_id: str = Query(...),
    db: Session = Depends(get_db)
):
    """Returns currently occupied / open tables across all counters."""
    customer = get_customer(db, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found.")
    
    active_orders = db.query(Order).filter(
        Order.customer_id == customer_id,
        Order.status.in_(["open", "billed"]),
        Order.table_name.isnot(None)
    ).all()

    tables = [
        {
            "table_name": o.table_name,
            "status": o.status,
            "order_id": o.local_order_id,
            "total": o.total,
            "customer_name": o.customer_name,
            "synced_at": o.synced_at.isoformat() if o.synced_at else None
        }
        for o in active_orders
    ]
    return {"customer_id": customer_id, "active_tables": tables}
