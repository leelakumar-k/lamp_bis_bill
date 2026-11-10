# Restaurant POS & Cloud Sync Microservice

Standalone FastAPI microservice providing subscription plan management (**Super**, **Gold**, **Premium**), license renewal with leftover day rollover, customer registration with non-sequential 9-character alphanumeric IDs, and offline-first cloud sync.

## Database
- Connects to the existing PostgreSQL database (`ecommerce`) inside the `myecommerce-postgres` Docker container.
- Uses a dedicated schema: **`main_restaurants`** without affecting or altering any other tables or services.

## Plan Features
1. **Super Plan**:
   - 100% on-device local storage.
   - No customer order or daily sales data is transmitted to the cloud.
2. **Gold Plan**:
   - Offline-first: The app functions 100% without internet.
   - Daily sales summary reports are synchronized and backed up to the cloud.
3. **Premium Plan**:
   - Offline-first: Orders and billing are never delayed or blocked by network connectivity.
   - Background batch sync automatically uploads orders, order lines, menu items, and categories under `customer_id`.

## Quick Start

### Using Docker Compose:
```bash
cd backend
./run.sh
# or
docker compose up -d --build
```
- API Base URL: `http://localhost:8005`
- Interactive Swagger UI: `http://localhost:8005/docs`

## API Endpoints

### 1. Customers
- `POST /api/customers/register`: Registers a new restaurant owner.
  - Automatically generates a non-sequential 9-character alphanumeric `customer_id` (e.g. `QVRU4HMN5`).
  - Checks for duplicates based on `business_name`, `phone`, and `location`.
- `GET /api/customers/{customer_id}`: Fetches customer details, plan, and active license status.
- `GET /api/customers/lookup?phone=...`: Looks up customer by phone number.
- `PUT /api/customers/{customer_id}`: Updates restaurant contact details.

### 2. Licenses
- `POST /api/licenses/generate`: Admin endpoint to create 365-day license codes (e.g., `LIC-PRE-WFWR-GYYW`).
- `POST /api/licenses/activate`: Activates or renews a license code:
  - Adds 365 days to the customer's expiration.
  - **Leftover Day Rollover**: If the customer already has remaining days, those days are preserved and 365 days are added on top (`new_expiry = current_expiry + 365 days`).

### 3. Sync Endpoints
- `POST /api/sync/daily-summary`: Upserts daily sales summaries (Gold & Premium plans).
- `GET /api/sync/daily-summary/{customer_id}`: Retrieves daily sales history.
- `POST /api/sync/menu`: Syncs categories and items under `customer_id` (Premium plan).
- `POST /api/sync/orders/batch`: Idempotent batch upload of settled orders and lines (Premium plan).

### 4. Sales Analytics
- `GET /api/sales/{customer_id}/orders`: Lists synced orders with line items.
- `GET /api/sales/{customer_id}/stats`: Aggregated sales revenue, payment mode breakdowns, and order volume.
