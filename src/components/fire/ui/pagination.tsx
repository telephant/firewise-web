'use client';

import { colors } from './theme';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export function Pagination({
  currentPage,
  totalPages,
  totalCount,
  pageSize,
  onPageChange,
}: PaginationProps) {
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalCount);

  if (totalPages <= 0) return null;

  return (
    <div
      className="flex items-center justify-between mt-3 pt-3"
      style={{ borderTop: `1px solid ${colors.border}` }}
    >
      <div className="text-xs" style={{ color: colors.muted }}>
        {totalCount > 0 ? `Showing ${startItem}-${endItem} of ${totalCount}` : 'No results'}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <PageButton onClick={() => onPageChange(1)} disabled={currentPage === 1}>
            ««
          </PageButton>
          <PageButton onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}>
            «
          </PageButton>

          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum: number;
            if (totalPages <= 5) {
              pageNum = i + 1;
            } else if (currentPage <= 3) {
              pageNum = i + 1;
            } else if (currentPage >= totalPages - 2) {
              pageNum = totalPages - 4 + i;
            } else {
              pageNum = currentPage - 2 + i;
            }

            return (
              <PageButton
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                active={currentPage === pageNum}
              >
                {pageNum}
              </PageButton>
            );
          })}

          <PageButton onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}>
            »
          </PageButton>
          <PageButton onClick={() => onPageChange(totalPages)} disabled={currentPage === totalPages}>
            »»
          </PageButton>
        </div>
      )}
    </div>
  );
}

// --- Internal Page Button ---

interface PageButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}

function PageButton({ children, onClick, disabled = false, active = false }: PageButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-2 py-1 text-xs rounded-md min-w-[28px] disabled:opacity-50 transition-colors duration-150 hover:bg-white/[0.06] cursor-pointer"
      style={
        active
          ? {
              backgroundColor: colors.surfaceLight,
              border: `1px solid ${colors.border}`,
              borderRadius: '6px',
              color: colors.text,
              fontWeight: 'bold',
            }
          : {
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: '8px',
              color: colors.text,
            }
      }
    >
      {children}
    </button>
  );
}
