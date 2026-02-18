'use client';

// Re-export Lucide icons with legacy names for backward compatibility
// This replaces the old pixel-art SVG icons

import {
  DollarSign,
  CircleDollarSign,
  ArrowLeftRight,
  BarChart3,
  TrendingDown,
  Gift,
  Home,
  Briefcase,
  Landmark,
  CreditCard,
  Recycle,
  MoreHorizontal,
  Plus,
  ArrowRight,
  TrendingUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Banknote,
  LineChart,
  BarChart2,
  FileText,
  Building2,
  Bitcoin,
  Receipt,
  Box,
  Pencil,
  Check,
  Trash2,
  Bell,
  Settings,
  Repeat,
  Pause,
  Play,
  Upload,
  AlertTriangle,
  X,
  Mail,
  Maximize2,
  Minimize2,
  Gem,
} from 'lucide-react';

// Common icon props interface
interface IconProps {
  size?: number;
  className?: string;
}

// Wrapper to adapt Lucide icons to legacy API (size prop as number)
function wrap(Icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>) {
  return function WrappedIcon({ size = 16, className }: IconProps) {
    return <Icon size={size} className={className} strokeWidth={1.5} />;
  };
}

// Flow category & nav icons
export const IconDollar = wrap(DollarSign);
export const IconCoin = wrap(CircleDollarSign);
export const IconTransfer = wrap(ArrowLeftRight);
export const IconChart = wrap(BarChart3);
export const IconChartDown = wrap(TrendingDown);
export const IconGift = wrap(Gift);
export const IconHome = wrap(Home);
export const IconBriefcase = wrap(Briefcase);
export const IconBank = wrap(Landmark);
export const IconCreditCard = wrap(CreditCard);
export const IconRecycle = wrap(Recycle);
export const IconMore = wrap(MoreHorizontal);

// UI action icons
export const IconPlus = wrap(Plus);
export const IconArrow = wrap(ArrowRight);
export const IconTriangleUp = wrap(TrendingUp);
export const IconTriangleDown = wrap(TrendingDown);
export const IconChevronDown = wrap(ChevronDown);
export const IconChevronLeft = wrap(ChevronLeft);
export const IconChevronRight = wrap(ChevronRight);
export const IconEdit = wrap(Pencil);
export const IconCheck = wrap(Check);
export const IconTrash = wrap(Trash2);
export const IconBell = wrap(Bell);
export const IconSettings = wrap(Settings);
export const IconRepeat = wrap(Repeat);
export const IconPause = wrap(Pause);
export const IconPlay = wrap(Play);
export const IconUpload = wrap(Upload);
export const IconWarning = wrap(AlertTriangle);
export const IconX = wrap(X);
export const IconMail = wrap(Mail);
export const IconMaximize = wrap(Maximize2);
export const IconMinimize = wrap(Minimize2);

// Asset type icons
export const IconCash = wrap(Banknote);
export const IconStock = wrap(LineChart);
export const IconEtf = wrap(BarChart2);
export const IconBond = wrap(FileText);
export const IconRealEstate = wrap(Building2);
export const IconCrypto = wrap(Bitcoin);
export const IconMetals = wrap(Gem);
export const IconDebt = wrap(Receipt);
export const IconBox = wrap(Box);
