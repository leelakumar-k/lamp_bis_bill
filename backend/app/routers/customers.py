from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.crud import get_customer, get_customer_by_phone, get_days_remaining, register_customer, update_customer
from app.schemas import CustomerRegisterRequest, CustomerResponse, CustomerUpdateRequest

router = APIRouter(prefix="/customers", tags=["Customers"])

def _to_response(c) -> CustomerResponse:
    return CustomerResponse(
        customer_id=c.customer_id,
        business_name=c.business_name,
        phone=c.phone,
        email=c.email,
        location=c.location,
        plan=c.plan,
        license_code=c.license_code,
        license_expires_at=c.license_expires_at,
        days_remaining=get_days_remaining(c.license_expires_at),
        status=c.status,
        created_at=c.created_at,
        updated_at=c.updated_at,
    )

@router.post("/register", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
def register(req: CustomerRegisterRequest, db: Session = Depends(get_db)):
    """
    Registers a new restaurant customer.
    - Generates a non-sequential 9-character alphanumeric customer_id.
    - Performs server-side duplicate prevention checking business_name, phone, and location.
    - Sets up 365-day initial license duration.
    """
    customer = register_customer(db, req)
    return _to_response(customer)

@router.get("/lookup", response_model=CustomerResponse)
def lookup(
    phone: str = Query(..., description="Phone number to lookup customer"),
    db: Session = Depends(get_db)
):
    """Lookup customer by phone number."""
    customer = get_customer_by_phone(db, phone)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found for provided phone number.")
    return _to_response(customer)

@router.get("/{customer_id}", response_model=CustomerResponse)
def get_by_id(customer_id: str, db: Session = Depends(get_db)):
    """Get customer details, plan, and active license status."""
    customer = get_customer(db, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail=f"Customer '{customer_id}' not found.")
    return _to_response(customer)

@router.put("/{customer_id}", response_model=CustomerResponse)
def update_profile(customer_id: str, req: CustomerUpdateRequest, db: Session = Depends(get_db)):
    """Update restaurant customer business details."""
    customer = update_customer(db, customer_id, req)
    return _to_response(customer)
