import * as React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', type = 'text', error, label, helperText, id, ...props }, ref) => {
    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-foreground/80">
            {label}
          </label>
        )}
        <input
          id={id}
          type={type}
          ref={ref}
          className={`
            flex h-10 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200
            ${error ? 'border-destructive focus-visible:ring-destructive' : 'hover:border-foreground/20'}
            ${className}
          `}
          {...props}
        />
        {error && <span className="text-xs text-destructive font-medium">{error}</span>}
        {!error && helperText && <span className="text-xs text-muted-foreground">{helperText}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';
