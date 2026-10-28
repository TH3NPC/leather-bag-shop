import type {
  ExpenseCategory, FulfillmentType, MovementType, OrderStatus, PaymentMethod, PaymentStatus,
} from "@prisma/client";

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  PREPARING: "Preparing",
  READY_FOR_PICKUP: "Ready for pickup",
  OUT_FOR_DELIVERY: "Out for delivery",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const ORDER_STATUSES = Object.keys(ORDER_STATUS_LABEL) as OrderStatus[];

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  CASH_ON_DELIVERY: "Cash on delivery / pickup",
  BANK_TRANSFER: "Bank transfer",
  TELEBIRR: "Telebirr (manual transfer)",
  CHAPA: "Chapa",
};

export const PAYMENT_METHODS = Object.keys(PAYMENT_METHOD_LABEL) as PaymentMethod[];

/**
 * Methods a customer can choose today. Chapa needs a real gateway integration,
 * so it stays unavailable until one is implemented and tested.
 */
export const MANUAL_PAYMENT_METHODS: PaymentMethod[] = ["CASH_ON_DELIVERY", "BANK_TRANSFER", "TELEBIRR"];

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  UNPAID: "Unpaid",
  PARTIALLY_PAID: "Partially paid",
  PAID: "Paid",
  PARTIALLY_REFUNDED: "Partially refunded",
  REFUNDED: "Refunded",
};

export const FULFILLMENT_LABEL: Record<FulfillmentType, string> = {
  DELIVERY: "Delivery",
  PICKUP: "Pickup",
};

export const MOVEMENT_LABEL: Record<MovementType, string> = {
  ORDER_PLACED: "Order placed",
  ORDER_CANCELLED: "Order cancelled",
  RESTOCK: "Restock",
  CORRECTION: "Correction",
  DAMAGED: "Damaged / lost",
  INITIAL: "Initial stock",
};

export const EXPENSE_CATEGORY_LABEL: Record<ExpenseCategory, string> = {
  DELIVERY: "Delivery",
  PACKAGING: "Packaging",
  RENT: "Rent",
  SALARIES: "Salaries",
  MARKETING: "Marketing",
  UTILITIES: "Utilities",
  SUPPLIES: "Supplies",
  OTHER: "Other",
};

export const EXPENSE_CATEGORIES = Object.keys(EXPENSE_CATEGORY_LABEL) as ExpenseCategory[];
