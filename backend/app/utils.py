import re
import secrets
import string
from datetime import datetime, timedelta, timezone

# Unambiguous alphanumeric alphabet (excludes 0, O, 1, I)
ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

def generate_customer_id(length: int = 9) -> str:
    """
    Generates a cryptographically random, non-sequential alphanumeric customer ID of length 9.
    E.g. 'K9X2M7P4Q'. Total search space: 32^9 ≈ 35.18 trillion unique IDs.
    """
    return "".join(secrets.choice(ALPHABET) for _ in range(length))

def generate_license_code(plan: str) -> str:
    """
    Generates a unique license code formatted as LIC-<PLAN>-<SEG1>-<SEG2>
    E.g. 'LIC-GLD-8K2M-9Q7X'
    """
    plan_code = plan[:3].upper()
    seg1 = "".join(secrets.choice(ALPHABET) for _ in range(4))
    seg2 = "".join(secrets.choice(ALPHABET) for _ in range(4))
    return f"LIC-{plan_code}-{seg1}-{seg2}"

def normalize_text(text: str) -> str:
    return " ".join(text.strip().lower().split())

def normalize_phone(phone: str) -> str:
    # Keeps only digits
    return re.sub(r"[^\d]", "", phone)

def calculate_new_license_expiry(current_expiry: datetime | None, duration_days: int = 365) -> datetime:
    """
    Calculates new expiry date:
    - If current license has leftover days in the future, adds duration_days to current_expiry.
    - If expired or new, adds duration_days starting from now.
    """
    now = datetime.now(timezone.utc)
    if current_expiry:
        # Ensure current_expiry is timezone-aware
        if current_expiry.tzinfo is None:
            current_expiry = current_expiry.replace(tzinfo=timezone.utc)
        if current_expiry > now:
            # Customer has leftover days! Add 365 days on top of remaining days
            return current_expiry + timedelta(days=duration_days)
    return now + timedelta(days=duration_days)
