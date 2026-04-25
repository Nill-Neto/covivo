export interface CreditCard {
  id: string;
  user_id: string;
  label: string;
  brand: string;
  limit_amount: number | null;
  closing_day: number;
  due_day: number;
  color: string | null;
  created_at: string;
}

// A unified type for both group and personal installments for the dashboard view
export interface BillInstallment {
  id: string;
  amount: number;
  installment_number: number;
  expenses: {
    title: string | null;
    category: string | null;
    credit_card_id: string | null;
    expense_type: string | null;
    purchase_date: string | null;
    installments: number | null;
    group_id?: string | null; // Only for group expenses
    created_at: string | null;
  } | null;
}

// Specific types for data fetching
export interface GroupInstallmentItem {
  id: string;
  amount: number;
  bill_month: number;
  bill_year: number;
  expenses: {
    expense_type: string;
    group_id: string;
    credit_card_id: string | null;
  } | null;
}

export interface PersonalInstallmentItem {
  id: string;
  amount: number;
  bill_month: number;
  bill_year: number;
  personal_expenses: {
    credit_card_id: string | null;
  } | null;
}

export interface CardsTabProps {
  totalBill: number;
  currentDate: Date;
  cardsChartData: { name: string; value: number }[];
  creditCards: CreditCard[];
  cardsBreakdown: Record<string, number>;
  billInstallments: BillInstallment[];
  isLoading?: boolean;
}

export interface PendingSplit {
  id: string;
  user_id: string;
  amount: number;
  status: string;
  expense_id: string;
  expenses: {
    title: string | null;
    category: string | null;
    group_id: string;
    expense_type: string;
    created_at: string;
    purchase_date: string | null;
    payment_method: string;
    credit_card_id: string | null;
    installments: number;
    competence_key: string | null;
    credit_cards: {
      closing_day: number;
    } | null;
  } | null;
  payments: {
    id: string;
    status: string;
  }[];
}