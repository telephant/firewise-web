'use client';

import { useState, useMemo } from 'react';
import {
  colors,
  Button,
  SidebarTrigger,
  IconPlus,
} from '@/components/fire/ui';
import {
  DebtTypeStats,
  DebtsTable,
  DebtDetailDialog,
  AddDebtDialog,
  DeleteDebtDialog,
} from '@/components/fire/debts';
import { EditDebtDialog } from '@/components/fire/dashboard/edit-debt-dialog';
import { AddTransactionDialog } from '@/components/fire/add-transaction';
import { useDebts, useUserPreferences } from '@/hooks/fire/use-fire-data';
import type { Debt, DebtType, DebtStatus } from '@/types/fire';

const PAGE_SIZE = 20;

type StatusFilter = DebtStatus | 'all';

export default function DebtsPage() {
  const [isAddDebtOpen, setIsAddDebtOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);

  // Filter state
  const [selectedType, setSelectedType] = useState<DebtType | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch all debts
  const { debts: allDebts, isLoading, mutate } = useDebts();

  // Get user preferences for currency
  const { preferences } = useUserPreferences();
  const displayCurrency = preferences?.preferred_currency || 'USD';

  // Filter debts by status first (for stats cards)
  const statusFilteredDebts = useMemo(() => {
    if (selectedStatus === 'all') return allDebts;
    if (selectedStatus === 'active') {
      // Include debts with 'active' status or null status (legacy)
      return allDebts.filter(d => d.status !== 'paid_off');
    }
    return allDebts.filter(d => d.status === selectedStatus);
  }, [allDebts, selectedStatus]);

  // Filter debts by type and search
  const filteredDebts = useMemo(() => {
    return statusFilteredDebts.filter((debt) => {
      // Type filter
      if (selectedType !== 'all' && debt.debt_type !== selectedType) {
        return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = debt.name.toLowerCase().includes(query);
        if (!matchesName) {
          return false;
        }
      }

      return true;
    });
  }, [statusFilteredDebts, selectedType, searchQuery]);

  // Reset page when status filter changes
  const handleStatusChange = (status: StatusFilter) => {
    setSelectedStatus(status);
    setCurrentPage(1);
  };

  // Paginate
  const paginatedDebts = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredDebts.slice(start, start + PAGE_SIZE);
  }, [filteredDebts, currentPage]);

  const totalPages = Math.ceil(filteredDebts.length / PAGE_SIZE);

  // Reset page when filters change
  const handleTypeChange = (type: DebtType | 'all') => {
    setSelectedType(type);
    setCurrentPage(1);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  // Calculate total value (use converted_balance when available)
  const totalValue = useMemo(() => {
    return filteredDebts.reduce((sum, debt) => {
      // Use converted_balance if available for proper currency handling
      return sum + (debt.converted_balance ?? debt.current_balance);
    }, 0);
  }, [filteredDebts]);

  // Handle make payment
  const handleMakePayment = (debt: Debt) => {
    setSelectedDebt(debt);
    setIsPaymentOpen(true);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header
        className="flex items-center justify-between px-3 py-2"
        style={{
          backgroundColor: 'transparent',
          borderBottom: `1px solid ${colors.border}`,
        }}
      >
        <div className="flex items-center gap-3">
          <SidebarTrigger />
          <h1 className="text-sm font-bold" style={{ color: colors.text }}>
            Debts
          </h1>
        </div>
        <Button
          size="sm"
          variant="primary"
          onClick={() => setIsAddDebtOpen(true)}
          className="gap-1.5"
        >
          <IconPlus size={12} />
          <span>Add Debt</span>
        </Button>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-4">
        <div className="max-w-5xl mx-auto space-y-4">
          {/* Debt Type Stats */}
          <DebtTypeStats
            debts={statusFilteredDebts}
            isLoading={isLoading}
            onTypeClick={handleTypeChange}
            selectedType={selectedType}
            currency={displayCurrency}
          />

          {/* Debts Table */}
          <DebtsTable
            debts={paginatedDebts}
            isLoading={isLoading}
            currentPage={currentPage}
            totalPages={totalPages}
            totalCount={filteredDebts.length}
            totalValue={totalValue}
            pageSize={PAGE_SIZE}
            onPageChange={setCurrentPage}
            selectedType={selectedType}
            onTypeChange={handleTypeChange}
            selectedStatus={selectedStatus}
            onStatusChange={handleStatusChange}
            searchQuery={searchQuery}
            onSearchChange={handleSearchChange}
            currency={displayCurrency}
            onRowClick={(debt) => {
              setSelectedDebt(debt);
              setIsDetailOpen(true);
            }}
            onEdit={(debt) => {
              setSelectedDebt(debt);
              setIsEditOpen(true);
            }}
            onDelete={(debt) => {
              setSelectedDebt(debt);
              setIsDeleteOpen(true);
            }}
            onMakePayment={handleMakePayment}
          />
        </div>
      </main>

      {/* Add Debt Dialog */}
      <AddDebtDialog
        open={isAddDebtOpen}
        onOpenChange={setIsAddDebtOpen}
      />

      {/* Edit Debt Dialog */}
      <EditDebtDialog
        debt={selectedDebt}
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        onMakePayment={handleMakePayment}
      />

      {/* Debt Detail Dialog */}
      <DebtDetailDialog
        debt={selectedDebt}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        onEdit={(debt) => {
          setIsDetailOpen(false);
          setSelectedDebt(debt);
          setIsEditOpen(true);
        }}
        onDelete={(debt) => {
          setIsDetailOpen(false);
          setSelectedDebt(debt);
          setIsDeleteOpen(true);
        }}
        onMakePayment={(debt) => {
          setIsDetailOpen(false);
          handleMakePayment(debt);
        }}
      />

      {/* Delete Debt Dialog */}
      <DeleteDebtDialog
        debt={selectedDebt}
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onDeleted={() => {
          mutate();
        }}
      />

      {/* Payment Dialog - Only render when open */}
      {isPaymentOpen && (
        <AddTransactionDialog
          open={isPaymentOpen}
          onOpenChange={setIsPaymentOpen}
          initialCategory="pay_debt"
          initialDebtId={selectedDebt?.id}
        />
      )}
    </div>
  );
}
