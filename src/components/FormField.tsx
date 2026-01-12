'use client';

import React from 'react';
import { theme } from '@/lib/theme';
import { AlertCircle, Info } from 'lucide-react';

/**
 * FormField Component
 * 
 * Reusable form field wrapper with label, error messages, and validation hints.
 * Provides consistent styling and accessibility features.
 */

export interface FormFieldProps {
  /**
   * Field label
   */
  label: string;
  
  /**
   * Field ID (for label association)
   */
  id: string;
  
  /**
   * Whether the field is required
   */
  required?: boolean;
  
  /**
   * Error message to display
   */
  error?: string;
  
  /**
   * Helper text or validation hint
   */
  hint?: string;
  
  /**
   * Input element
   */
  children: React.ReactNode;
  
  /**
   * Additional CSS class name
   */
  className?: string;
}

export function FormField({
  label,
  id,
  required = false,
  error,
  hint,
  children,
  className = '',
}: FormFieldProps) {
  const hasError = !!error;
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  // Clone children and add ARIA attributes
  const childrenWithProps = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      const ariaProps: Record<string, any> = {
        'aria-invalid': hasError ? 'true' : 'false',
        'aria-required': required ? 'true' : 'false',
      };

      if (hasError) {
        ariaProps['aria-describedby'] = errorId;
      } else if (hint) {
        ariaProps['aria-describedby'] = hintId;
      }

      return React.cloneElement(child, ariaProps);
    }
    return child;
  });

  return (
    <div className={className} style={{ marginBottom: theme.spacing[4] }}>
      {/* Label */}
      <label
        htmlFor={id}
        style={{
          display: 'block',
          fontSize: theme.typography.fontSize.sm,
          fontWeight: theme.typography.fontWeight.medium,
          color: hasError ? theme.colors.error[700] : theme.colors.text.primary,
          marginBottom: theme.spacing[2],
          lineHeight: theme.typography.lineHeight.normal,
        }}
      >
        {label}
        {required && (
          <span
            style={{
              color: theme.colors.error[500],
              marginLeft: theme.spacing[1],
            }}
            aria-label="required"
          >
            *
          </span>
        )}
      </label>

      {/* Input with ARIA attributes */}
      <div>{childrenWithProps}</div>

      {/* Error Message */}
      {hasError && (
        <div
          id={errorId}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            marginTop: theme.spacing[2],
            color: theme.colors.error[600],
            fontSize: theme.typography.fontSize.sm,
            lineHeight: theme.typography.lineHeight.normal,
          }}
          role="alert"
          aria-live="polite"
        >
          <AlertCircle
            style={{
              width: '1rem',
              height: '1rem',
              marginRight: theme.spacing[1],
              marginTop: '0.125rem',
              flexShrink: 0,
            }}
            aria-hidden="true"
          />
          <span>{error}</span>
        </div>
      )}

      {/* Hint */}
      {!hasError && hint && (
        <div
          id={hintId}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            marginTop: theme.spacing[2],
            color: theme.colors.text.secondary,
            fontSize: theme.typography.fontSize.sm,
            lineHeight: theme.typography.lineHeight.normal,
          }}
        >
          <Info
            style={{
              width: '1rem',
              height: '1rem',
              marginRight: theme.spacing[1],
              marginTop: '0.125rem',
              flexShrink: 0,
            }}
            aria-hidden="true"
          />
          <span>{hint}</span>
        </div>
      )}
    </div>
  );
}

/**
 * Input Component
 * 
 * Styled input field with validation states
 */
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /**
   * Whether the input has an error
   */
  error?: boolean;
  
  /**
   * Input size
   */
  inputSize?: 'sm' | 'md' | 'lg';
  
  /**
   * Full width input
   */
  fullWidth?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ error = false, inputSize = 'md', fullWidth = false, className = '', style, ...props }, ref) => {
    const getSizeStyles = () => {
      const sizes = {
        sm: {
          padding: `${theme.spacing[2]} ${theme.spacing[3]}`,
          fontSize: theme.typography.fontSize.sm,
          height: '2rem',
        },
        md: {
          padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
          fontSize: theme.typography.fontSize.base,
          height: '2.5rem',
        },
        lg: {
          padding: `${theme.spacing[4]} ${theme.spacing[4]}`,
          fontSize: theme.typography.fontSize.lg,
          height: '3rem',
        },
      };
      
      return sizes[inputSize];
    };

    const sizeStyles = getSizeStyles();

    const inputStyle: React.CSSProperties = {
      ...sizeStyles,
      width: fullWidth ? '100%' : 'auto',
      borderRadius: theme.borderRadius.md,
      border: `1px solid ${error ? theme.colors.error[500] : theme.colors.border.main}`,
      backgroundColor: theme.colors.background.default,
      color: theme.colors.text.primary,
      fontFamily: theme.typography.fontFamily.sans,
      transition: `all ${theme.transitions.duration.fast} ${theme.transitions.timing.ease}`,
      outline: 'none',
      ...style,
    };

    return (
      <input
        ref={ref}
        {...props}
        className={className}
        style={inputStyle}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = error
            ? theme.colors.error[500]
            : theme.colors.primary[500];
          e.currentTarget.style.boxShadow = `0 0 0 3px ${
            error ? theme.colors.error[100] : theme.colors.primary[100]
          }`;
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = error
            ? theme.colors.error[500]
            : theme.colors.border.main;
          e.currentTarget.style.boxShadow = 'none';
          props.onBlur?.(e);
        }}
      />
    );
  }
);

