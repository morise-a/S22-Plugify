import * as React from 'react';

export function Skeleton({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`animate-pulse rounded-md bg-secondary/70 dark:bg-secondary/40 ${className}`}
      {...props}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="border border-border rounded-xl p-6 bg-card space-y-4 animate-pulse">
      <div className="h-6 w-2/3 bg-secondary/70 dark:bg-secondary/40 rounded" />
      <div className="h-4 w-full bg-secondary/70 dark:bg-secondary/40 rounded" />
      <div className="h-4 w-5/6 bg-secondary/70 dark:bg-secondary/40 rounded" />
      <div className="h-10 w-full bg-secondary/70 dark:bg-secondary/40 rounded-lg mt-4" />
    </div>
  );
}

export function SkeletonTable() {
  return (
    <div className="border border-border rounded-xl bg-card overflow-hidden animate-pulse">
      <div className="h-12 bg-secondary/40 border-b border-border" />
      <div className="divide-y divide-border/60">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-16 flex items-center justify-between px-6">
            <div className="h-4 w-1/4 bg-secondary/70 dark:bg-secondary/40 rounded" />
            <div className="h-4 w-1/6 bg-secondary/70 dark:bg-secondary/40 rounded" />
            <div className="h-4 w-1/5 bg-secondary/70 dark:bg-secondary/40 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
