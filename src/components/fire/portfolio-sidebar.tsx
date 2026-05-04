'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useFamilies } from '@/hooks/fire/use-families';
import { dcaApi } from '@/lib/fire/api';

const colors = {
  bg: '#0A0A0B',
  surface: '#141415',
  surfaceLight: '#1C1C1E',
  text: '#EDEDEF',
  muted: '#7C7C82',
  border: 'rgba(255,255,255,0.08)',
  accent: '#5E6AD2',
};

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  exact?: boolean;
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/fire',
    exact: true,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
        <polyline points="16 7 22 7 22 13" />
      </svg>
    ),
  },
  {
    label: 'Portfolios',
    href: '/fire/portfolios',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
      </svg>
    ),
  },
  {
    label: 'Savings',
    href: '/fire/savings',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
        <polyline points="17 21 17 13 7 13 7 21" />
        <polyline points="7 3 7 8 15 8" />
      </svg>
    ),
  },
  {
    label: 'Family',
    href: '/fire/family',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    label: 'DCA',
    href: '/fire/dca',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
];

export function PortfolioSidebar() {
  const pathname = usePathname();
  const { families, selectedFamily, setSelectedFamily } = useFamilies();
  const [familyOpen, setFamilyOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  useEffect(() => {
    dcaApi.listPending().then(res => {
      if (res.success && res.data) setPendingCount(res.data.length);
    });
  }, []);

  return (
    <aside style={{
      width: '220px',
      minWidth: '220px',
      height: '100vh',
      backgroundColor: colors.bg,
      borderRight: `1px solid ${colors.border}`,
      display: 'flex',
      flexDirection: 'column',
      padding: '24px 12px',
      position: 'sticky',
      top: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: '0 8px 24px', borderBottom: `1px solid ${colors.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg, #5E6AD2, #7C85DE)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
            </svg>
          </div>
          <div>
            <div style={{ color: colors.text, fontWeight: 700, fontSize: 14 }}>Firewise</div>
            <div style={{ color: colors.muted, fontSize: 10 }}>Portfolio</div>
          </div>
        </div>
      </div>

      {/* Family selector */}
      {selectedFamily && (
        <div style={{ padding: '12px 8px 0', position: 'relative' }}>
          {families.length <= 1 ? (
            <div style={{
              padding: '6px 10px',
              borderRadius: 6,
              backgroundColor: colors.surfaceLight,
              border: `1px solid ${colors.border}`,
              fontSize: 12,
              color: colors.muted,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              <span style={{ color: colors.text, fontWeight: 500 }}>
                {selectedFamily.name.length > 18 ? selectedFamily.name.slice(0, 18) + '…' : selectedFamily.name}
              </span>
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setFamilyOpen(o => !o)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 10px',
                  borderRadius: 6,
                  backgroundColor: colors.surfaceLight,
                  border: `1px solid ${colors.border}`,
                  fontSize: 12,
                  color: colors.text,
                  fontWeight: 500,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {selectedFamily.name.length > 18 ? selectedFamily.name.slice(0, 18) + '…' : selectedFamily.name}
                </span>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={colors.muted}
                  strokeWidth="2"
                  style={{ flexShrink: 0, marginLeft: 4, transform: familyOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              {familyOpen && (
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 4px)',
                  left: 0,
                  right: 0,
                  zIndex: 100,
                  backgroundColor: colors.surface,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 6,
                  overflow: 'hidden',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                }}>
                  {families.map(f => (
                    <button
                      key={f.id}
                      onClick={() => {
                        setSelectedFamily(f.id);
                        setFamilyOpen(false);
                        window.location.reload();
                      }}
                      style={{
                        width: '100%',
                        display: 'block',
                        padding: '8px 10px',
                        textAlign: 'left',
                        fontSize: 12,
                        color: f.id === selectedFamily.id ? colors.text : colors.muted,
                        backgroundColor: f.id === selectedFamily.id ? colors.surfaceLight : 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: f.id === selectedFamily.id ? 500 : 400,
                      }}
                    >
                      {f.name.length > 18 ? f.name.slice(0, 18) + '…' : f.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Nav items */}
      <nav style={{ flex: 1, paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {navItems.map(item => {
          const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 10px', borderRadius: 6,
                color: isActive ? colors.text : colors.muted,
                backgroundColor: isActive ? colors.surfaceLight : 'transparent',
                textDecoration: 'none',
                fontSize: 13, fontWeight: isActive ? 500 : 400,
                transition: 'all 0.15s',
              }}
            >
              <span style={{ color: isActive ? colors.accent : colors.muted }}>{item.icon}</span>
              {item.label}
              {item.href === '/fire/dca' && pendingCount > 0 && (
                <span style={{
                  marginLeft: 'auto',
                  backgroundColor: colors.accent,
                  color: '#fff',
                  borderRadius: 10,
                  padding: '1px 6px',
                  fontSize: 10,
                  fontWeight: 600,
                  minWidth: 16,
                  textAlign: 'center',
                }}>
                  {pendingCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom: back to ledger */}
      <div style={{ borderTop: `1px solid ${colors.border}`, paddingTop: 12 }}>
        <Link
          href="/dashboard"
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 10px', borderRadius: 6,
            color: colors.muted, textDecoration: 'none', fontSize: 12,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Expense Ledger
        </Link>
      </div>
    </aside>
  );
}