Input.displayName = 'Input';

/**
 * Textarea Component
 * 
 * Styled textarea field with validation states
 */
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /**
   * Whether the textarea has an error
   */
  error?: boolean;
  
  /**
   * Full width textarea
   */
  fullWidth?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ error = false, fullWidth = false, className = '', style, ...props }, ref) => {
    const textareaStyle: React.CSSProperties = {
      padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
      fontSize: theme.typography.fontSize.base,
      width: fullWidth ? '100%' : 'auto',
      minHeight: '6rem',
      borderRadius: theme.borderRadius.md,
      border: `1px solid ${error ? theme.colors.error[500] : theme.colors.border.main}`,
      backgroundColor: theme.colors.background.default,
      color: theme.colors.text.primary,
      fontFamily: theme.typography.fontFamily.sans,
      lineHeight: theme.typography.lineHeight.normal,
      transition: `all ${theme.transitions.duration.fast} ${theme.transitions.timing.ease}`,
      outline: 'none',
      resize: 'vertical',
      ...style,
    };

    return (
      <textarea
        ref={ref}
        {...props}
        className={className}
        style={textareaStyle}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = error
            ? theme.colors.error[500]
            : theme.colors.primary[500];
          e.currentTarget.style.boxShadow = `0 0 0 3px ${
            error ? theme.colors.error[100] : theme.colors.primary[100]
          }`;
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = error
            ? theme.colors.error[500]
            : theme.colors.border.main;
          e.currentTarget.style.boxShadow = 'none';
          props.onBlur?.(e);
        }}
      />
    );
  }
);

Textarea.displayName = 'Textarea';

/**
 * Select Component
 * 
 * Styled select field with validation states
 */
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  /**
   * Whether the select has an error
   */
  error?: boolean;
  
  /**
   * Select size
   */
  selectSize?: 'sm' | 'md' | 'lg';
  
  /**
   * Full width select
   */
  fullWidth?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ error = false, selectSize = 'md', fullWidth = false, className = '', style, ...props }, ref) => {
    const getSizeStyles = () => {
      const sizes = {
        sm: {
          padding: `${theme.spacing[2]} ${theme.spacing[3]}`,
          fontSize: theme.typography.fontSize.sm,
          height: '2rem',
        },
        md: {
          padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
          fontSize: theme.typography.fontSize.base,
          height: '2.5rem',
        },
        lg: {
          padding: `${theme.spacing[4]} ${theme.spacing[4]}`,
          fontSize: theme.typography.fontSize.lg,
          height: '3rem',
        },
      };
      
      return sizes[selectSize];
    };

    const sizeStyles = getSizeStyles();

    const selectStyle: React.CSSProperties = {
      ...sizeStyles,
      width: fullWidth ? '100%' : 'auto',
      borderRadius: theme.borderRadius.md,
      border: `1px solid ${error ? theme.colors.error[500] : theme.colors.border.main}`,
      backgroundColor: theme.colors.background.default,
      color: theme.colors.text.primary,
      fontFamily: theme.typography.fontFamily.sans,
      transition: `all ${theme.transitions.duration.fast} ${theme.transitions.timing.ease}`,
      outline: 'none',
      cursor: 'pointer',
      ...style,
    };

    return (
      <select
        ref={ref}
        {...props}
        className={className}
        style={selectStyle}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = error
            ? theme.colors.error[500]
            : theme.colors.primary[500];
          e.currentTarget.style.boxShadow = `0 0 0 3px ${
            error ? theme.colors.error[100] : theme.colors.primary[100]
          }`;
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = error
            ? theme.colors.error[500]
            : theme.colors.border.main;
          e.currentTarget.style.boxShadow = 'none';
          props.onBlur?.(e);
        }}
      />
    );
  }
);

Select.displayName = 'Select';
