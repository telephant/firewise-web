'use client';

import * as React from 'react';
import { createContext, useContext, useId } from 'react';
import { retro } from './theme';
import { cn } from '@/lib/utils';

// Form Field Context
interface FormFieldContextValue {
  id: string;
  name: string;
  error?: string;
  required?: boolean;
}

const FormFieldContext = createContext<FormFieldContextValue | null>(null);

export function useFormField() {
  const context = useContext(FormFieldContext);
  if (!context) {
    throw new Error('useFormField must be used within a FormField');
  }
  return context;
}

// FormField wrapper component
export interface FormFieldProps {
  name: string;
  label?: string;
  error?: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}

export function FormField({
  name,
  label,
  error,
  required,
  hint,
  children,
  className,
}: FormFieldProps) {
  const id = useId();
  const hasError = !!error;

  return (
    <FormFieldContext.Provider value={{ id, name, error, required }}>
      <div className={cn('w-full', className)}>
        {label && (
          <label
            htmlFor={id}
            className="text-xs uppercase tracking-wide block mb-1 font-medium"
            style={{ color: hasError ? '#c53030' : retro.text }}
          >
            {label}
            {required && (
              <span className="ml-0.5" style={{ color: '#c53030' }}>
                *
              </span>
            )}
          </label>
        )}

        {children}

        {/* Error message */}
        {hasError && (
          <div className="mt-1.5 flex items-start gap-1.5 text-xs">
            <span
              className="flex-shrink-0 w-3.5 h-3.5 rounded-full flex items-center justify-center text-white text-[9px] font-bold mt-0.5"
              style={{ backgroundColor: '#c53030' }}
            >
              !
            </span>
            <span style={{ color: '#c53030' }}>{error}</span>
          </div>
        )}

        {/* Hint text (only show if no error) */}
        {hint && !hasError && (
          <p className="mt-1 text-xs" style={{ color: retro.muted }}>
            {hint}
          </p>
        )}
      </div>
    </FormFieldContext.Provider>
  );
}

// Form component for grouping fields
export interface FormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  children: React.ReactNode;
}

export function Form({ children, className, ...props }: FormProps) {
  return (
    <form className={cn('space-y-4', className)} {...props}>
      {children}
    </form>
  );
}

// Form row for horizontal layout
export interface FormRowProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
  className?: string;
}

export function FormRow({ children, columns = 2, className }: FormRowProps) {
  const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
  };

  return (
    <div className={cn('grid gap-3', gridCols[columns], className)}>
      {children}
    </div>
  );
}

// Validation types
export type ValidationRule<T> = {
  validate: (value: T) => boolean;
  message: string;
};

export type FieldValidation<T> = {
  required?: boolean | string;
  min?: number | { value: number; message: string };
  max?: number | { value: number; message: string };
  pattern?: RegExp | { value: RegExp; message: string };
  custom?: ValidationRule<T> | ValidationRule<T>[];
};

// Validate a single field
export function validateField<T>(
  value: T,
  validation?: FieldValidation<T>
): string | undefined {
  if (!validation) return undefined;

  // Required check
  if (validation.required) {
    const isEmpty =
      value === undefined ||
      value === null ||
      value === '' ||
      (Array.isArray(value) && value.length === 0);

    if (isEmpty) {
      return typeof validation.required === 'string'
        ? validation.required
        : 'This field is required';
    }
  }

  // Skip other validations if value is empty and not required
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  // Min check (for numbers and strings)
  if (validation.min !== undefined) {
    const minValue =
      typeof validation.min === 'number' ? validation.min : validation.min.value;
    const minMessage =
      typeof validation.min === 'number'
        ? `Minimum value is ${minValue}`
        : validation.min.message;

    const numValue = typeof value === 'string' ? parseFloat(value) : (value as number);
    if (!isNaN(numValue) && numValue < minValue) {
      return minMessage;
    }
  }

  // Max check
  if (validation.max !== undefined) {
    const maxValue =
      typeof validation.max === 'number' ? validation.max : validation.max.value;
    const maxMessage =
      typeof validation.max === 'number'
        ? `Maximum value is ${maxValue}`
        : validation.max.message;

    const numValue = typeof value === 'string' ? parseFloat(value) : (value as number);
    if (!isNaN(numValue) && numValue > maxValue) {
      return maxMessage;
    }
  }

  // Pattern check
  if (validation.pattern) {
    const pattern =
      validation.pattern instanceof RegExp
        ? validation.pattern
        : validation.pattern.value;
    const patternMessage =
      validation.pattern instanceof RegExp
        ? 'Invalid format'
        : validation.pattern.message;

    if (typeof value === 'string' && !pattern.test(value)) {
      return patternMessage;
    }
  }

  // Custom validations
  if (validation.custom) {
    const rules = Array.isArray(validation.custom)
      ? validation.custom
      : [validation.custom];

    for (const rule of rules) {
      if (!rule.validate(value)) {
        return rule.message;
      }
    }
  }

  return undefined;
}

