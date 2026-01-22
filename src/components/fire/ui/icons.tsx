'use client';

interface IconProps {
  size?: number;
  className?: string;
}

// Retro-style pixel icons for FIRE app
// Designed to match Windows 95/98 aesthetic

export function IconDollar({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" className={className}>
      {/* Clean pixel-art dollar sign $ */}
      {/* Vertical line through center */}
      <rect x="7" y="1" width="2" height="14" />
      {/* Top of S: horizontal bar */}
      <rect x="4" y="3" width="8" height="2" />
      {/* Top left curve */}
      <rect x="4" y="5" width="2" height="2" />
      {/* Middle bar */}
      <rect x="5" y="7" width="6" height="2" />
      {/* Bottom right curve */}
      <rect x="10" y="9" width="2" height="2" />
      {/* Bottom of S: horizontal bar */}
      <rect x="4" y="11" width="8" height="2" />
    </svg>
  );
}

export function IconCoin({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" className={className}>
      <path d="M4 2h8v1h2v2h1v6h-1v2h-2v1H4v-1H2v-2H1V5h1V3h2V2zm1 2v1H4v6h1v1h6v-1h1V5h-1V4H5z" />
      <path d="M7 6h2v4H7V6z" />
    </svg>
  );
}

export function IconTransfer({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" className={className}>
      {/* Top arrow pointing right → */}
      <rect x="1" y="3" width="10" height="2" />
      <rect x="9" y="1" width="2" height="2" />
      <rect x="11" y="3" width="2" height="2" />
      <rect x="9" y="5" width="2" height="2" />
      {/* Bottom arrow pointing left ← */}
      <rect x="5" y="11" width="10" height="2" />
      <rect x="5" y="9" width="2" height="2" />
      <rect x="3" y="11" width="2" height="2" />
      <rect x="5" y="13" width="2" height="2" />
    </svg>
  );
}

export function IconChart({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" className={className}>
      <path d="M1 14V2h2v10h12v2H1z" />
      <path d="M5 10h2v2H5v-2zM8 7h2v5H8V7zM11 4h2v8h-2V4z" />
    </svg>
  );
}

export function IconChartDown({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" className={className}>
      <path d="M1 14V2h2v10h12v2H1z" />
      <path d="M5 4h2v8H5V4zM8 7h2v5H8V7zM11 10h2v2h-2v-2z" />
    </svg>
  );
}

export function IconGift({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" className={className}>
      <path d="M3 4h4V3h2v1h4v3h-1v7H4V7H3V4zm2 3v5h2V7H5zm4 0v5h2V7H9z" />
      <path d="M5 2h2v2H5V2zM9 2h2v2H9V2z" />
    </svg>
  );
}

export function IconHome({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" className={className}>
      <path d="M8 1l1 1 1 1 1 1 1 1 1 1 1 1v1h-2v6H4V8H2V7l1-1 1-1 1-1 1-1 1-1 1-1zm-2 7v4h1V9h2v3h1V8H6z" />
    </svg>
  );
}

export function IconBriefcase({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" className={className}>
      <path d="M5 2h6v2h4v10H1V4h4V2zm2 2h2V3H7v1zM3 6v6h10V6H3z" />
    </svg>
  );
}

export function IconBank({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" className={className}>
      <path d="M8 1l7 4v2H1V5l7-4zM3 8h2v5H3V8zM7 8h2v5H7V8zM11 8h2v5h-2V8zM1 14h14v1H1v-1z" />
    </svg>
  );
}

export function IconCreditCard({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" className={className}>
      <path d="M1 3h14v10H1V3zm1 2v2h12V5H2zm0 4v2h4V9H2zm6 0v2h2V9H8z" />
    </svg>
  );
}

export function IconRecycle({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" className={className}>
      <path d="M7 1h2v2h2v2h-2v2H7V5H5V3h2V1z" />
      <path d="M3 7h2v2H3V7zM11 7h2v2h-2V7z" />
      <path d="M5 11h2v2H5v-2zM9 11h2v2H9v-2z" />
      <path d="M7 13h2v2H7v-2z" />
    </svg>
  );
}

