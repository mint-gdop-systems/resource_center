import React from 'react';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from './pagination';
import { ChevronFirst, ChevronLast } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface PaginationComponentProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  showFirstLast?: boolean;
  showPreviousNext?: boolean;
  maxVisiblePages?: number;
  className?: string;
  size?: 'sm' | 'default' | 'lg';
  disabled?: boolean;
}

const PaginationComponent: React.FC<PaginationComponentProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  showFirstLast = true,
  showPreviousNext = true,
  maxVisiblePages = 7,
  className,
  size = 'default',
  disabled = false,
}) => {
  // Generate page numbers to display
  const generatePageNumbers = (): (number | 'ellipsis')[] => {
    if (totalPages <= maxVisiblePages) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: (number | 'ellipsis')[] = [];
    const halfVisible = Math.floor(maxVisiblePages / 2);

    // Always show first page
    pages.push(1);

    let startPage = Math.max(2, currentPage - halfVisible + 1);
    let endPage = Math.min(totalPages - 1, currentPage + halfVisible - 1);

    // Adjust if we're near the beginning
    if (currentPage <= halfVisible) {
      endPage = Math.min(totalPages - 1, maxVisiblePages - 1);
    }

    // Adjust if we're near the end
    if (currentPage > totalPages - halfVisible) {
      startPage = Math.max(2, totalPages - maxVisiblePages + 2);
    }

    // Add ellipsis after first page if needed
    if (startPage > 2) {
      pages.push('ellipsis');
    }

    // Add middle pages
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    // Add ellipsis before last page if needed
    if (endPage < totalPages - 1) {
      pages.push('ellipsis');
    }

    // Always show last page (if more than 1 page)
    if (totalPages > 1) {
      pages.push(totalPages);
    }

    return pages;
  };

  const handlePageChange = (page: number) => {
    if (disabled || page < 1 || page > totalPages || page === currentPage) {
      return;
    }
    onPageChange(page);
  };

  const pageNumbers = generatePageNumbers();

  const sizeClasses = {
    sm: 'text-xs',
    default: 'text-sm',
    lg: 'text-base',
  };

  if (totalPages <= 1) {
    return null;
  }

  return (
    <Pagination className={cn('select-none', className)}>
      <PaginationContent className={cn(sizeClasses[size])}>
        {/* First Page Button */}
        {showFirstLast && (
          <PaginationItem>
            <PaginationLink
              onClick={() => handlePageChange(1)}
              className={cn(
                'gap-1 pl-2.5 cursor-pointer',
                (disabled || currentPage === 1) && 'pointer-events-none opacity-50'
              )}
              aria-label="Go to first page"
            >
              <ChevronFirst className="h-4 w-4" />
              <span className="hidden sm:inline">First</span>
            </PaginationLink>
          </PaginationItem>
        )}

        {/* Previous Button */}
        {showPreviousNext && (
          <PaginationItem>
            <PaginationPrevious
              onClick={() => handlePageChange(currentPage - 1)}
              className={cn(
                'cursor-pointer',
                (disabled || currentPage === 1) && 'pointer-events-none opacity-50'
              )}
            />
          </PaginationItem>
        )}

        {/* Page Numbers */}
        {pageNumbers.map((page, index) => (
          <PaginationItem key={index}>
            {page === 'ellipsis' ? (
              <PaginationEllipsis />
            ) : (
              <PaginationLink
                onClick={() => handlePageChange(page)}
                isActive={page === currentPage}
                className={cn(
                  'cursor-pointer min-w-[40px]',
                  disabled && 'pointer-events-none opacity-50',
                  page === currentPage && 'bg-primary text-primary-foreground hover:bg-primary/90'
                )}
                aria-label={`Go to page ${page}`}
                aria-current={page === currentPage ? 'page' : undefined}
              >
                {page}
              </PaginationLink>
            )}
          </PaginationItem>
        ))}

        {/* Next Button */}
        {showPreviousNext && (
          <PaginationItem>
            <PaginationNext
              onClick={() => handlePageChange(currentPage + 1)}
              className={cn(
                'cursor-pointer',
                (disabled || currentPage === totalPages) && 'pointer-events-none opacity-50'
              )}
            />
          </PaginationItem>
        )}

        {/* Last Page Button */}
        {showFirstLast && (
          <PaginationItem>
            <PaginationLink
              onClick={() => handlePageChange(totalPages)}
              className={cn(
                'gap-1 pr-2.5 cursor-pointer',
                (disabled || currentPage === totalPages) && 'pointer-events-none opacity-50'
              )}
              aria-label="Go to last page"
            >
              <span className="hidden sm:inline">Last</span>
              <ChevronLast className="h-4 w-4" />
            </PaginationLink>
          </PaginationItem>
        )}
      </PaginationContent>
    </Pagination>
  );
};

export default PaginationComponent;