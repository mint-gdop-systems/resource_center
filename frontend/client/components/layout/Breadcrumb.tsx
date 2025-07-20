import React from "react";
import { ChevronRightIcon, HomeIcon } from "@heroicons/react/24/outline";
import { Link } from "react-router-dom";

interface BreadcrumbItem {
  id: string;
  name: string;
  path: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export default function Breadcrumb({ items, className = "" }: BreadcrumbProps) {
  return (
    <nav className={`flex ${className}`} aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2">
        {/* Home icon for root */}
        <li>
          <Link
            to="/dashboard"
            className="text-gray-400 hover:text-gray-500 transition-colors"
          >
            <HomeIcon className="h-4 w-4" />
            <span className="sr-only">Home</span>
          </Link>
        </li>

        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={item.id} className="flex items-center">
              <ChevronRightIcon className="h-4 w-4 text-gray-300 mx-2" />
              {isLast ? (
                <span className="text-sm font-medium text-gray-900 truncate max-w-xs">
                  {item.name}
                </span>
              ) : (
                <Link
                  to={item.path}
                  className="text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors truncate max-w-xs"
                >
                  {item.name}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
