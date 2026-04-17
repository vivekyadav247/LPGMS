import { zodResolver } from "@hookform/resolvers/zod";
import { formatCurrency } from "../lib/utils";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { apiFetch } from "../lib/api";
import { stockMovementOptions, todayInputValue } from "../lib/utils";
import { stockMovementSchema } from "../validators/schemas";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";
import { Field } from "./ui/Field";
import { Input } from "./ui/Input";
import { Select } from "./ui/Select";
import { Textarea } from "./ui/Textarea";

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

function handleSignedIntegerKeyDown(event) {
  if (allowControlOrShortcut(event)) {
    return;
  }

  if (event.key === "-") {
    const { selectionStart = 0, value = "" } = event.currentTarget;
    const hasMinus = String(value).includes("-");

    if (selectionStart !== 0 || hasMinus) {
      event.preventDefault();
    }

    return;
  }

  if (!/^\d$/.test(event.key)) {
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

function sanitizeSignedIntegerInput(event) {
  const raw = event.currentTarget.value.replace(/[^\d-]/g, "");
  const isNegative = raw.startsWith("-");
  const digitsOnly = raw.replace(/-/g, "");
  event.currentTarget.value = `${isNegative ? "-" : ""}${digitsOnly}`;
}

export function StockMovementForm({ onSaved }) {
  const {
    register,
    watch,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(stockMovementSchema),
    defaultValues: {
      date: todayInputValue(),
      type: "STOCK_INWARD",
      quantity: 1,
      pricingMode: "PER_CYLINDER",
      pricePerCylinder: 0,
      totalPrice: 0,
      supplierNote: "",
      notes: "",
      deltaFilled: 0,
      deltaEmpty: 0,
      deltaIssued: 0,
    },
  });

  const type = watch("type");
  const quantity = Number(watch("quantity") || 0);
  const pricingMode = watch("pricingMode");
  const pricePerCylinder = Number(watch("pricePerCylinder") || 0);
  const totalPrice = Number(watch("totalPrice") || 0);

  const previewTotal =
    pricingMode === "PER_CYLINDER"
      ? pricePerCylinder > 0
        ? pricePerCylinder * quantity
        : 0
      : totalPrice;

  const previewPerCylinder =
    pricingMode === "TOTAL"
      ? totalPrice > 0 && quantity > 0
        ? totalPrice / quantity
        : 0
      : pricePerCylinder;

  async function onSubmit(values) {
    try {
      await apiFetch("/api/stock/movements", {
        method: "POST",
        body: JSON.stringify(values),
      });

      toast.success("Stock movement saved");
      reset({
        date: todayInputValue(),
        type,
        quantity: 1,
        pricingMode,
        pricePerCylinder: 0,
        totalPrice: 0,
        supplierNote: "",
        notes: "",
        deltaFilled: 0,
        deltaEmpty: 0,
        deltaIssued: 0,
      });
      onSaved?.();
    } catch (error) {
      toast.error(error.message);
    }
  }

  return (
    <Card>
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Date" error={errors.date?.message}>
            <Input type="date" {...register("date")} />
          </Field>
          <Field label="Movement type" error={errors.type?.message}>
            <Select {...register("type")}>
              {stockMovementOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Quantity" error={errors.quantity?.message}>
            <Input
              type="number"
              inputMode="numeric"
              {...register("quantity")}
              min="1"
              step="1"
              onKeyDown={handleUnsignedNumericKeyDown}
              onInput={sanitizeUnsignedIntegerInput}
            />
          </Field>
          <Field label="Supplier note" error={errors.supplierNote?.message}>
            <Input
              placeholder="Company refill / stock source"
              {...register("supplierNote")}
            />
          </Field>
        </div>

        {type !== "MANUAL_ADJUSTMENT" ? (
          <div className="space-y-3 rounded-3xl border border-slate-100 bg-slate-50 px-4 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Price input type"
                error={errors.pricingMode?.message}
              >
                <Select {...register("pricingMode")}>
                  <option value="PER_CYLINDER">Per cylinder</option>
                  <option value="TOTAL">Total amount</option>
                </Select>
              </Field>

              {pricingMode === "PER_CYLINDER" ? (
                <Field
                  label="Fill-up rate per cylinder"
                  error={errors.pricePerCylinder?.message}
                >
                  <Input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    placeholder="0"
                    {...register("pricePerCylinder")}
                    onKeyDown={handleUnsignedNumericKeyDown}
                    onInput={sanitizeUnsignedDecimalInput}
                  />
                </Field>
              ) : (
                <Field
                  label="Total fill-up amount"
                  error={errors.totalPrice?.message}
                >
                  <Input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    placeholder="0"
                    {...register("totalPrice")}
                    onKeyDown={handleUnsignedNumericKeyDown}
                    onInput={sanitizeUnsignedDecimalInput}
                  />
                </Field>
              )}
            </div>

            <p className="text-xs text-slate-500">
              Cost preview: {formatCurrency(previewTotal)} total |{" "}
              {formatCurrency(previewPerCylinder)} per cylinder
            </p>
          </div>
        ) : null}

        {type === "MANUAL_ADJUSTMENT" ? (
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Filled delta" error={errors.deltaFilled?.message}>
              <Input
                type="number"
                inputMode="numeric"
                {...register("deltaFilled")}
                step="1"
                onKeyDown={handleSignedIntegerKeyDown}
                onInput={sanitizeSignedIntegerInput}
              />
            </Field>
            <Field label="Empty delta" error={errors.deltaEmpty?.message}>
              <Input
                type="number"
                inputMode="numeric"
                {...register("deltaEmpty")}
                step="1"
                onKeyDown={handleSignedIntegerKeyDown}
                onInput={sanitizeSignedIntegerInput}
              />
            </Field>
            <Field label="Issued delta" error={errors.deltaIssued?.message}>
              <Input
                type="number"
                inputMode="numeric"
                {...register("deltaIssued")}
                step="1"
                onKeyDown={handleSignedIntegerKeyDown}
                onInput={sanitizeSignedIntegerInput}
              />
            </Field>
          </div>
        ) : null}

        <Field label="Notes" error={errors.notes?.message}>
          <Textarea placeholder="Optional explanation" {...register("notes")} />
        </Field>

        <Button
          type="submit"
          className="w-full sm:w-auto"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Saving..." : "Save stock movement"}
        </Button>
      </form>
    </Card>
  );
}
