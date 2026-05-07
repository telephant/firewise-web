'use client';

import { useEffect, useState } from 'react';
import { colors, Button, Loader } from '@/components/fire/ui';
import { dcaApi, DcaPlan, DcaPending, portfolioApi, Portfolio } from '@/lib/fire/api';
import { DcaPlanDialog } from '@/components/fire/dca-plan-dialog';
import { DcaPendingCard } from '@/components/fire/dca-pending-card';

const FREQ_LABEL: Record<string, string> = {
  weekly: 'Weekly', biweekly: 'Bi-weekly', monthly: 'Monthly',
  quarterly: 'Quarterly', yearly: 'Yearly',
};

export default function DcaPage() {
  const [plans, setPlans] = useState<DcaPlan[]>([]);
  const [pending, setPending] = useState<DcaPending[]>([]);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editPlan, setEditPlan] = useState<DcaPlan | undefined>(undefined);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      dcaApi.listPlans(),
      dcaApi.listPending(),
      portfolioApi.list(),
    ]).then(([plansRes, pendingRes, portfoliosRes]) => {
      if (plansRes.success && plansRes.data) setPlans(plansRes.data);
      if (pendingRes.success && pendingRes.data) setPending(pendingRes.data);
      if (portfoliosRes.success && portfoliosRes.data) setPortfolios(portfoliosRes.data);
      setLoading(false);
    });
  }, []);

  function getPortfolioName(portfolioId: string): string {
    return portfolios.find(p => p.id === portfolioId)?.name || portfolioId.slice(0, 8);
  }

  const handlePlanSuccess = (plan: DcaPlan) => {
    setPlans(prev => {
      const idx = prev.findIndex(p => p.id === plan.id);
      return idx >= 0 ? prev.map(p => p.id === plan.id ? plan : p) : [plan, ...prev];
    });
    setDialogOpen(false);
    setEditPlan(undefined);
  };

  const handleDelete = async (planId: string) => {
    if (!confirm('Delete this DCA plan? Pending records will also be removed.')) return;
    setDeletingId(planId);
    const result = await dcaApi.deletePlan(planId);
    setDeletingId(null);
    if (result.success) {
      setPlans(prev => prev.filter(p => p.id !== planId));
      setPending(prev => prev.filter(p => p.dca_plan_id !== planId));
    }
  };

  const handleToggleActive = async (plan: DcaPlan) => {
    setTogglingId(plan.id);
    const result = await dcaApi.updatePlan(plan.id, { is_active: !plan.is_active });
    setTogglingId(null);
    if (result.success && result.data) {
      setPlans(prev => prev.map(p => p.id === plan.id ? result.data! : p));
    }
  };

  const activePlans = plans.filter(p => p.is_active);
  const pausedPlans = plans.filter(p => !p.is_active);

  const defaultPortfolioId = portfolios[0]?.id || '';
  const defaultCurrency = portfolios[0]?.currency || 'USD';

  if (loading) {
    return (
      <div style={{ padding: 24, backgroundColor: colors.bg, minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Loader size="md" variant="bar" />
      </div>
    );
  }

  return (
    <div style={{ padding: 24, backgroundColor: colors.bg, minHeight: '100vh' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
<h1 style={{ color: colors.text, fontSize: 22, fontWeight: 700, margin: 0 }}>DCA Plans</h1>
          </div>
          <Button onClick={() => { setEditPlan(undefined); setDialogOpen(true); }}>+ New Plan</Button>
        </div>

        {/* Pending Confirmations */}
        <div style={{ marginBottom: 32 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: colors.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
            Pending Confirmations {pending.length > 0 && (
              <span style={{ marginLeft: 6, backgroundColor: colors.accent, color: '#fff', borderRadius: 10, padding: '1px 7px', fontSize: 11 }}>
                {pending.length}
              </span>
            )}
          </p>
          {pending.length === 0 ? (
            <p style={{ color: colors.muted, fontSize: 13 }}>No pending confirmations.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pending.map(p => (
                <DcaPendingCard
                  key={p.id}
                  pending={p}
                  onConfirmed={(id) => setPending(prev => prev.filter(x => x.id !== id))}
                  onSkipped={(id) => setPending(prev => prev.filter(x => x.id !== id))}
                />
              ))}
            </div>
          )}
        </div>

        {/* Active Plans */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: colors.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
            Active Plans
          </p>
          {activePlans.length === 0 ? (
            <p style={{ color: colors.muted, fontSize: 13 }}>No active plans. Create one to get started.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                    {['Ticker', 'Portfolio', 'Frequency', 'Mode', 'Amount / Shares', 'Next Run', ''].map(h => (
                      <th key={h} style={{ paddingBottom: 8, paddingRight: 16, textAlign: 'left', color: colors.muted, fontWeight: 500, fontSize: 12 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activePlans.map(plan => (
                    <tr key={plan.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                      <td style={{ padding: '12px 16px 12px 0', fontWeight: 600, color: colors.text }}>
                        {plan.ticker}
                        <span style={{ marginLeft: 6, fontSize: 11, color: colors.muted }}>{plan.market}</span>
                      </td>
                      <td style={{ padding: '12px 16px 12px 0', color: colors.muted }}>{getPortfolioName(plan.portfolio_id)}</td>
                      <td style={{ padding: '12px 16px 12px 0', color: colors.text }}>{FREQ_LABEL[plan.frequency]}</td>
                      <td style={{ padding: '12px 16px 12px 0', color: colors.text }}>{plan.mode === 'amount' ? 'Amount' : 'Shares'}</td>
                      <td style={{ padding: '12px 16px 12px 0', color: colors.info }}>
                        {plan.mode === 'amount' ? `${plan.currency} ${plan.amount}` : `${plan.shares} shares`}
                      </td>
                      <td style={{ padding: '12px 16px 12px 0', color: colors.text }}>{plan.next_run_date}</td>
                      <td style={{ padding: '12px 0', display: 'flex', gap: 4 }}>
                        <Button variant="ghost" size="sm" onClick={() => { setEditPlan(plan); setDialogOpen(true); }}>Edit</Button>
                        <Button variant="ghost" size="sm" onClick={() => handleToggleActive(plan)} disabled={togglingId === plan.id} style={{ color: colors.muted }}>
                          {togglingId === plan.id ? '...' : 'Pause'}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(plan.id)} disabled={deletingId === plan.id} style={{ color: colors.negative }}>
                          {deletingId === plan.id ? '...' : 'Delete'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Paused Plans */}
        {pausedPlans.length > 0 && (
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: colors.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
              Paused Plans
            </p>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                    {['Ticker', 'Portfolio', 'Frequency', 'Mode', 'Amount / Shares', ''].map(h => (
                      <th key={h} style={{ paddingBottom: 8, paddingRight: 16, textAlign: 'left', color: colors.muted, fontWeight: 500, fontSize: 12 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pausedPlans.map(plan => (
                    <tr key={plan.id} style={{ borderBottom: `1px solid ${colors.border}`, opacity: 0.6 }}>
                      <td style={{ padding: '12px 16px 12px 0', fontWeight: 600, color: colors.text }}>
                        {plan.ticker}
                        <span style={{ marginLeft: 6, fontSize: 11, color: colors.muted }}>{plan.market}</span>
                      </td>
                      <td style={{ padding: '12px 16px 12px 0', color: colors.muted }}>{getPortfolioName(plan.portfolio_id)}</td>
                      <td style={{ padding: '12px 16px 12px 0', color: colors.text }}>{FREQ_LABEL[plan.frequency]}</td>
                      <td style={{ padding: '12px 16px 12px 0', color: colors.text }}>{plan.mode === 'amount' ? 'Amount' : 'Shares'}</td>
                      <td style={{ padding: '12px 16px 12px 0', color: colors.info }}>
                        {plan.mode === 'amount' ? `${plan.currency} ${plan.amount}` : `${plan.shares} shares`}
                      </td>
                      <td style={{ padding: '12px 0', display: 'flex', gap: 4 }}>
                        <Button variant="ghost" size="sm" onClick={() => handleToggleActive(plan)} disabled={togglingId === plan.id} style={{ color: colors.positive }}>
                          {togglingId === plan.id ? '...' : 'Resume'}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(plan.id)} disabled={deletingId === plan.id} style={{ color: colors.negative }}>
                          {deletingId === plan.id ? '...' : 'Delete'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <DcaPlanDialog
        open={dialogOpen}
        onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditPlan(undefined); }}
        portfolioId={editPlan?.portfolio_id || defaultPortfolioId}
        defaultCurrency={editPlan?.currency || defaultCurrency}
        editPlan={editPlan}
        onSuccess={handlePlanSuccess}
      />
    </div>
  );
}
