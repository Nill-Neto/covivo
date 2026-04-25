import type { PendingSplit } from "./dashboard";

export interface AdminMember {
  user_id: string;
  active: boolean;
  previous_debt: number;
  current_cycle_owed: number;
  current_cycle_paid: number;
  accrued_debt: number;
  total_owed: number;
  total_paid: number;
  balance: number;
  profile: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
  role: 'admin' | 'morador';
}

export interface P2PMatrixEntry {
  from_user_id: string;
  to_user_id: string;
  amount: number;
}

export interface CollectiveExpense {
  id: string;
  title: string;
  amount: number;
  category: string;
  purchase_date: string;
}

export interface AdminDashboardData {
  members: AdminMember[];
  p2pMatrix: P2PMatrixEntry[];
  pendingPaymentsCount: number;
  exMembersDebt: number;
  departuresCount: number;
  redistributedCount: number;
  lowStockCount: number;
  cycleSplits: PendingSplit[];
  pendingSplits: PendingSplit[];
  memberPaymentsByCompetence: Record<string, Record<string, number>>;
  nonCriticalWarnings: { source: string; message: string; }[];
}

export interface AdminTabProps extends AdminDashboardData {
  modoGestao: 'centralized' | 'p2p';
  groupId: string;
  collectiveExpenses: CollectiveExpense[];
  totalMonthExpenses: number;
  cycleStart: Date;
  cycleEnd: Date;
  currentDate: Date;
  closingDay: number;
}