// Transactions Page Components
export { MoneyMovement } from './money-movement';
export { TopIncomeSources } from './top-income-sources';
export { MostActiveAssets } from './most-active-assets';
export { FlowsTable as TransactionsTable } from './transactions-table';
export { FlowDetailDialog as TransactionDetailDialog } from './transaction-detail-dialog';
export { EditFlowDialog as EditTransactionDialog } from './edit-transaction-dialog';
export { DeleteFlowDialog as DeleteTransactionDialog } from './delete-transaction-dialog';
export { MonthSelector } from './month-selector';
export { FlowsFilterBar as TransactionsFilterBar, FLOW_CATEGORIES } from './transactions-filter-bar';
export type { FlowCategory } from './transactions-filter-bar';

// Keep old names for backward compatibility
export { FlowsTable } from './transactions-table';
export { FlowDetailDialog } from './transaction-detail-dialog';
export { EditFlowDialog } from './edit-transaction-dialog';
export { DeleteFlowDialog } from './delete-transaction-dialog';
export { FlowsFilterBar } from './transactions-filter-bar';
