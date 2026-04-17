import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { apiFetch } from "../lib/api";
import { customerTypeOptions } from "../lib/utils";
import { customerSchema } from "../validators/schemas";
import { Button } from "./ui/Button";
import { Field } from "./ui/Field";
import { Input } from "./ui/Input";
import { Modal } from "./ui/Modal";
import { Select } from "./ui/Select";
import { Textarea } from "./ui/Textarea";

const defaultValues = {
  name: "",
  phone: "",
  address: "",
  customerType: "HOME",
};

export function CustomerFormModal({
  open,
  onClose,
  onCreated,
  onSaved,
  customer = null,
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm({
    resolver: zodResolver(customerSchema),
    defaultValues,
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    if (customer) {
      reset({
        name: customer.name || "",
        phone: customer.phone || "",
        address: customer.address || "",
        customerType: customer.customerType || "HOME",
      });
      return;
    }

    reset(defaultValues);
  }, [customer, open, reset]);

  async function onSubmit(values) {
    try {
      const response = await apiFetch(
        customer ? `/api/customers/${customer._id}` : "/api/customers",
        {
          method: customer ? "PUT" : "POST",
          body: JSON.stringify(values),
        },
      );

      toast.success(customer ? "Customer updated" : "Customer added");

      if (customer) {
        onSaved?.(response.customer);
      } else {
        onCreated?.(response.customer);
      }

      reset(defaultValues);
      onClose();
    } catch (error) {
      toast.error(error.message);
    }
  }

  return (
    <Modal
      open={open}
      title={customer ? "Edit customer" : "Add customer"}
      description={
        customer
          ? "Update customer details and keep ledger records consistent."
          : "Create a new ledger party without leaving the entry screen."
      }
      onClose={onClose}
    >
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <Field label="Customer name" error={errors.name?.message}>
          <Input placeholder="Vallabha Sweets" {...register("name")} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Mobile number" error={errors.phone?.message}>
            <Input
              placeholder="10-digit mobile"
              inputMode="tel"
              maxLength={10}
              onInput={(event) => {
                event.currentTarget.value = event.currentTarget.value
                  .replace(/\D/g, "")
                  .slice(0, 10);
              }}
              {...register("phone")}
            />
          </Field>

          <Field label="Customer type" error={errors.customerType?.message}>
            <Select {...register("customerType")}>
              {customerTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Address" error={errors.address?.message}>
          <Textarea placeholder="Area / landmark" {...register("address")} />
        </Field>

        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? "Saving..."
              : customer
                ? "Update customer"
                : "Save customer"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
