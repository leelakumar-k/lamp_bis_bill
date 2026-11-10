from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.crud import get_customer, sync_menu, sync_orders_batch, upsert_daily_summary
from app.models import DailySummary
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