// Hook for form state management
export interface UseFormOptions<T extends Record<string, unknown>> {
  initialValues: T;
  validations?: Partial<{ [K in keyof T]: FieldValidation<T[K]> }>;
  onSubmit?: (values: T) => void | Promise<void>;
}

export interface UseFormReturn<T extends Record<string, unknown>> {
  values: T;
  errors: Partial<{ [K in keyof T]: string }>;
  touched: Partial<{ [K in keyof T]: boolean }>;
  isSubmitting: boolean;
  isValid: boolean;
  setValue: <K extends keyof T>(name: K, value: T[K]) => void;
  setError: <K extends keyof T>(name: K, error: string | undefined) => void;
  setTouched: <K extends keyof T>(name: K, touched?: boolean) => void;
  validateField: <K extends keyof T>(name: K) => string | undefined;
  validateAll: () => boolean;
  handleSubmit: (e?: React.FormEvent) => Promise<void>;
  reset: () => void;
  getFieldProps: <K extends keyof T>(name: K) => {
    value: T[K];
    onChange: (e: { target: { value: unknown } }) => void;
    onBlur: () => void;
  };
}

export function useForm<T extends Record<string, unknown>>({
  initialValues,
  validations,
  onSubmit,
}: UseFormOptions<T>): UseFormReturn<T> {
  const [values, setValues] = React.useState<T>(initialValues);
  const [errors, setErrors] = React.useState<Partial<{ [K in keyof T]: string }>>({});
  const [touched, setTouchedState] = React.useState<Partial<{ [K in keyof T]: boolean }>>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const setValue = React.useCallback(<K extends keyof T>(name: K, value: T[K]) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    // Clear error when value changes
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  }, []);

  const setError = React.useCallback(<K extends keyof T>(name: K, error: string | undefined) => {
    setErrors((prev) => ({ ...prev, [name]: error }));
  }, []);

  const setTouched = React.useCallback(<K extends keyof T>(name: K, isTouched = true) => {
    setTouchedState((prev) => ({ ...prev, [name]: isTouched }));
  }, []);

  const validateFieldByName = React.useCallback(
    <K extends keyof T>(name: K): string | undefined => {
      const validation = validations?.[name];
      const error = validateField(values[name], validation as FieldValidation<T[K]>);
      setErrors((prev) => ({ ...prev, [name]: error }));
      return error;
    },
    [values, validations]
  );

  const validateAll = React.useCallback((): boolean => {
    if (!validations) return true;

    const newErrors: Partial<{ [K in keyof T]: string }> = {};
    let isValid = true;

    for (const key of Object.keys(validations) as (keyof T)[]) {
      const error = validateField(values[key], validations[key] as FieldValidation<T[typeof key]>);
      if (error) {
        newErrors[key] = error;
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  }, [values, validations]);

  const handleSubmit = React.useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();

      if (!validateAll()) return;

      setIsSubmitting(true);
      try {
        await onSubmit?.(values);
      } finally {
        setIsSubmitting(false);
      }
    },
    [values, validateAll, onSubmit]
  );

  const reset = React.useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouchedState({});
  }, [initialValues]);

  const getFieldProps = React.useCallback(
    <K extends keyof T>(name: K) => ({
      value: values[name],
      onChange: (e: { target: { value: unknown } }) => {
        setValue(name, e.target.value as T[K]);
      },
      onBlur: () => {
        setTouched(name, true);
        validateFieldByName(name);
      },
    }),
    [values, setValue, setTouched, validateFieldByName]
  );

  const isValid = Object.values(errors).every((e) => !e);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    isValid,
    setValue,
    setError,
    setTouched,
    validateField: validateFieldByName,
    validateAll,
    handleSubmit,
    reset,
    getFieldProps,
  };
}
