'use client';

import * as React from 'react';

interface TabsContextProps {
  value: string;
  onValueChange: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextProps | null>(null);

export interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultValue: string;
  value?: string;
  onValueChange?: (value: string) => void;
}

export function Tabs({ defaultValue, value, onValueChange, className = '', children, ...props }: TabsProps) {
  const [localValue, setLocalValue] = React.useState(defaultValue);
  const activeValue = value !== undefined ? value : localValue;
  const handleValueChange = onValueChange || setLocalValue;

  return (
    <TabsContext.Provider value={{ value: activeValue, onValueChange: handleValueChange }}>
      <div className={`w-full ${className}`} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

export interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {}

export function TabsList({ className = '', children, ...props }: TabsListProps) {
  return (
    <div
      className={`inline-flex h-10 items-center justify-center rounded-lg bg-secondary p-1 text-muted-foreground ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

export function TabsTrigger({ value, className = '', children, ...props }: TabsTriggerProps) {
  const context = React.useContext(TabsContext);
  if (!context) throw new Error('TabsTrigger must be used inside Tabs');

  const isActive = context.value === value;

  return (
    <button
      type="button"
      onClick={() => context.onValueChange(value)}
      className={`
        inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer
        ${isActive ? 'bg-card text-foreground shadow-sm' : 'hover:bg-card/50 hover:text-foreground'}
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
}

export interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

export function TabsContent({ value, className = '', children, ...props }: TabsContentProps) {
  const context = React.useContext(TabsContext);
  if (!context) throw new Error('TabsContent must be used inside Tabs');

  const isActive = context.value === value;

  if (!isActive) return null;

  return (
    <div
      className={`mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 animate-fade-in ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
