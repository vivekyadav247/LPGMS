const ENTRY_TYPES = ["DELIVERY", "RETURN", "SETTLEMENT"];
const PAYMENT_TYPES = ["CREDIT", "DEBIT", "PARTIAL"];
const PAYMENT_MODES = ["CASH", "ONLINE", "UPI"];

function deriveTransactionEntryType(input = {}) {
  if (ENTRY_TYPES.includes(input.entryType)) {
    return input.entryType;
  }

  if (Number(input.filledDelivered || 0) > 0) {
    return "DELIVERY";
  }

  if (Number(input.emptyReturned || 0) > 0) {
    return "RETURN";
  }

  return "SETTLEMENT";
}

function derivePaymentType({ entryType, totalAmount = 0, paidAmount = 0 }) {
  const safeEntryType = deriveTransactionEntryType({ entryType });
  const safeTotalAmount = Number(totalAmount || 0);
  const safePaidAmount = Number(paidAmount || 0);

  if (safeEntryType === "RETURN") {
    return null;
  }

  if (safePaidAmount <= 0) {
    return safeTotalAmount > 0 ? "CREDIT" : null;
  }

  if (safeTotalAmount === 0 || safePaidAmount >= safeTotalAmount) {
    return "DEBIT";
  }

  return "PARTIAL";
}

function normalizeTransactionInput(input = {}) {
  const entryType = deriveTransactionEntryType(input);
  const filledDelivered =
    entryType === "DELIVERY" ? Number(input.filledDelivered || 0) : 0;
  const emptyReturned =
    entryType === "DELIVERY" || entryType === "RETURN"
      ? Number(input.emptyReturned || 0)
      : 0;
  const rate = entryType === "DELIVERY" ? Number(input.rate || 0) : 0;
  const totalAmount = entryType === "DELIVERY" ? filledDelivered * rate : 0;
  const paidAmount =
    entryType === "DELIVERY" || entryType === "SETTLEMENT"
      ? Number(input.paidAmount || 0)
      : 0;
  const paymentMode = paidAmount > 0 ? input.paymentMode : null;

  return {
    entryType,
    emptyReturned,
    filledDelivered,
    rate,
    totalAmount,
    paymentType: derivePaymentType({
      entryType,
      totalAmount,
      paidAmount,
    }),
    paymentMode,
    paidAmount,
    notes: input.notes || "",
  };
}

function hasStockMovement(transaction = {}) {
  return (
    Number(transaction.filledDelivered || 0) > 0 ||
    Number(transaction.emptyReturned || 0) > 0
  );
}

module.exports = {
  ENTRY_TYPES,
  PAYMENT_MODES,
  PAYMENT_TYPES,
  derivePaymentType,
  deriveTransactionEntryType,
  hasStockMovement,
  normalizeTransactionInput,
};
