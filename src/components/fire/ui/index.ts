// Retro UI Components for FIRE Management
// Design system inspired by Windows 95/98 + Game aesthetic

// Theme
export { retro, typography, retroStyles } from './theme';
export type { RetroTheme } from './theme';

// Icons
export * from './icons';

// Category Icons (shared mapping for flow categories)
export { CATEGORY_ICONS, getCategoryIcon } from './category-icons';

// Components
export { ProgressBar } from './progress-bar';
export { StatCard } from './stat-card';
export { Input } from './input';
export type { InputProps } from './input';
export { Select } from './select';
export type { SelectProps } from './select';
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
