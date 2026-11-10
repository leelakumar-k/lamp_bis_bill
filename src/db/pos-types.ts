export const MAX_QTY = 99;

export type Category = { id: string; name: string; sort: number; is_active: number };

export type MenuItem = {
  id: string;
  category_id: string;
  name: string;
  price: number;
  image: string | null;
  is_veg: number;
  is_available: number;
  sort: number;
};

export type MenuItemInput = {
  category_id: string;
  name: string;
  price: number;
  image: string | null;
  is_veg: boolean;
  is_available: boolean;
};

export type DiningTable = {
  id: string;
  name: string;
  seats: number;
  sort: number;
  is_active: number;
  parent_id?: string | null;
  parent_name?: string | null;
};

export type Shift = {
  id: string;
  business_date: string;
  name: string;
  opened_at: string;
  closed_at: string | null;
};

export type OrderType = 'dine_in' | 'takeaway';
export type OrderStatus = 'open' | 'billed' | 'paid' | 'cancelled';
export type PaymentMode = 'cash' | 'upi' | 'card';

export type Order = {
  id: string;
  shift_id: string;
  business_date: string;
  type: OrderType;
  table_id: string | null;
  party: string | null;
  token: number | null;
  bill_no: number | null;
  status: OrderStatus;
  customer_name: string | null;
  note: string | null;
  tax_percent: number;
  subtotal: number;
  discount: number;
  tax: number;
  round_off: number;
  total: number;
  payment_mode: PaymentMode | null;
  revision: number;
  created_at: string;
  updated_at: string;
  billed_at: string | null;
  paid_at: string | null;
};

export type OrderLine = {
  id?: string;
  item_id: string | null;
  category_id: string | null;
  name: string;
  category_name: string;
  price: number;
  qty: number;
  note: string | null;
};

export type OrderWithTable = Order & { table_name: string | null; item_count: number; shift_name: string };

export type OrderDetail = OrderWithTable & { lines: OrderLine[] };

export type Totals = { subtotal: number; discount: number; tax: number; round_off: number; total: number };