export function IconMore({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" className={className}>
      <path d="M2 7h3v3H2V7zM7 7h3v3H7V7zM12 7h3v3h-3V7z" />
    </svg>
  );
}

export function IconPlus({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" className={className}>
      <path d="M7 3h2v4h4v2h-4v4H7V9H3V7h4V3z" />
    </svg>
  );
}

// Arrow icon - rotate with style transform for different directions
// Default points RIGHT (-->)
export function IconArrow({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" className={className}>
      {/* Horizontal line */}
      <rect x="2" y="7" width="8" height="2" />
      {/* Chevron pointing right */}
      <rect x="8" y="3" width="2" height="2" />
      <rect x="10" y="5" width="2" height="2" />
      <rect x="12" y="7" width="2" height="2" />
      <rect x="10" y="9" width="2" height="2" />
      <rect x="8" y="11" width="2" height="2" />
    </svg>
  );
}

export function IconTriangleUp({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" className={className}>
      <path d="M8 4l6 8H2l6-8z" />
    </svg>
  );
}

export function IconTriangleDown({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" className={className}>
      <path d="M8 12L2 4h12l-6 8z" />
    </svg>
  );
}

export function IconChevronDown({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" className={className}>
      <path d="M3 5h2v2h2v2h2V7h2V5h2v2h-2v2h-2v2H7v-2H5V7H3V5z" />
    </svg>
  );
}

// Asset type icons
export function IconCash({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" className={className}>
      <path d="M1 3h14v10H1V3zm2 2v6h10V5H3zm4 1h2v1h1v1h-1v1H8v1H7V9H6V8h1V7h1V6H7V5z" />
    </svg>
  );
}

export function IconStock({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" className={className}>
      <path d="M1 13V3h2v8h12v2H1z" />
      <path d="M4 9l2-2 2 1 4-4h-2V2h4v4h-2l-4 4-2-1-2 2v-2z" />
    </svg>
  );
}

export function IconEtf({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" className={className}>
      <path d="M1 14V2h2v10h12v2H1z" />
      <path d="M4 10h2v2H4v-2zM7 7h2v5H7V7zM10 4h2v8h-2V4z" />
    </svg>
  );
}

export function IconBond({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" className={className}>
      <path d="M2 1h12v14H2V1zm2 2v10h8V3H4zm2 2h4v1H6V5zm0 2h4v1H6V7zm0 2h2v1H6V9z" />
    </svg>
  );
}

export function IconRealEstate({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" className={className}>
      <path d="M8 1l7 6v1h-2v7H3V8H1V7l7-6zm-2 8v5h1V9h2v5h1V9H6z" />
    </svg>
  );
}

export function IconCrypto({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" className={className}>
      <path d="M5 1h6v2h2v2h-2v2h2v2h-2v2h2v2h-2v2H5v-2H3v-2h2V9H3V7h2V5H3V3h2V1zm2 2v2h2V3H7zm0 4v2h2V7H7zm0 4v2h2v-2H7z" />
    </svg>
  );
}

export function IconDebt({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" className={className}>
      <path d="M1 13V3h2v8h12v2H1z" />
      <path d="M4 4l2 2 2-1 4 4h-2v2h4V7h-2l-4-4-2 1-2-2v2z" />
    </svg>
  );
}

export function IconBox({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" className={className}>
      <path d="M2 2h12v12H2V2zm2 2v8h8V4H4z" />
    </svg>
  );
}

export function IconEdit({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" className={className}>
      {/* Pencil tip */}
      <path d="M2 14l1-3 2 2-3 1z" />
      {/* Pencil body */}
      <path d="M4 10l6-6 2 2-6 6-2-2z" />
      {/* Pencil top */}
      <path d="M11 3l2-2 2 2-2 2-2-2z" />
    </svg>
  );
}

export function IconCheck({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" className={className}>
      <path d="M13.5 4.5l-7 7-4-4 1.5-1.5 2.5 2.5 5.5-5.5 1.5 1.5z" />
    </svg>
  );
}

