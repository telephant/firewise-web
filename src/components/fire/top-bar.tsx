'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { colors, CurrencyCombobox } from '@/components/fire/ui';
import { usePageContext } from '@/components/fire/page-context';
import { useCurrency } from '@/components/fire/currency-context';
import { usePrivacy } from '@/components/fire/privacy-context';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

function getBreadcrumbs(pathname: string, pageTitle: string | null): BreadcrumbItem[] {
  if (pathname.startsWith('/fire/portfolios/') && pathname.split('/').length === 4) {
    return [
      { label: 'Portfolios', href: '/fire/portfolios' },
      { label: pageTitle || '...' },
    ];
  }
  if (pathname === '/fire/portfolios') return [{ label: 'Portfolios' }];
  if (pathname === '/fire') return [{ label: 'Dashboard' }];
  if (pathname.startsWith('/fire/dca')) return [{ label: 'DCA' }];
  if (pathname.startsWith('/fire/family')) return [{ label: 'Family' }];
  return [{ label: 'Firewise' }];
}

function getInitials(name?: string | null, email?: string | null): string {
  if (name) return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  return (email?.charAt(0) ?? 'U').toUpperCase();
}

export function FireTopBar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { pageTitle } = usePageContext();
  const { displayCurrency, setDisplayCurrency } = useCurrency();
  const { privacyMode, togglePrivacy } = usePrivacy();
  const [open, setOpen] = useState(false);
  const [signOutHover, setSignOutHover] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const breadcrumbs = getBreadcrumbs(pathname, pageTitle);
  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;
  const fullName = user?.user_metadata?.full_name as string | undefined;
  const email = user?.email;
  const initials = getInitials(fullName, email);

  useEffect(() => {
    if (!open) return;
    function handleMouseDown(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [open]);

  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        height: 52,
        backgroundColor: colors.bg,
        backdropFilter: 'blur(8px)',
        borderBottom: `1px solid ${colors.border}`,
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      {/* Left: breadcrumbs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {breadcrumbs.map((item, i) => (
          <span key={item.href ?? item.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {i > 0 && (
              <span style={{ color: colors.muted, fontSize: 12, opacity: 0.5 }}>/</span>
            )}
            {item.href ? (
              <Link
                href={item.href}
                style={{ color: colors.muted, fontSize: 13, textDecoration: 'none', fontWeight: 500 }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = colors.text; }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = colors.muted; }}
              >
                {item.label}
              </Link>
            ) : (
              <span style={{ color: colors.text, fontSize: 13, fontWeight: 600 }}>{item.label}</span>
            )}
          </span>
        ))}
      </div>

      {/* Right: currency selector + avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>

      {/* Currency selector */}
      <div style={{ width: 200 }}>
        <CurrencyCombobox
          value={displayCurrency}
          onChange={v => setDisplayCurrency(v)}
        />
      </div>

      {/* Privacy toggle */}
      <button
        onClick={togglePrivacy}
        title={privacyMode ? 'Show numbers' : 'Hide numbers'}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: privacyMode ? colors.accent : colors.muted,
          padding: 4,
          display: 'flex',
          alignItems: 'center',
          borderRadius: 4,
          transition: 'color 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.color = colors.text)}
        onMouseLeave={e => (e.currentTarget.style.color = privacyMode ? colors.accent : colors.muted)}
      >
        {privacyMode ? (
          // Eye-off icon
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        ) : (
          // Eye icon
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>

      {/* Right: avatar + dropdown */}
      <div ref={dropdownRef} style={{ position: 'relative' }}>
        {/* Avatar button */}
        <button
          onClick={() => setOpen(prev => !prev)}
          style={{
            width: 32,
            height: 32,
            borderRadius: 999,
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.surfaceLight,
          }}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={fullName ?? email ?? 'User'}
              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 999 }}
            />
          ) : (
            <span style={{ color: colors.accent, fontSize: 12, fontWeight: 600 }}>
              {initials}
            </span>
          )}
        </button>

        {/* Dropdown panel */}
        {open && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: 0,
              minWidth: 220,
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: 8,
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              fontSize: 13,
              overflow: 'hidden',
            }}
          >
            {/* User info */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '12px 16px',
              }}
            >
              {/* Avatar 36px */}
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 999,
                  overflow: 'hidden',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: colors.surfaceLight,
                }}
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={fullName ?? email ?? 'User'}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <span style={{ color: colors.accent, fontSize: 13, fontWeight: 600 }}>
                    {initials}
                  </span>
                )}
              </div>
              <div style={{ minWidth: 0 }}>
                {fullName && (
                  <div
                    style={{
                      color: colors.text,
                      fontWeight: 600,
                      fontSize: 13,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {fullName}
                  </div>
                )}
                {email && (
                  <div
                    style={{
                      color: colors.muted,
                      fontSize: 12,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {email}
                  </div>
                )}
              </div>
            </div>

            {/* Divider */}
            <div style={{ height: 1, backgroundColor: colors.border }} />

            {/* Sign out */}
            <button
              onClick={() => { setOpen(false); signOut().catch(console.error); }}
              onMouseEnter={() => setSignOutHover(true)}
              onMouseLeave={() => setSignOutHover(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                width: '100%',
                padding: '10px 16px',
                border: 'none',
                backgroundColor: 'transparent',
                color: signOutHover ? colors.negative : colors.muted,
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: 13,
                transition: 'color 0.15s',
              }}
            >
              {/* Logout icon */}
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Sign out
            </button>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
