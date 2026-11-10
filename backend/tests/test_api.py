from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json() == {"status": "healthy"}

def test_root():
    res = client.get("/")
    assert res.status_code == 200
    assert res.json()["status"] == "online"

def test_customer_registration_and_duplicate_check():
    # 1. Register new customer
    payload = {
        "business_name": "Annapurna Tiffins",
        "phone": "9123456789",
        "email": "annapurna@test.com",
        "location": "Sector 4, Market Complex",
        "plan": "gold"
    }
    res = client.post("/api/customers/register", json=payload)
    assert res.status_code in (201, 409)

    if res.status_code == 201:
        data = res.json()
        assert len(data["customer_id"]) == 9
        assert data["customer_id"].isalnum()
        assert data["customer_id"].isupper()
        assert data["business_name"] == "Annapurna Tiffins"
        assert data["plan"] == "gold"
        assert data["days_remaining"] >= 364
        cust_id = data["customer_id"]
    else:
        # If already registered, fetch by phone
        res_lookup = client.get("/api/customers/lookup?phone=9123456789")
        cust_id = res_lookup.json()["customer_id"]

    # 2. Duplicate check: Trying to register with same name, phone, location must return 409
    dup_res = client.post("/api/customers/register", json=payload)
    assert dup_res.status_code == 409
    assert "already exists" in dup_res.json()["detail"].lower()

def test_license_generation_and_rollover():
    # Register customer
    import uuid
    uniq = str(uuid.uuid4())[:6]
    payload = {
        "business_name": f"Hotel Sagar {uniq}",
        "phone": f"98765{uniq[:5]}",
        "location": f"Highway Road {uniq}",
        "plan": "super"
    }
    c_res = client.post("/api/customers/register", json=payload)
    assert c_res.status_code == 201
    cust = c_res.json()
    cust_id = cust["customer_id"]
    initial_days = cust["days_remaining"]

    # Generate a Premium license code (365 days)
    lic_res = client.post("/api/licenses/generate", json={"plan": "premium", "duration_days": 365, "count": 1})
    assert lic_res.status_code == 201
    lic_code = lic_res.json()[0]["license_code"]

    # Activate license code on customer
    act_res = client.post("/api/licenses/activate", json={
        "customer_id": cust_id,
        "license_code": lic_code
    })
    assert act_res.status_code == 200
    activated = act_res.json()
    assert activated["plan"] == "premium"
    # Rollover check: 365 added to leftover days!
    assert activated["days_remaining"] >= initial_days + 360

    # Activating same license again must fail
    fail_res = client.post("/api/licenses/activate", json={
        "customer_id": cust_id,
        "license_code": lic_code
    })
    assert fail_res.status_code == 400

def test_daily_summary_sync():
    # Create customer with Gold plan
    import uuid
    uniq = str(uuid.uuid4())[:6]
    c_res = client.post("/api/customers/register", json={
        "business_name": f"Bawarchi {uniq}",
        "phone": f"99887{uniq[:5]}",
        "location": f"Main Chowk {uniq}",
        "plan": "gold"
    })
    cust_id = c_res.json()["customer_id"]

    # Sync daily summary
    sum_res = client.post("/api/sync/daily-summary", json={
        "customer_id": cust_id,
        "business_date": "2026-11-10",
        "shift_name": "Evening",
        "orders_count": 25,
        "gross_sales": 250000,
        "net_sales": 262500,
        "cash_total": 150000,
        "upi_total": 112500
    })
    assert sum_res.status_code == 200
    assert sum_res.json()["customer_id"] == cust_id

    # Retrieve daily summaries
    get_res = client.get(f"/api/sync/daily-summary/{cust_id}")
    assert get_res.status_code == 200
    assert len(get_res.json()) >= 1
    assert get_res.json()[0]["orders_count"] == 25

def test_premium_order_sync():
    import uuid
    uniq = str(uuid.uuid4())[:6]
    c_res = client.post("/api/customers/register", json={
        "business_name": f"Paradise {uniq}",
        "phone": f"97766{uniq[:5]}",
        "location": f"Circle Road {uniq}",
        "plan": "premium"
    })
    cust_id = c_res.json()["customer_id"]

    # Batch sync orders
    ord_res = client.post("/api/sync/orders/batch", json={
        "customer_id": cust_id,
        "orders": [
            {
                "local_order_id": f"ord_{uniq}_1",
                "bill_no": 101,
                "token": 5,
                "type": "dine_in",
                "status": "paid",
                "business_date": "2026-11-10",
                "table_name": "Table 4",
                "payment_mode": "upi",
                "subtotal": 50000,
                "total": 52500,
                "lines": [
                    {"item_local_id": "i1", "name": "Mutton Biryani", "price": 50000, "qty": 1}
                ]
            }
        ]
    })
    assert ord_res.status_code == 200
    assert ord_res.json()["synced_count"] == 1

    # Query sales stats
    stats_res = client.get(f"/api/sales/{cust_id}/stats")
    assert stats_res.status_code == 200
    stats = stats_res.json()
    assert stats["total_orders"] == 1
    assert stats["net_sales"] == 52500
