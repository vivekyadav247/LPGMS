import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { apiFetch } from "../lib/api";
import {
  customerTypeOptions,
  entryTypeOptions,
  formatCurrency,
  formatNumber,
  todayInputValue,
  getTransactionEntryType,
} from "../lib/utils";
import { transactionSchema } from "../validators/schemas";
import { CustomerCombobox } from "./CustomerCombobox";
import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";
import { Field } from "./ui/Field";
import { Input } from "./ui/Input";
import { Select } from "./ui/Select";
import { Textarea } from "./ui/Textarea";

const draftKey = "lpgms_transaction_draft";

function createBaseDefaultValues() {
  return {
    customerId: "",
    date: todayInputValue(),
    entryType: "DELIVERY",
    emptyReturned: 0,
    filledDelivered: 0,
    rate: 0,
    paymentMode: "",
    paidAmount: 0,
    notes: "",
  };
}

const entryMeta = {
  DELIVERY: {
    title: "Filled delivery",
    description:
      "Bhari tanki do, optional empty return lo, aur zarurat ho to payment bhi collect karo.",
    submitLabel: "Save delivery",
  },
  RETURN: {
    title: "Empty return",
    description:
      "Sirf khali tanki wapas aayi hai. Is entry me bill ya payment nahi banega.",
    submitLabel: "Save return",
  },
  SETTLEMENT: {
    title: "Udhari settlement",
    description:
      "Purana outstanding amount receive hua hai. Is entry me stock movement nahi hoga.",
    submitLabel: "Save settlement",
  },
};

const allowedControlKeys = new Set([
  "Backspace",
  "Delete",
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Tab",
  "Home",
  "End",
  "Enter",
]);

function allowControlOrShortcut(event) {
  return allowedControlKeys.has(event.key) || event.ctrlKey || event.metaKey;
}

function handleUnsignedNumericKeyDown(event) {
  if (allowControlOrShortcut(event)) {
    return;
  }

  if (["e", "E", "+", "-"].includes(event.key)) {
    event.preventDefault();
  }
}

function sanitizeUnsignedIntegerInput(event) {
  event.currentTarget.value = event.currentTarget.value.replace(/\D/g, "");
}

function sanitizeUnsignedDecimalInput(event) {
  const cleaned = event.currentTarget.value.replace(/[^\d.]/g, "");
  const [integerPart, ...decimalParts] = cleaned.split(".");
  event.currentTarget.value =
    decimalParts.length > 0
      ? `${integerPart}.${decimalParts.join("")}`
      : integerPart;
}

function readDraft() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const draft = window.localStorage.getItem(draftKey);
    return draft ? JSON.parse(draft) : null;
  } catch {
    return null;
  }
}

function getDefaultValues(transaction) {
  const baseDefaultValues = createBaseDefaultValues();

  if (transaction) {
    return {
      ...baseDefaultValues,
      customerId: String(
        transaction.customerId?._id || transaction.customerId || "",
      ),
      date: String(transaction.date).slice(0, 10),
      entryType: getTransactionEntryType(transaction),
      emptyReturned: Number(transaction.emptyReturned || 0),
      filledDelivered: Number(transaction.filledDelivered || 0),
      rate: Number(transaction.rate || 0),
      paymentMode: transaction.paymentMode || "",
      paidAmount: Number(transaction.paidAmount || 0),
      notes: transaction.notes || "",
    };
  }

  const draft = readDraft();

  if (draft) {
    return {
      ...baseDefaultValues,
      ...draft,
      date: todayInputValue(),
      entryType: draft.entryType || "DELIVERY",
      paymentMode: draft.paymentMode || "",
    };
  }

  return baseDefaultValues;
}

function buildPayload(values) {
  const entryType = values.entryType;
  const filledDelivered =
    entryType === "DELIVERY" ? Number(values.filledDelivered || 0) : 0;
  const emptyReturned =
    entryType === "DELIVERY" || entryType === "RETURN"
      ? Number(values.emptyReturned || 0)
      : 0;
  const rate = entryType === "DELIVERY" ? Number(values.rate || 0) : 0;
  const paidAmount =
    entryType === "DELIVERY" || entryType === "SETTLEMENT"
      ? Number(values.paidAmount || 0)
      : 0;

  return {
    customerId: values.customerId,
    date: values.date,
    entryType,
    emptyReturned,
    filledDelivered,
    rate,
    paymentMode: paidAmount > 0 ? values.paymentMode || null : null,
    paidAmount,
    notes: values.notes || "",
  };
}

