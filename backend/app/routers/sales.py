from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.database import get_db
from app.crud import get_customer
from app.models import Order, OrderLine

router = APIRouter(prefix="/sales", tags=["Sales"])

@router.get("/{customer_id}/orders")
def get_orders(
    customer_id: str,
    date: Optional[str] = Query(None, description="Filter by business_date YYYY-MM-DD"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """Fetches synced orders with lines for a restaurant customer."""
    customer = get_customer(db, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found.")

    query = db.query(Order).filter(Order.customer_id == customer_id)
    if date:
        query = query.filter(Order.business_date == date)

    total_count = query.count()
    orders = query.order_by(Order.created_at.desc()).offset(offset).limit(limit).all()

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
            "created_at": o.created_at,
            "lines": lines,
            "synced_at": o.synced_at
        })

    return {
        "customer_id": customer_id,
        "total_count": total_count,
        "orders": results
    }

@router.get("/{customer_id}/stats")
def get_stats(
    customer_id: str,
    date: Optional[str] = Query(None, description="Optional business_date filter YYYY-MM-DD"),
    db: Session = Depends(get_db)
):
    """Aggregate sales statistics from synced orders."""
    customer = get_customer(db, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found.")

    query = db.query(
        func.count(Order.id).label("total_orders"),
        func.coalesce(func.sum(Order.subtotal), 0).label("gross_sales"),
        func.coalesce(func.sum(Order.discount), 0).label("discount_total"),
        func.coalesce(func.sum(Order.tax), 0).label("tax_total"),
        func.coalesce(func.sum(Order.total), 0).label("net_sales")
    ).filter(
        Order.customer_id == customer_id,
        Order.status != "cancelled"
    )

    if date:
        query = query.filter(Order.business_date == date)

    stats = query.first()

    # Payment modes breakdown
    mode_query = db.query(
        Order.payment_mode,
        func.count(Order.id).label("count"),
        func.coalesce(func.sum(Order.total), 0).label("amount")
    ).filter(
        Order.customer_id == customer_id,
        Order.status != "cancelled"
    )
    if date:
        mode_query = mode_query.filter(Order.business_date == date)
    modes = mode_query.group_by(Order.payment_mode).all()

    return {
        "customer_id": customer_id,
        "filter_date": date,
        "total_orders": stats.total_orders,
        "gross_sales": stats.gross_sales,
        "discount_total": stats.discount_total,
        "tax_total": stats.tax_total,
        "net_sales": stats.net_sales,
        "payment_breakdown": [
            {"mode": m.payment_mode or "unspecified", "count": m.count, "amount": m.amount}
            for m in modes
        ]
    }
