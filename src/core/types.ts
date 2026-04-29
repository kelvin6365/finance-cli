export type TransactionType = "income" | "expense";

export type Category = {
  id: string;
  type: TransactionType;
  name: string;
  color: string;
};

export type RecurringIncome = {
  id: string;
  name: string;
  amount: number;
  categoryId: string;
  dayOfMonth: number | null;
  active: boolean;
  note: string;
};

export type RecurringExpense = {
  id: string;
  name: string;
  amount: number;
  categoryId: string;
  dayOfMonth: number;
  active: boolean;
  note: string;
};

export type Debt = {
  id: string;
  name: string;
  principalRemaining: number;
  annualRate: number;
  monthlyPayment: number;
  startDate: string | null;
  endDate: string | null;
  categoryId: string;
  active: boolean;
  note: string;
};

export type PeriodicItem = {
  id: string;
  name: string;
  amount: number;
  type: TransactionType;
  categoryId: string;
  month: number;
  recurring: "annual" | "once";
  active: boolean;
  note: string;
};

export type Transaction = {
  id: string;
  date: string;
  amount: number;
  type: TransactionType;
  categoryId: string;
  note: string;
  recurringId?: string;
  createdAt: string;
};

export type Settings = {
  currency: string;
  currencySymbol: string;
  monthlySavingsTarget: number;
  freelanceMonthlyTarget: number;
  livingExpenseTarget: number;
  currentReserve: number;
  may2026InsuranceTarget: number;
  may2026Deadline: string;
  weekStartsOn: 1;
};

export type DbMeta = {
  version: string;
  currency: string;
  description: string;
  generatedFrom?: string;
};

export type Database = {
  _meta: DbMeta;
  settings: Settings;
  categories: Category[];
  recurringIncome: RecurringIncome[];
  recurringExpense: RecurringExpense[];
  debts: Debt[];
  periodicItems: PeriodicItem[];
  transactions: Transaction[];
};
