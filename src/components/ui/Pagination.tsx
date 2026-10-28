import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function Pagination({ page, pageCount, hrefFor }: { page: number; pageCount: number; hrefFor: (page: number) => string }) {
  if (pageCount <= 1) return null;
  const cls = "h-10 min-w-10 px-3 inline-flex items-center justify-center border border-line-strong text-sm rounded-xs";
  return (
    <nav className="mt-10 flex items-center justify-center gap-2" aria-label="Pagination">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className={`${cls} hover:border-ink`} aria-label="Previous page"><ChevronLeft size={16} /></Link>
      ) : (
        <span className={`${cls} opacity-40`} aria-hidden><ChevronLeft size={16} /></span>
      )}
      <span className="px-3 text-sm text-charcoal tabular-nums">Page {page} of {pageCount}</span>
      {page < pageCount ? (
        <Link href={hrefFor(page + 1)} className={`${cls} hover:border-ink`} aria-label="Next page"><ChevronRight size={16} /></Link>
      ) : (
        <span className={`${cls} opacity-40`} aria-hidden><ChevronRight size={16} /></span>
      )}
    </nav>
  );
}
