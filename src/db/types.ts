export type SqlParam = string | number | null;

export interface Database {
  exec(sql: string): Promise<void>;
  run(sql: string, params?: SqlParam[]): Promise<{ changes: number }>;
  all<T>(sql: string, params?: SqlParam[]): Promise<T[]>;
  first<T>(sql: string, params?: SqlParam[]): Promise<T | null>;
  transaction(task: () => Promise<void>): Promise<void>;
}

export enum Status {
  Absent = 0,
  Present = 1,
  HalfDay = 2,
  Leave = 3,
}

export type Worker = {
  id: string;
  first_name: string;
  last_name: string | null;
  mobile: string | null;
  address: string | null;
  profession: string;
  daily_wage: number;
  is_active: number;
  created_at: string;
  updated_at: string;
};

export type WorkerInput = {
  first_name: string;
  last_name: string | null;
  mobile: string | null;
  address: string | null;
  profession: string;
  daily_wage: number;
  is_active: boolean;
};

export type AttendanceRow = {
  worker_id: string;
  first_name: string;
  last_name: string | null;
  profession: string;
  daily_wage: number;
  status: Status | null;
  wage_snapshot: number | null;
};

export type PaymentType = 'advance' | 'settlement';

export type Payment = {
  id: string;
  worker_id: string;
  amount: number;
  type: PaymentType;
  paid_on: string;
  note: string | null;
};

export type WorkerMonthSummary = {
  worker_id: string;
  first_name: string;
  last_name: string | null;
  profession: string;
  days_worked: number;
  absent: number;
  leave: number;
  earned: number;
  paid: number;
};
