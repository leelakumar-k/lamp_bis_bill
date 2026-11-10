from datetime import datetime
from sqlalchemy import (
    BigInteger, Boolean, Column, DateTime, ForeignKey,
    Integer, Numeric, String, Text, UniqueConstraint
)
from sqlalchemy.orm import relationship
from app.database import Base

SCHEMA = "main_restaurants"

class Customer(Base):
    __tablename__ = "customers"
    __table_args__ = (
        UniqueConstraint("business_name", "phone", "location", name="uq_customers_name_phone_location"),
        {"schema": SCHEMA},
    )

    customer_id = Column(String(9), primary_key=True, index=True)
    business_name = Column(String(255), nullable=False)
    phone = Column(String(30), nullable=False, index=True)
    email = Column(String(255), nullable=True)
    location = Column(Text, nullable=False)
    plan = Column(String(20), nullable=False, default="super")  # super, gold, premium
    license_code = Column(String(50), nullable=True)
    license_expires_at = Column(DateTime(timezone=True), nullable=True)
    status = Column(String(20), nullable=False, default="active")  # active, expired, suspended
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    licenses = relationship("License", back_populates="customer")
    daily_summaries = relationship("DailySummary", back_populates="customer", cascade="all, delete-orphan")
    categories = relationship("Category", back_populates="customer", cascade="all, delete-orphan")
    menu_items = relationship("MenuItem", back_populates="customer", cascade="all, delete-orphan")
    orders = relationship("Order", back_populates="customer", cascade="all, delete-orphan")


class License(Base):
    __tablename__ = "licenses"
    __table_args__ = {"schema": SCHEMA}

    id = Column(Integer, primary_key=True, index=True)
    license_code = Column(String(50), unique=True, nullable=False, index=True)
    plan = Column(String(20), nullable=False)  # super, gold, premium
    duration_days = Column(Integer, nullable=False, default=365)
    is_used = Column(Boolean, nullable=False, default=False)
    used_by_customer_id = Column(String(9), ForeignKey(f"{SCHEMA}.customers.customer_id"), nullable=True)
    activated_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    customer = relationship("Customer", back_populates="licenses")


class DailySummary(Base):
    __tablename__ = "daily_summaries"
    __table_args__ = (
        UniqueConstraint("customer_id", "business_date", "shift_name", name="uq_customer_daily_shift"),
        {"schema": SCHEMA},
    )

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(String(9), ForeignKey(f"{SCHEMA}.customers.customer_id", ondelete="CASCADE"), nullable=False, index=True)
    business_date = Column(String(10), nullable=False, index=True)  # YYYY-MM-DD
    shift_name = Column(String(50), nullable=False, default="Default")
    orders_count = Column(Integer, nullable=False, default=0)
    gross_sales = Column(BigInteger, nullable=False, default=0)  # minor units (paise)
    discount_total = Column(BigInteger, nullable=False, default=0)
    tax_total = Column(BigInteger, nullable=False, default=0)
    round_off_total = Column(BigInteger, nullable=False, default=0)
    net_sales = Column(BigInteger, nullable=False, default=0)
    cash_total = Column(BigInteger, nullable=False, default=0)
    upi_total = Column(BigInteger, nullable=False, default=0)
    card_total = Column(BigInteger, nullable=False, default=0)
    unpaid_total = Column(BigInteger, nullable=False, default=0)
    synced_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    customer = relationship("Customer", back_populates="daily_summaries")


class Category(Base):
    __tablename__ = "categories"
    __table_args__ = (
        UniqueConstraint("customer_id", "local_id", name="uq_customer_category"),
        {"schema": SCHEMA},
    )

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(String(9), ForeignKey(f"{SCHEMA}.customers.customer_id", ondelete="CASCADE"), nullable=False, index=True)
    local_id = Column(String(50), nullable=False)
    name = Column(String(100), nullable=False)
    sort_order = Column(Integer, nullable=False, default=0)
    synced_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    customer = relationship("Customer", back_populates="categories")


class MenuItem(Base):
    __tablename__ = "menu_items"
    __table_args__ = (
        UniqueConstraint("customer_id", "local_id", name="uq_customer_item"),
        {"schema": SCHEMA},
    )

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(String(9), ForeignKey(f"{SCHEMA}.customers.customer_id", ondelete="CASCADE"), nullable=False, index=True)
    local_id = Column(String(50), nullable=False)
    category_local_id = Column(String(50), nullable=True)
    name = Column(String(150), nullable=False)
    price = Column(BigInteger, nullable=False)  # in minor units (paise)
    is_active = Column(Boolean, nullable=False, default=True)
    synced_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    customer = relationship("Customer", back_populates="menu_items")


class Order(Base):
    __tablename__ = "orders"
    __table_args__ = (
        UniqueConstraint("customer_id", "local_order_id", name="uq_customer_order"),
        {"schema": SCHEMA},
    )

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(String(9), ForeignKey(f"{SCHEMA}.customers.customer_id", ondelete="CASCADE"), nullable=False, index=True)
    local_order_id = Column(String(50), nullable=False, index=True)
    bill_no = Column(Integer, nullable=True)
    token = Column(Integer, nullable=True)
    type = Column(String(20), nullable=False, default="takeaway")
    status = Column(String(20), nullable=False, default="paid")
    business_date = Column(String(10), nullable=False, index=True)
    shift_name = Column(String(50), nullable=True)
    table_name = Column(String(50), nullable=True)
    customer_name = Column(String(100), nullable=True)
    payment_mode = Column(String(20), nullable=True)
    subtotal = Column(BigInteger, nullable=False, default=0)
    discount = Column(BigInteger, nullable=False, default=0)
    tax_percent = Column(Numeric(5, 2), nullable=False, default=0)
    tax = Column(BigInteger, nullable=False, default=0)
    round_off = Column(BigInteger, nullable=False, default=0)
    total = Column(BigInteger, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), nullable=True)
    billed_at = Column(DateTime(timezone=True), nullable=True)
    paid_at = Column(DateTime(timezone=True), nullable=True)
    synced_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    customer = relationship("Customer", back_populates="orders")
    lines = relationship("OrderLine", back_populates="order", cascade="all, delete-orphan")


class OrderLine(Base):
    __tablename__ = "order_lines"
    __table_args__ = {"schema": SCHEMA}

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey(f"{SCHEMA}.orders.id", ondelete="CASCADE"), nullable=False, index=True)
    customer_id = Column(String(9), ForeignKey(f"{SCHEMA}.customers.customer_id", ondelete="CASCADE"), nullable=False, index=True)
    item_local_id = Column(String(50), nullable=True)
    name = Column(String(150), nullable=False)
    price = Column(BigInteger, nullable=False)
    qty = Column(Integer, nullable=False, default=1)
    note = Column(Text, nullable=True)

    order = relationship("Order", back_populates="lines")
