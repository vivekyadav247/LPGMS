import clsx from "clsx";
import { format } from "date-fns";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value = 0) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export function formatNumber(value = 0) {
  return new Intl.NumberFormat("en-IN").format(Number(value || 0));
}

export function formatDate(value) {
  if (!value) {
    return "-";
  }

  return format(new Date(value), "dd MMM yyyy");
}

export function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  return format(new Date(value), "dd MMM yyyy, hh:mm a");
}

export function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

export const customerTypeOptions = [
  { value: "HOTEL", label: "Hotel" },
  { value: "RESTAURANT", label: "Restaurant / Sweet shop" },
  { value: "HOME", label: "Home" },
  { value: "BULK", label: "Bulk commercial" },
];

export const entryTypeOptions = [
  { value: "DELIVERY", label: "Filled delivery" },
  { value: "RETURN", label: "Empty return" },
  { value: "SETTLEMENT", label: "Udhari settlement" },
];

export const paymentModeOptions = [
  { value: "CASH", label: "Cash" },
  { value: "ONLINE", label: "Online" },
  { value: "UPI", label: "UPI" },
];

const entryTypeLabels = {
  DELIVERY: "Filled delivery",
  RETURN: "Empty return",
  SETTLEMENT: "Udhari settlement",
};

const paymentModeLabels = {
  CASH: "Cash",
  ONLINE: "Online",
  UPI: "UPI",
};

export function getTransactionEntryType(transaction = {}) {
  if (transaction.entryType) {
    return transaction.entryType;
  }

  if (Number(transaction.filledDelivered || 0) > 0) {
    return "DELIVERY";
  }

  if (Number(transaction.emptyReturned || 0) > 0) {
    return "RETURN";
  }

  return "SETTLEMENT";
}

export function getEntryTypeLabel(value) {
  const entryType =
    typeof value === "string" ? value : getTransactionEntryType(value);

  return entryTypeLabels[entryType] || "Entry";
}

export function getPaymentModeLabel(mode) {
  return paymentModeLabels[mode] || "-";
}

export function getPaymentStatusLabel(transaction = {}) {
  const entryType = getTransactionEntryType(transaction);
  const paidAmount = Number(transaction.paidAmount || 0);
  const totalAmount = Number(transaction.totalAmount || 0);

  if (entryType === "RETURN") {
    return "No payment";
  }

  if (entryType === "SETTLEMENT") {
    return paidAmount > 0 ? "Settlement" : "No payment";
  }

  if (paidAmount <= 0) {
    return "Credit";
  }

  if (transaction.paymentType === "PARTIAL" || paidAmount < totalAmount) {
    return "Partial";
  }

  return "Paid";
}

export const stockMovementOptions = [
  { value: "STOCK_INWARD", label: "Filled stock inward" },
  { value: "REFILL_CONVERSION", label: "Refill conversion" },
  { value: "MANUAL_ADJUSTMENT", label: "Manual adjustment" },
];
