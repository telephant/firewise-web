// Retro UI Components for FIRE Management
// Design system inspired by Windows 95/98 + Game aesthetic

// Theme
export { retro, typography, retroStyles } from './theme';
export type { RetroTheme } from './theme';

// Charts
export { RetroBarShape, RetroBarChart, RetroStackedBarChart, RetroPieChart } from './charts';
export type { RetroBarShapeProps, RetroBarChartProps, RetroBarChartData, RetroStackedBarChartProps, StackedBarItem, RetroPieChartProps, PieSegment } from './charts';

// Icons
export * from './icons';

// Category Icons (shared mapping for flow categories)
export { CATEGORY_ICONS, getCategoryIcon } from './category-icons';

// Components
export { ProgressBar } from './progress-bar';
export { SimpleProgressBar } from './simple-progress-bar';
export { StatCard } from './stat-card';
export { Input } from './input';
export type { InputProps } from './input';
export { Select } from './select';
export type { SelectProps } from './select';
export { CurrencyCombobox, CURRENCIES, getCurrencyInfo, getCurrencySymbolFromCode } from './currency-combobox';
export type { CurrencyComboboxProps } from './currency-combobox';
export { AssetCombobox } from './asset-combobox';
export type { AssetComboboxProps } from './asset-combobox';
export { Button } from './button';
export type { ButtonProps } from './button';
export { Card, CardHeader, CardTitle, CardLabel, CardValue } from './card/index';
export type { CardProps, CardHeaderProps, CardTitleProps, CardLabelProps, CardValueProps } from './card/index';
export { Label } from './label';
export type { LabelProps } from './label';
export {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from './dialog';
export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from './sidebar';
export { Tabs, TabsList, TabsTrigger, TabsContent } from './tabs';
export type { TabsProps, TabsListProps, TabsTriggerProps, TabsContentProps } from './tabs';
export { Loader, LoadingText } from './loader';
export type { LoaderProps } from './loader';
export { ButtonGroup } from './button-group';
export type { ButtonGroupProps, ButtonGroupOption } from './button-group';
export { Form, FormField, FormRow, useForm, validateField } from './form';
export type { FormProps, FormFieldProps, FormRowProps, UseFormOptions, UseFormReturn, FieldValidation, ValidationRule } from './form';
export { Celebration } from './celebration';
export { RadioOptionGroup } from './radio-option-group';
export type { RadioOption } from './radio-option-group';
export { PaymentSourceSelector } from './payment-source-selector';
export type { PaymentSourceType } from './payment-source-selector';
export { FilterDropdown } from './filter-dropdown';
export type { FilterOption, FilterGroup } from './filter-dropdown';
export { Tag } from './tag';
export type { TagProps } from './tag';