export function IconTrash({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" className={className}>
      {/* Lid handle */}
      <rect x="6" y="1" width="4" height="2" />
      {/* Lid */}
      <rect x="2" y="3" width="12" height="2" />
      {/* Bin body outline */}
      <path d="M3 6h2v8H3V6z" />
      <path d="M11 6h2v8h-2V6z" />
      <path d="M5 13h6v1H5v-1z" />
      {/* Bin ridges */}
      <rect x="6" y="6" width="1" height="7" />
      <rect x="9" y="6" width="1" height="7" />
    </svg>
  );
}

export function IconBell({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" className={className}>
      <path d="M8 1.5c-.7 0-1.3.6-1.3 1.3v.5C4.5 4 3 6.1 3 8.5v3l-1 2h12l-1-2v-3c0-2.4-1.5-4.5-3.7-5.2v-.5c0-.7-.6-1.3-1.3-1.3zM8 15c-1.1 0-2-.9-2-2h4c0 1.1-.9 2-2 2z" />
    </svg>
  );
}

export function IconSettings({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" className={className}>
      {/* Gear with center hole */}
      {/* Cardinal teeth */}
      <rect x="7" y="1" width="2" height="3" />
      <rect x="12" y="7" width="3" height="2" />
      <rect x="7" y="12" width="2" height="3" />
      <rect x="1" y="7" width="3" height="2" />
      {/* Diagonal teeth */}
      <rect x="11" y="4" width="2" height="2" />
      <rect x="11" y="10" width="2" height="2" />
      <rect x="3" y="10" width="2" height="2" />
      <rect x="3" y="4" width="2" height="2" />
      {/* Ring body - top and bottom */}
      <rect x="5" y="4" width="6" height="2" />
      <rect x="5" y="10" width="6" height="2" />
      {/* Ring body - left and right */}
      <rect x="4" y="5" width="2" height="6" />
      <rect x="10" y="5" width="2" height="6" />
    </svg>
  );
}

export function IconRepeat({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" className={className}>
      {/* Refresh/cycle icon - two curved arrows */}
      {/* Top arc with arrow pointing right */}
      <rect x="4" y="2" width="6" height="2" />
      <rect x="2" y="4" width="2" height="4" />
      <rect x="10" y="0" width="2" height="2" />
      <rect x="12" y="2" width="2" height="2" />
      <rect x="10" y="4" width="2" height="2" />
      {/* Bottom arc with arrow pointing left */}
      <rect x="6" y="12" width="6" height="2" />
      <rect x="12" y="8" width="2" height="4" />
      <rect x="4" y="10" width="2" height="2" />
      <rect x="2" y="12" width="2" height="2" />
      <rect x="4" y="14" width="2" height="2" />
    </svg>
  );
}

export function IconPause({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" className={className}>
      {/* Two vertical bars */}
      <rect x="3" y="2" width="4" height="12" />
      <rect x="9" y="2" width="4" height="12" />
    </svg>
  );
}

export function IconPlay({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" className={className}>
      {/* Play triangle pointing right */}
      <path d="M4 2v12l10-6L4 2z" />
    </svg>
  );
}

export function IconUpload({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" className={className}>
      {/* Arrow pointing up */}
      <rect x="7" y="2" width="2" height="8" />
      <rect x="5" y="4" width="2" height="2" />
      <rect x="9" y="4" width="2" height="2" />
      <rect x="3" y="6" width="2" height="2" />
      <rect x="11" y="6" width="2" height="2" />
      {/* Base line */}
      <rect x="2" y="12" width="12" height="2" />
    </svg>
  );
}

export function IconWarning({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" className={className}>
      {/* Triangle warning shape */}
      <path d="M8 1l7 13H1L8 1zm0 3l-4 8h8L8 4z" />
      {/* Exclamation mark */}
      <rect x="7" y="6" width="2" height="3" />
      <rect x="7" y="10" width="2" height="2" />
    </svg>
  );
}

export function IconX({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" className={className}>
      {/* X shape */}
      <path d="M3 3l2 2 3 3 3-3 2-2 2 2-2 2-3 3 3 3 2 2-2 2-2-2-3-3-3 3-2 2-2-2 2-2 3-3-3-3-2-2 2-2z" />
    </svg>
  );
}
