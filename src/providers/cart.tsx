import { createContext, type ReactNode, use, useMemo, useReducer } from 'react';

import { MAX_QTY, type MenuItem, type OrderDetail, type OrderLine, type OrderType } from '@/db/pos-types';

export type Draft = {
  /** Set when editing an existing order. */
  orderId: string | null;
  /** Shown while editing, e.g. "Table T4 · B" or "Token #12". */
  label: string | null;
  type: OrderType;
  tableId: string | null;
  customerName: string;
  note: string;
  lines: OrderLine[];
};

const empty: Draft = {
  orderId: null,
  label: null,
  type: 'takeaway',
  tableId: null,
  customerName: '',
  note: '',
  lines: [],
};

type Action =
  | { type: 'add'; item: MenuItem; categoryName: string }
  | { type: 'qty'; index: number; qty: number }
  | { type: 'remove'; index: number }
  | { type: 'setTarget'; orderType: OrderType; tableId: string | null }
  | { type: 'field'; field: 'customerName' | 'note'; value: string }
  | { type: 'load'; order: OrderDetail; label: string }
  | { type: 'reset'; keepTarget?: boolean };

const clampQty = (qty: number) => Math.max(1, Math.min(MAX_QTY, Math.round(qty)));

function reducer(state: Draft, action: Action): Draft {
  switch (action.type) {
    case 'add': {
      const index = state.lines.findIndex((l) => l.item_id === action.item.id && !l.note);
      if (index >= 0) {
        const lines = [...state.lines];
        lines[index] = { ...lines[index], qty: clampQty(lines[index].qty + 1) };
        return { ...state, lines };
      }
      const line: OrderLine = {
        item_id: action.item.id,
        category_id: action.item.category_id,
        name: action.item.name,
        category_name: action.categoryName,
        price: action.item.price,
        qty: 1,
        note: null,
      };
      return { ...state, lines: [...state.lines, line] };
    }
    case 'qty': {
      const lines = [...state.lines];
      if (!lines[action.index]) return state;
      lines[action.index] = { ...lines[action.index], qty: clampQty(action.qty) };
      return { ...state, lines };
    }
    case 'remove':
      return { ...state, lines: state.lines.filter((_, i) => i !== action.index) };
    case 'setTarget':
      return { ...state, type: action.orderType, tableId: action.orderType === 'dine_in' ? action.tableId : null };
    case 'field':
      return { ...state, [action.field]: action.value };
    case 'load':
      return {
        orderId: action.order.id,
        label: action.label,
        type: action.order.type,
        tableId: action.order.table_id,
        customerName: action.order.customer_name ?? '',
        note: action.order.note ?? '',
        lines: action.order.lines.map((l) => ({ ...l })),
      };
    case 'reset':
      return action.keepTarget ? { ...empty, type: state.type, tableId: state.tableId } : empty;
  }
}

type CartContextValue = {
  draft: Draft;
  count: number;
  subtotal: number;
  qtyByItem: Map<string, number>;
  add: (item: MenuItem, categoryName: string) => void;
  setQty: (index: number, qty: number) => void;
  remove: (index: number) => void;
  setTarget: (orderType: OrderType, tableId: string | null) => void;
  setField: (field: 'customerName' | 'note', value: string) => void;
  load: (order: OrderDetail, label: string) => void;
  reset: (keepTarget?: boolean) => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [draft, dispatch] = useReducer(reducer, empty);

  const value = useMemo<CartContextValue>(() => {
    const qtyByItem = new Map<string, number>();
    for (const l of draft.lines) if (l.item_id) qtyByItem.set(l.item_id, (qtyByItem.get(l.item_id) ?? 0) + l.qty);
    return {
      draft,
      count: draft.lines.reduce((sum, l) => sum + l.qty, 0),
      subtotal: draft.lines.reduce((sum, l) => sum + l.qty * l.price, 0),
      qtyByItem,
      add: (item, categoryName) => dispatch({ type: 'add', item, categoryName }),
      setQty: (index, qty) => dispatch({ type: 'qty', index, qty }),
      remove: (index) => dispatch({ type: 'remove', index }),
      setTarget: (orderType, tableId) => dispatch({ type: 'setTarget', orderType, tableId }),
      setField: (field, v) => dispatch({ type: 'field', field, value: v }),
      load: (order, label) => dispatch({ type: 'load', order, label }),
      reset: (keepTarget) => dispatch({ type: 'reset', keepTarget }),
    };
  }, [draft]);

  return <CartContext value={value}>{children}</CartContext>;
}

export function useCart() {
  const value = use(CartContext);
  if (!value) throw new Error('useCart must be used inside CartProvider');
  return value;
}
