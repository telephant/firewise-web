'use client';

import { useState, useEffect, useCallback } from 'react';
import { colors, Button, Loader } from '@/components/fire/ui';
import { savingsApi, SavingsAccount, InterestRecord, ForecastPeriod } from '@/lib/fire/api';
import { useCurrency } from '@/components/fire/currency-context';
import { SavingsAccountDialog } from '@/components/fire/savings-account-dialog';
import { SavingsInterestDialog } from '@/components/fire/savings-interest-dialog';

const FREQ_LABEL: Record<string, string> = {
  monthly: 'Monthly', quarterly: 'Quarterly', semi_annual: 'Semi-Annual', annual: 'Annual',
};

function fmt(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2 }).format(amount);
}

interface DetailState {
  records: InterestRecord[];
  forecast: ForecastPeriod[];
  loading: boolean;
  tab: 'history' | 'forecast';
}

export default function SavingsPage() {
  const { fmt: fmtDisplay } = useCurrency();
  const [accounts, setAccounts] = useState<SavingsAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [accountDialog, setAccountDialog] = useState<{ open: boolean; account?: SavingsAccount }>({ open: false });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailMap, setDetailMap] = useState<Record<string, DetailState>>({});
  const [interestDialog, setInterestDialog] = useState<{ open: boolean; accountId: string }>({ open: false, accountId: '' });
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    savingsApi.list().then(res => {
      if (res.success && res.data) setAccounts(res.data);
      setLoading(false);
    });
  }, []);

  const loadDetail = useCallback(async (accountId: string) => {
    setDetailMap(m => ({ ...m, [accountId]: { records: [], forecast: [], loading: true, tab: m[accountId]?.tab ?? 'history' } }));
    const res = await savingsApi.listInterest(accountId);
    if (res.success && res.data) {
      setDetailMap(m => ({
        ...m,
        [accountId]: { records: res.data!.records, forecast: res.data!.forecast, loading: false, tab: m[accountId]?.tab ?? 'history' },
      }));
    }
  }, []);

  const handleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    if (!detailMap[id]) loadDetail(id);
  };

  const handleAccountSuccess = (account: SavingsAccount) => {
    setAccounts(prev => {
      const idx = prev.findIndex(a => a.id === account.id);
      return idx >= 0 ? prev.map(a => a.id === account.id ? account : a) : [account, ...prev];
    });
    setAccountDialog({ open: false });
  };

  const handleDeleteAccount = async (id: string) => {
    if (!confirm('Delete this savings account? All interest records will also be removed.')) return;
    setDeletingId(id);
    const res = await savingsApi.delete(id);
    setDeletingId(null);
    if (res.success) {
      setAccounts(prev => prev.filter(a => a.id !== id));
      if (expandedId === id) setExpandedId(null);
    }
  };

  const handleInterestSuccess = (accountId: string, record: InterestRecord) => {
    setDetailMap(m => ({
      ...m,
      [accountId]: { ...m[accountId], records: [record, ...(m[accountId]?.records ?? [])] },
    }));
    setAccounts(prev => prev.map(a => {
      if (a.id !== accountId) return a;
      const isNewer = !a.last_credited_at || record.credited_at > a.last_credited_at;
      return isNewer ? { ...a, last_credited_at: record.credited_at } : a;
    }));
    setInterestDialog({ open: false, accountId: '' });
    loadDetail(accountId);
  };

  const handleDeleteInterest = async (accountId: string, recordId: string) => {
    const res = await savingsApi.deleteInterest(accountId, recordId);
    if (res.success) {
      setDetailMap(m => ({
        ...m,
        [accountId]: { ...m[accountId], records: m[accountId].records.filter(r => r.id !== recordId) },
      }));
      loadDetail(accountId);
    }
  };

  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);
  const totalYtd = accounts.reduce((sum, a) => sum + a.total_interest_ytd, 0);

  if (loading) {
    return (
      <div style={{ padding: 24, backgroundColor: colors.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader size="md" variant="bar" />
      </div>
    );
  }

  return (
    <div style={{ padding: 24, backgroundColor: colors.bg, minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ color: colors.text, fontSize: 22, fontWeight: 700, margin: 0 }}>Savings</h1>
          <div style={{ display: 'flex', gap: 20, marginTop: 6 }}>
            <span style={{ color: colors.muted, fontSize: 12 }}>
              Total Balance: <span style={{ color: colors.text, fontWeight: 600 }}>{fmtDisplay(totalBalance)}</span>
            </span>
            <span style={{ color: colors.muted, fontSize: 12 }}>
              Interest YTD: <span style={{ color: colors.positive, fontWeight: 600 }}>{fmtDisplay(totalYtd)}</span>
            </span>
          </div>
        </div>
        <Button onClick={() => setAccountDialog({ open: true })} style={{ fontSize: 13, height: 34, padding: '0 16px' }}>
          + Add Account
        </Button>
      </div>

      {/* Account list */}
      {accounts.length === 0 ? (
        <div style={{ textAlign: 'center', color: colors.muted, fontSize: 14, marginTop: 80 }}>
          No savings accounts yet. Add one to get started.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {accounts.map(account => {
            const isExpanded = expandedId === account.id;
            const detail = detailMap[account.id];
            return (
              <div key={account.id} style={{
                backgroundColor: colors.surface,
                border: `1px solid ${isExpanded ? colors.accent : colors.border}`,
                borderRadius: 10,
                overflow: 'hidden',
                transition: 'border-color 0.15s',
              }}>
                {/* Card header */}
                <div
                  onClick={() => handleExpand(account.id)}
                  style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', cursor: 'pointer', gap: 12 }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: colors.text, fontWeight: 600, fontSize: 14 }}>{account.name}</div>
                    {account.bank && <div style={{ color: colors.muted, fontSize: 12 }}>{account.bank}</div>}
                  </div>

                  <div style={{ textAlign: 'right', minWidth: 100 }}>
                    <div style={{ color: colors.text, fontWeight: 700, fontSize: 15 }}>{fmt(account.balance, account.currency)}</div>
                    <div style={{ color: colors.muted, fontSize: 11 }}>{account.currency}</div>
                  </div>

                  <div style={{ textAlign: 'center', minWidth: 80 }}>
                    <div style={{ color: colors.info, fontWeight: 600, fontSize: 14 }}>{(account.interest_rate * 100).toFixed(2)}%</div>
                    <div style={{ color: colors.muted, fontSize: 11 }}>{FREQ_LABEL[account.compound_frequency]}</div>
                  </div>

                  <div style={{ textAlign: 'right', minWidth: 120 }}>
                    <div style={{ color: colors.positive, fontWeight: 600, fontSize: 13 }}>+{fmt(account.next_payout_amount, account.currency)}</div>
                    <div style={{ color: colors.muted, fontSize: 11 }}>{account.next_payout_date}</div>
                  </div>

                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => setAccountDialog({ open: true, account })}
                      style={{ background: 'none', border: `1px solid ${colors.border}`, borderRadius: 6, padding: '4px 8px', color: colors.muted, cursor: 'pointer', fontSize: 11 }}
                    >Edit</button>
                    <button
                      onClick={() => handleDeleteAccount(account.id)}
                      disabled={deletingId === account.id}
                      style={{ background: 'none', border: `1px solid ${colors.border}`, borderRadius: 6, padding: '4px 8px', color: colors.negative, cursor: 'pointer', fontSize: 11 }}
                    >{deletingId === account.id ? '…' : 'Delete'}</button>
                  </div>

                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={colors.muted} strokeWidth="2"
                    style={{ flexShrink: 0, transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div style={{ borderTop: `1px solid ${colors.border}`, padding: '16px' }}>
                    <div style={{ display: 'flex', gap: 2, marginBottom: 14, backgroundColor: colors.surfaceLight, borderRadius: 8, padding: 3, border: `1px solid ${colors.border}`, width: 'fit-content' }}>
                      {(['history', 'forecast'] as const).map(tab => (
                        <button
                          key={tab}
                          onClick={() => setDetailMap(m => ({ ...m, [account.id]: { ...m[account.id], tab } }))}
                          style={{
                            padding: '4px 14px', borderRadius: 6, border: 'none', fontSize: 12, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s',
                            backgroundColor: detail?.tab === tab ? colors.surface : 'transparent',
                            color: detail?.tab === tab ? colors.text : colors.muted,
                            boxShadow: detail?.tab === tab ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
                          }}
                        >
                          {tab === 'history' ? 'History' : 'Forecast'}
                        </button>
                      ))}
                    </div>

                    {detail?.loading ? (
                      <div style={{ padding: 20, display: 'flex', justifyContent: 'center' }}><Loader size="sm" variant="dots" /></div>
                    ) : detail?.tab === 'history' ? (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
                          <Button
                            variant="outline"
                            onClick={() => setInterestDialog({ open: true, accountId: account.id })}
                            style={{ fontSize: 12, height: 28, padding: '0 12px' }}
                          >+ Log Interest</Button>
                        </div>
                        {detail.records.length === 0 ? (
                          <p style={{ color: colors.muted, fontSize: 13, textAlign: 'center', padding: '16px 0' }}>No interest records yet.</p>
                        ) : (
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                            <thead>
                              <tr>
                                {['Date', 'Amount', 'Notes', ''].map(h => (
                                  <th key={h} style={{ textAlign: h === 'Amount' ? 'right' : 'left', color: colors.muted, fontWeight: 500, fontSize: 11, padding: '4px 8px', borderBottom: `1px solid ${colors.border}` }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {detail.records.map(r => (
                                <tr key={r.id}>
                                  <td style={{ padding: '8px', color: colors.text }}>{r.credited_at}</td>
                                  <td style={{ padding: '8px', color: colors.positive, textAlign: 'right', fontWeight: 600 }}>+{fmt(r.amount, account.currency)}</td>
                                  <td style={{ padding: '8px', color: colors.muted }}>{r.notes || '—'}</td>
                                  <td style={{ padding: '8px', textAlign: 'right' }}>
                                    <button
                                      onClick={() => handleDeleteInterest(account.id, r.id)}
                                      style={{ background: 'none', border: 'none', color: colors.negative, cursor: 'pointer', fontSize: 12 }}
                                    >Delete</button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    ) : (
                      <div>
                        <p style={{ color: colors.muted, fontSize: 12, margin: '0 0 10px' }}>Estimated based on current balance and rate. Amounts shown in {account.currency}.</p>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                          <thead>
                            <tr>
                              {['Period', 'Expected Date', 'Estimated Amount'].map((h, i) => (
                                <th key={h} style={{ textAlign: i === 2 ? 'right' : 'left', color: colors.muted, fontWeight: 500, fontSize: 11, padding: '4px 8px', borderBottom: `1px solid ${colors.border}` }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {(detail?.forecast ?? []).map(f => (
                              <tr key={f.period}>
                                <td style={{ padding: '8px', color: colors.muted }}>#{f.period}</td>
                                <td style={{ padding: '8px', color: colors.text }}>{f.date}</td>
                                <td style={{ padding: '8px', color: colors.positive, textAlign: 'right', fontWeight: 600 }}>~{fmt(f.amount, account.currency)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Dialogs */}
      {accountDialog.open && (
        <SavingsAccountDialog
          account={accountDialog.account}
          onSuccess={handleAccountSuccess}
          onClose={() => setAccountDialog({ open: false })}
        />
      )}
      {interestDialog.open && (
        <SavingsInterestDialog
          accountId={interestDialog.accountId}
          onSuccess={record => handleInterestSuccess(interestDialog.accountId, record)}
          onClose={() => setInterestDialog({ open: false, accountId: '' })}
        />
      )}
    </div>
  );
}
