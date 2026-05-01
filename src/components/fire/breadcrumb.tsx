'use client';

import Link from 'next/link';
import { colors } from '@/components/fire/ui';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface Props {
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: Props) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
      {items.map((item, i) => (
        <span key={item.href ?? item.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {i > 0 && (
            <span style={{ color: colors.muted, fontSize: 12, opacity: 0.5 }}>/</span>
          )}
          {item.href ? (
            <Link
              href={item.href}
              style={{ color: colors.muted, fontSize: 12, textDecoration: 'none' }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = colors.text; }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = colors.muted; }}
            >
              {item.label}
            </Link>
          ) : (
            <span style={{ color: colors.text, fontSize: 12 }}>{item.label}</span>
          )}
        </span>
      ))}
    </div>
  );
}
