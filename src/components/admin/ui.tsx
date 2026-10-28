import Link from "next/link";
import type { OrderStatus, PaymentStatus } from "@prisma/client";
import { ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL } from "@/lib/labels";

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-7">
      <div>
        <h1 className="display text-[32px] md:text-[40px]">{title}</h1>
        {description && <p className="mt-1.5 text-[14px] text-muted max-w-2xl">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, children, actions, className = "" }: { title?: string; children: React.ReactNode; actions?: React.ReactNode; className?: string }) {
  return (
    <section className={`bg-surface border border-line ${className}`}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3 border-b border-line">
          {title && <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-charcoal">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

/** A labeled figure. `note` explains exactly what the number includes. */
export function Stat({ label, value, note, tone }: { label: string; value: React.ReactNode; note?: React.ReactNode; tone?: "warning" | "danger" }) {
  return (
    <div className="bg-surface border border-line px-5 py-4">
      <p className="text-[12px] font-medium uppercase tracking-[0.06em] text-muted">{label}</p>
      <p className={`mt-1.5 text-[24px] leading-tight tabular-nums ${tone === "warning" ? "text-warning" : tone === "danger" ? "text-danger" : "text-ink"}`}>{value}</p>
      {note && <p className="mt-1 text-[12px] text-muted leading-snug">{note}</p>}
    </div>
  );
}

const STATUS_TONE: Record<OrderStatus, string> = {
  PENDING: "bg-warning-bg text-warning",
  CONFIRMED: "bg-sand text-ink",
  PREPARING: "bg-sand text-ink",
  READY_FOR_PICKUP: "bg-sand text-leather",
  OUT_FOR_DELIVERY: "bg-sand text-leather",
  COMPLETED: "bg-success-bg text-success",
  CANCELLED: "bg-danger-bg text-danger",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`tag whitespace-nowrap ${STATUS_TONE[status]}`}>{ORDER_STATUS_LABEL[status]}</span>;
}

const PAY_TONE: Record<PaymentStatus, string> = {
  UNPAID: "bg-warning-bg text-warning",
  PARTIALLY_PAID: "bg-warning-bg text-warning",
  PAID: "bg-success-bg text-success",
  PARTIALLY_REFUNDED: "bg-sand text-charcoal",
  REFUNDED: "bg-sand text-charcoal",
};

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  return <span className={`tag whitespace-nowrap ${PAY_TONE[status]}`}>{PAYMENT_STATUS_LABEL[status]}</span>;
}

export function Empty({ title, text, action }: { title: string; text?: string; action?: { href: string; label: string } }) {
  return (
    <div className="py-14 px-6 text-center">
      <p className="text-[15px] text-ink">{title}</p>
      {text && <p className="mt-1 text-[13px] text-muted">{text}</p>}
      {action && <Link href={action.href} className="btn btn-outline btn-sm mt-5">{action.label}</Link>}
    </div>
  );
}
