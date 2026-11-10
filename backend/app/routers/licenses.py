from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.crud import activate_license, create_licenses, get_days_remaining
from app.schemas import CustomerResponse, LicenseActivateRequest, LicenseGenerateRequest, LicenseResponse

router = APIRouter(prefix="/licenses", tags=["Licenses"])

@router.post("/generate", response_model=List[LicenseResponse], status_code=status.HTTP_201_CREATED)
def generate(req: LicenseGenerateRequest, db: Session = Depends(get_db)):
    """
    Admin endpoint to generate fresh license codes for Super, Gold, or Premium plans (defaults to 365 days).
    """
    return create_licenses(db, req.plan, req.duration_days, req.count)

@router.post("/activate", response_model=CustomerResponse)
def activate(req: LicenseActivateRequest, db: Session = Depends(get_db)):
    """
    Activates or renews a license code for a customer.
    Rule:
    - Calculates 365 days from current date.
    - If customer has leftover days, adds those days too and increases expiry accordingly.
    """
    customer = activate_license(db, req.customer_id, req.license_code)
    return CustomerResponse(
        customer_id=customer.customer_id,
        business_name=customer.business_name,
        phone=customer.phone,
        email=customer.email,
        location=customer.location,
        plan=customer.plan,
        license_code=customer.license_code,
        license_expires_at=customer.license_expires_at,
        days_remaining=get_days_remaining(customer.license_expires_at),
        status=customer.status,
        created_at=customer.created_at,
        updated_at=customer.updated_at,
    )
