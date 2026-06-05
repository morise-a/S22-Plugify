import * as React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from './button';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({ currentPage, totalPages, onPageChange, className = '' }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className={`flex items-center justify-center gap-1.5 py-4 ${className}`}>
      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(1)}
        disabled={currentPage === 1}
        className="h-8 w-8"
      >
        <ChevronsLeft className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="h-8 w-8"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="mx-3 text-sm font-medium text-muted-foreground">
        Page <span className="text-foreground">{currentPage}</span> of <span className="text-foreground">{totalPages}</span>
      </span>
      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="h-8 w-8"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(totalPages)}
        disabled={currentPage === totalPages}
        className="h-8 w-8"
      >
        <ChevronsRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