export function TransactionForm({
  customers,
  transaction,
  onSaved,
  onCancel,
  onAddCustomer,
}) {
  const [stockSummary, setStockSummary] = useState(null);
  const [stockError, setStockError] = useState("");
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(transactionSchema),
    defaultValues: getDefaultValues(transaction),
  });

  const values = watch();
  const selectedCustomer = customers.find(
    (customer) => String(customer._id) === String(values.customerId),
  );
  const entryType = values.entryType;
  const meta = entryMeta[entryType];

  async function loadStockSummary() {
    try {
      const response = await apiFetch("/api/stock/summary");
      setStockSummary(response.summary);
      setStockError("");
    } catch (error) {
      setStockError(error.message);
    }
  }

  useEffect(() => {
    loadStockSummary();
  }, []);

  useEffect(() => {
    if (!transaction && typeof window !== "undefined") {
      window.localStorage.setItem(draftKey, JSON.stringify(values));
    }
  }, [transaction, values]);

  useEffect(() => {
    if (
      !transaction &&
      entryType === "DELIVERY" &&
      selectedCustomer?.lastRate &&
      Number(values.rate) === 0
    ) {
      setValue("rate", Number(selectedCustomer.lastRate));
    }
  }, [
    transaction,
    entryType,
    selectedCustomer?.lastRate,
    values.rate,
    setValue,
  ]);

  useEffect(() => {
    if (entryType === "RETURN") {
      if (Number(values.filledDelivered) !== 0) {
        setValue("filledDelivered", 0, { shouldValidate: true });
      }

      if (Number(values.rate) !== 0) {
        setValue("rate", 0, { shouldValidate: true });
      }

      if (Number(values.paidAmount) !== 0) {
        setValue("paidAmount", 0, { shouldValidate: true });
      }

      if (values.paymentMode) {
        setValue("paymentMode", "", { shouldValidate: true });
      }
    }

    if (entryType === "SETTLEMENT") {
      if (Number(values.filledDelivered) !== 0) {
        setValue("filledDelivered", 0, { shouldValidate: true });
      }

      if (Number(values.emptyReturned) !== 0) {
        setValue("emptyReturned", 0, { shouldValidate: true });
      }

      if (Number(values.rate) !== 0) {
        setValue("rate", 0, { shouldValidate: true });
      }
    }
  }, [
    entryType,
    values.emptyReturned,
    values.filledDelivered,
    values.paidAmount,
    values.paymentMode,
    values.rate,
    setValue,
  ]);

  useEffect(() => {
    if (
      entryType === "DELIVERY" &&
      Number(values.paidAmount || 0) === 0 &&
      values.paymentMode
    ) {
      setValue("paymentMode", "", { shouldValidate: true });
    }
  }, [entryType, values.paidAmount, values.paymentMode, setValue]);

  const preview = useMemo(() => {
    const oldPending = Number(selectedCustomer?.currentPendingCylinders || 0);
    const oldCredit = Number(selectedCustomer?.totalCreditBalance || 0);
    const filled = Number(values.filledDelivered || 0);
    const returned = Number(values.emptyReturned || 0);
    const rate = Number(values.rate || 0);
    const paidAmount = Number(values.paidAmount || 0);
    const totalAmount = entryType === "DELIVERY" ? filled * rate : 0;
    const availableFilledStock =
      stockSummary?.filledStock === undefined
        ? null
        : Number(stockSummary.filledStock || 0) +
          Number(transaction?.filledDelivered || 0);

    return {
      oldPending,
      newPending: oldPending + filled - returned,
      oldCredit,
      newCredit: oldCredit + totalAmount - paidAmount,
      totalAmount,
      paidAmount,
      availableFilledStock,
      filledStockAfterSave:
        availableFilledStock === null ? null : availableFilledStock - filled,
    };
  }, [
    entryType,
    selectedCustomer,
    stockSummary,
    transaction?.filledDelivered,
    values,
  ]);

  const showPaymentMode =
    entryType === "SETTLEMENT" || Number(values.paidAmount || 0) > 0;
  const stockExceeded =
    entryType === "DELIVERY" &&
    preview.availableFilledStock !== null &&
    Number(values.filledDelivered || 0) > preview.availableFilledStock;
  const pendingWouldGoNegative = preview.newPending < 0;
  const creditWouldGoNegative = preview.newCredit < 0;
  const submitDisabled =
    isSubmitting ||
    stockExceeded ||
    pendingWouldGoNegative ||
    creditWouldGoNegative;

  async function onSubmit(formValues) {
    try {
      const endpoint = transaction
        ? `/api/transactions/${transaction._id}`
        : "/api/transactions";
      const method = transaction ? "PUT" : "POST";
      const response = await apiFetch(endpoint, {
        method,
        body: JSON.stringify(buildPayload(formValues)),
      });

      if (!transaction && typeof window !== "undefined") {
        window.localStorage.removeItem(draftKey);
        reset(createBaseDefaultValues());
      }

      await Promise.all([
        loadStockSummary(),
        Promise.resolve(onSaved?.(response.transaction)),
      ]);

      toast.success(transaction ? "Entry updated" : "Entry saved");
    } catch (error) {
      toast.error(error.message);
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
      <Card className="p-4 sm:p-5">
        <div className="grid gap-4">
          <Field label="Entry type" hint="Jo kaam hua hai wahi select karo">
            <div className="grid gap-2 sm:grid-cols-3">
              {entryTypeOptions.map((option) => (
                <Button
                  key={option.value}
                  variant={entryType === option.value ? "primary" : "secondary"}
                  className="justify-start"
                  onClick={() =>
                    setValue("entryType", option.value, {
                      shouldValidate: true,
                    })
                  }
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </Field>

          <div className="rounded-[1.5rem] bg-slate-50 px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-ink">{meta.title}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {meta.description}
                </p>
              </div>
              <Badge
                tone={
                  entryType === "DELIVERY"
                    ? "success"
                    : entryType === "RETURN"
                      ? "warn"
                      : "default"
                }
              >
                {meta.submitLabel}
              </Badge>
            </div>
          </div>

          <Field
            label="Customer"
            hint="Search or add new"
            error={errors.customerId?.message}
          >
            <CustomerCombobox
              customers={customers}
              value={values.customerId}
              onChange={(customerId) =>
                setValue("customerId", customerId, { shouldValidate: true })
              }
              onAddCustomer={onAddCustomer}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Date" error={errors.date?.message}>
              <Input type="date" {...register("date")} />
            </Field>

            <Field label="Customer type">
              <Select value={selectedCustomer?.customerType || ""} disabled>
                <option value="">
                  {selectedCustomer
                    ? customerTypeOptions.find(
                        (item) => item.value === selectedCustomer.customerType,
                      )?.label
                    : "Select customer first"}
                </option>
              </Select>
            </Field>
          </div>
        </div>
      </Card>

      <Card className="p-4 sm:p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {entryType === "DELIVERY" ? (
            <>
              <Field
                label="Filled delivered"
                hint="Bhari tanki di"
                error={errors.filledDelivered?.message}
              >
                <Input
                  type="number"
                  inputMode="numeric"
                  {...register("filledDelivered")}
                  min="0"
                  step="1"
                  onKeyDown={handleUnsignedNumericKeyDown}
                  onInput={sanitizeUnsignedIntegerInput}
                />
              </Field>

              <Field
                label="Empty returned"
                hint="Aaj kitni khali wapas aayi"
                error={errors.emptyReturned?.message}
              >
                <Input
                  type="number"
                  inputMode="numeric"
                  {...register("emptyReturned")}
                  min="0"
                  step="1"
                  onKeyDown={handleUnsignedNumericKeyDown}
                  onInput={sanitizeUnsignedIntegerInput}
                />
              </Field>

              <Field
                label="Rate / cylinder"
                hint="Aaj ka sale rate"
                error={errors.rate?.message}
              >
                <Input
                  type="number"
                  inputMode="decimal"
                  {...register("rate")}
                  min="0"
                  step="0.01"
                  onKeyDown={handleUnsignedNumericKeyDown}
                  onInput={sanitizeUnsignedDecimalInput}
                />
              </Field>

              <Field
                label="Collection received"
                hint="0 rakho to pure credit pe jayega"
                error={errors.paidAmount?.message}
              >
                <Input
                  type="number"
                  inputMode="decimal"
                  {...register("paidAmount")}
                  min="0"
                  step="0.01"
                  onKeyDown={handleUnsignedNumericKeyDown}
                  onInput={sanitizeUnsignedDecimalInput}
                />
              </Field>
            </>
          ) : null}

          {entryType === "RETURN" ? (
            <Field
              label="Empty returned"
              hint="Sirf khali tanki entry"
              error={errors.emptyReturned?.message}
            >
              <Input
                type="number"
                inputMode="numeric"
                {...register("emptyReturned")}
                min="0"
                step="1"
                onKeyDown={handleUnsignedNumericKeyDown}
                onInput={sanitizeUnsignedIntegerInput}
              />
            </Field>
          ) : null}

          {entryType === "SETTLEMENT" ? (
            <>
              <Field
                label="Settlement amount"
                hint="Customer ne kitna outstanding diya"
                error={errors.paidAmount?.message}
              >
                <Input
                  type="number"
                  inputMode="decimal"
                  {...register("paidAmount")}
                  min="0"
                  step="0.01"
                  onKeyDown={handleUnsignedNumericKeyDown}
                  onInput={sanitizeUnsignedDecimalInput}
                />
              </Field>

              <Field label="Payment mode" error={errors.paymentMode?.message}>
                <Select {...register("paymentMode")}>
                  <option value="">Select mode</option>
                  <option value="CASH">Cash</option>
                  <option value="ONLINE">Online</option>
                  <option value="UPI">UPI</option>
                </Select>
              </Field>
            </>
          ) : null}
        </div>

        {showPaymentMode && entryType !== "SETTLEMENT" ? (
          <div className="mt-4 max-w-sm">
            <Field label="Payment mode" error={errors.paymentMode?.message}>
              <Select {...register("paymentMode")}>
                <option value="">Select mode</option>
                <option value="CASH">Cash</option>
                <option value="ONLINE">Online</option>
                <option value="UPI">UPI</option>
              </Select>
            </Field>
          </div>
        ) : null}

        <Field
          label="Notes"
          hint="Driver note / reminder / settlement detail"
          error={errors.notes?.message}
        >
          <Textarea placeholder="Optional note" {...register("notes")} />
        </Field>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="bg-emerald-50">
          <p className="text-sm font-medium text-slate-500">Old pending</p>
          <p className="mt-2 text-3xl font-bold text-ink">
            {preview.oldPending}
          </p>
        </Card>

        <Card
          className={preview.newPending > 0 ? "bg-amber-50" : "bg-emerald-50"}
        >
          <p className="text-sm font-medium text-slate-500">New pending</p>
          <p className="mt-2 text-3xl font-bold text-ink">
            {preview.newPending}
          </p>
        </Card>

        <Card className="bg-sky-50">
          <p className="text-sm font-medium text-slate-500">
            Outstanding after save
          </p>
          <p className="mt-2 text-3xl font-bold text-ink">
            {formatCurrency(preview.newCredit)}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Current outstanding: {formatCurrency(preview.oldCredit)}
          </p>
        </Card>

        <Card className="bg-white">
          <p className="text-sm font-medium text-slate-500">
            {entryType === "SETTLEMENT" ? "Settlement received" : "Bill amount"}
          </p>
          <p className="mt-2 text-3xl font-bold text-ink">
            {formatCurrency(
              entryType === "SETTLEMENT"
                ? preview.paidAmount
                : preview.totalAmount,
            )}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Filled stock available:{" "}
            {preview.availableFilledStock === null
              ? "Live stock unavailable"
              : formatNumber(preview.availableFilledStock)}
          </p>
        </Card>
      </div>

      {preview.availableFilledStock !== null ? (
        <Card className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-ink">Live stock check</p>
              <p className="mt-1 text-sm text-slate-500">
                Filled available now:{" "}
                {formatNumber(preview.availableFilledStock)}
              </p>
            </div>
            <Badge tone={stockExceeded ? "danger" : "success"}>
              {entryType === "DELIVERY"
                ? `After save ${formatNumber(preview.filledStockAfterSave || 0)} left`
                : "No delivery stock used"}
            </Badge>
          </div>
        </Card>
      ) : null}

      {stockError ? (
        <Card className="border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 text-amber-600" size={18} />
            <div>
              <p className="font-semibold text-ink">Live stock unavailable</p>
              <p className="mt-1 text-sm text-slate-600">
                Stock preview load nahi hua. Save par backend fir bhi final
                stock check karega.
              </p>
            </div>
          </div>
        </Card>
      ) : null}

      {stockExceeded ? (
        <Card className="border-rose-200 bg-rose-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 text-rose-600" size={18} />
            <div>
              <p className="font-semibold text-ink">Delivery blocked</p>
              <p className="mt-1 text-sm text-slate-600">
                Itna filled stock available nahi hai. Abhi stock me sirf{" "}
                {formatNumber(preview.availableFilledStock)} bhari tanki hai.
              </p>
            </div>
          </div>
        </Card>
      ) : null}

      {pendingWouldGoNegative ? (
        <Card className="border-rose-200 bg-rose-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 text-rose-600" size={18} />
            <div>
              <p className="font-semibold text-ink">Return blocked</p>
              <p className="mt-1 text-sm text-slate-600">
                Customer ke paas itni outstanding tanki nahi hai. Empty return
                current pending se zyada ho raha hai.
              </p>
            </div>
          </div>
        </Card>
      ) : null}

      {creditWouldGoNegative ? (
        <Card className="border-rose-200 bg-rose-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 text-rose-600" size={18} />
            <div>
              <p className="font-semibold text-ink">Settlement too high</p>
              <p className="mt-1 text-sm text-slate-600">
                Paid amount customer ke current outstanding se zyada ho raha
                hai.
              </p>
            </div>
          </div>
        </Card>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        {onCancel ? (
          <Button variant="secondary" size="lg" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
        <Button
          type="submit"
          size="lg"
          className="sm:min-w-44"
          disabled={submitDisabled}
        >
          {isSubmitting
            ? "Saving..."
            : transaction
              ? `Update ${meta.title.toLowerCase()}`
              : meta.submitLabel}
        </Button>
      </div>
    </form>
  );
}
