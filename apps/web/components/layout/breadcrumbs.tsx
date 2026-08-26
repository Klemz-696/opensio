import React from 'react';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav aria-label="Fil d'Ariane" className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-6 flex-wrap">
      <Link
        href="/catalogue"
        className="flex items-center gap-1 hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
      >
        <Home className="w-3.5 h-3.5" />
        <span>Catalogue</span>
      </Link>

      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <React.Fragment key={`${item.label}-${index}`}>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-600 shrink-0" />
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="hover:text-sky-600 dark:hover:text-sky-400 transition-colors font-medium text-slate-600 dark:text-slate-400"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-slate-900 dark:text-slate-200 font-semibold truncate max-w-[240px] sm:max-w-xs md:max-w-none">
                {item.label}
              </span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
