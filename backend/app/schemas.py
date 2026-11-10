from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field

# ----------------- Customer Schemas -----------------

class CustomerRegisterRequest(BaseModel):
    business_name: str = Field(..., min_length=2, max_length=255, description="Registered restaurant business name")
    phone: str = Field(..., min_length=7, max_length=20, description="Owner contact phone number")
    email: Optional[str] = Field(None, max_length=255, description="Contact email address")
    location: str = Field(..., min_length=2, description="Physical restaurant address or location")
    plan: Optional[str] = Field("super", description="Chosen plan: super, gold, premium")
    license_code: Optional[str] = Field(None, description="Optional activation license code on registration")

class CustomerUpdateRequest(BaseModel):
    business_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    location: Optional[str] = None

class CustomerResponse(BaseModel):
    customer_id: str
    business_name: str
    phone: str
    email: Optional[str] = None
    location: str
    plan: str
    license_code: Optional[str] = None
    license_expires_at: Optional[datetime] = None
    days_remaining: int = 0
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# ----------------- License Schemas -----------------

class LicenseGenerateRequest(BaseModel):
    plan: str = Field(..., description="Plan: super, gold, premium")
    duration_days: int = Field(365, ge=1, le=1825, description="Duration in days (default 365)")
    count: int = Field(1, ge=1, le=100, description="Number of license codes to generate")

class LicenseResponse(BaseModel):
    license_code: str
    plan: str
    duration_days: int
    is_used: bool
    used_by_customer_id: Optional[str] = None
    activated_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True

class LicenseActivateRequest(BaseModel):
    customer_id: str = Field(..., min_length=9, max_length=9)
    license_code: str = Field(..., min_length=5, max_length=50)

# ----------------- Daily Summary (Gold & Premium) -----------------

class DailySummarySyncRequest(BaseModel):
    customer_id: str
    business_date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    shift_name: str = "Default"
    orders_count: int = 0
    gross_sales: int = 0
    discount_total: int = 0
    tax_total: int = 0
    round_off_total: int = 0
    net_sales: int = 0
    cash_total: int = 0
    upi_total: int = 0
    card_total: int = 0
    unpaid_total: int = 0

class DailySummaryResponse(DailySummarySyncRequest):
    id: int
    synced_at: datetime

    class Config:
        from_attributes = True

# ----------------- Menu & Categories (Premium) -----------------

class CategorySyncItem(BaseModel):
    local_id: str
    name: str
    sort_order: int = 0

class MenuItemSyncItem(BaseModel):
    local_id: str
    category_local_id: Optional[str] = None
    name: str
    price: int
    is_active: bool = True

class MenuSyncRequest(BaseModel):
    customer_id: str
    categories: List[CategorySyncItem] = []
    items: List[MenuItemSyncItem] = []

# ----------------- Orders Sync (Premium) -----------------

class OrderLineSyncItem(BaseModel):
    item_local_id: Optional[str] = None
    name: str
    price: int
    qty: int
    note: Optional[str] = None

class OrderSyncItem(BaseModel):
    local_order_id: str
    bill_no: Optional[int] = None
    token: Optional[int] = None
    type: str = "takeaway"
    status: str = "paid"
    business_date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    shift_name: Optional[str] = None
    table_name: Optional[str] = None
    customer_name: Optional[str] = None
    payment_mode: Optional[str] = None
    subtotal: int
    discount: int = 0
    tax_percent: float = 0.0
    tax: int = 0
    round_off: int = 0
    total: int
    created_at: Optional[datetime] = None
    billed_at: Optional[datetime] = None
    paid_at: Optional[datetime] = None
    lines: List[OrderLineSyncItem] = []

class OrderBatchSyncRequest(BaseModel):
    customer_id: str
    orders: List[OrderSyncItem]

class OrderBatchSyncResponse(BaseModel):
    synced_count: int
    failed_count: int
    order_ids: List[str]
    message: str
