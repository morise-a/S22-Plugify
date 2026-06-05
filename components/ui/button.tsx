import * as React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'destructive' | 'ghost' | 'link';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] cursor-pointer';
    
    const variants = {
      primary: 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:shadow',
      secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
      outline: 'border border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground',
      destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
      ghost: 'text-foreground hover:bg-accent hover:text-accent-foreground',
      link: 'text-primary underline-offset-4 hover:underline active:scale-100',
    };

    const sizes = {
      sm: 'h-8 px-3 text-xs rounded-md',
      md: 'h-10 px-4 py-2',
      lg: 'h-12 px-6 text-base rounded-xl',
      icon: 'h-10 w-10',
    };

    const combinedClassName = `${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`;

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={combinedClassName}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {size !== 'icon' && children}
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
