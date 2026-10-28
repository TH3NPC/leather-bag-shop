"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { t } from "@/i18n/en";

interface Props {
  categories: { slug: string; name: string }[];
  q: string;
  category: string;
  sort: string;
  autoFocus?: boolean;
}

const SORT_OPTIONS = [
  { value: "newest", label: t.catalog.sortNewest },
  { value: "price_asc", label: t.catalog.sortPriceAsc },
  { value: "price_desc", label: t.catalog.sortPriceDesc },
  { value: "name", label: t.catalog.sortName },
];

function buildHref(params: { q?: string; category?: string; sort?: string }) {
  const p = new URLSearchParams();
  if (params.q) p.set("q", params.q);
  if (params.category) p.set("category", params.category);
  if (params.sort && params.sort !== "newest") p.set("sort", params.sort);
  const s = p.toString();
  return `/shop${s ? `?${s}` : ""}`;
}

export function CatalogControls({ categories, q, category, sort, autoFocus }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState(q);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setQuery(q), [q]);
  useEffect(() => { if (autoFocus) inputRef.current?.focus(); }, [autoFocus]);

  // Debounced live search.
  useEffect(() => {
    if (query === q) return;
    const id = setTimeout(() => startTransition(() => router.replace(buildHref({ q: query.trim(), category, sort }), { scroll: false })), 350);
    return () => clearTimeout(id);
  }, [query, q, category, sort, router]);

  return (
    <div className="mt-5 space-y-4">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          inputRef.current?.blur();
          startTransition(() => router.replace(buildHref({ q: query.trim(), category, sort })));
        }}
        className="flex gap-2"
      >
        <label className="relative flex-1">
          <span className="sr-only">{t.nav.search}</span>
          <Search size={18} strokeWidth={1.6} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          <input
            ref={inputRef}
            type="search"
            enterKeyHint="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.catalog.searchPlaceholder}
            className="field pl-10 pr-10 [&::-webkit-search-cancel-button]:hidden"
            maxLength={80}
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 size-8 grid place-items-center text-muted hover:text-ink" aria-label="Clear search">
              <X size={16} />
            </button>
          )}
        </label>
        <label className="shrink-0">
          <span className="sr-only">{t.catalog.sort}</span>
          <select
            value={sort}
            onChange={(e) => startTransition(() => router.replace(buildHref({ q: query.trim(), category, sort: e.target.value }), { scroll: false }))}
            className="field w-[118px] sm:w-auto pr-8 text-[14px]"
          >
            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
      </form>

      <nav aria-label="Categories" className={`-mx-4 px-4 md:mx-0 md:px-0 flex gap-2 overflow-x-auto no-scrollbar transition-opacity ${pending ? "opacity-60" : ""}`}>
        {[{ slug: "", name: t.catalog.all }, ...categories].map((c) => {
          const active = c.slug === category;
          return (
            <Link
              key={c.slug || "all"}
              href={buildHref({ q, category: c.slug, sort })}
              scroll={false}
              className={`shrink-0 h-9 px-4 inline-flex items-center text-[13px] border rounded-xs transition-colors ${active ? "bg-ink border-ink text-white" : "border-line-strong text-charcoal hover:border-ink"}`}
              aria-current={active ? "page" : undefined}
            >
              {c.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
