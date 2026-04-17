import { z } from "zod";

const objectIdPattern = /^[0-9a-fA-F]{24}$/;
const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

export const loginSchema = z.object({
  identifier: z.string().min(3, "Enter your ID"),
  password: z.string().min(6, "Password is too short"),
  remember: z.boolean().default(true),
});

export const customerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Customer name is required")
    .max(120, "Customer name is too long"),
  phone: z
    .string()
    .trim()
    .regex(/^\d{10}$/, "Mobile number must be exactly 10 digits"),
  address: z.string().trim().max(300).optional().default(""),
  customerType: z.enum(["HOTEL", "HOME", "RESTAURANT", "BULK"]),
});

export const transactionSchema = z
  .object({
    customerId: z.string().regex(objectIdPattern, "Select a valid customer"),
    date: z.string().regex(isoDatePattern, "Date is required"),
    entryType: z.enum(["DELIVERY", "RETURN", "SETTLEMENT"]),
    emptyReturned: z.coerce.number().int().min(0).max(1000),
    filledDelivered: z.coerce.number().int().min(0).max(1000),
    rate: z.coerce.number().min(0).max(100000),
    paymentMode: z.union([z.enum(["CASH", "ONLINE", "UPI"]), z.literal("")]),
    paidAmount: z.coerce.number().min(0).max(10000000),
    notes: z.string().trim().max(300).optional().default(""),
  })
  .superRefine((value, ctx) => {
    if (value.entryType === "DELIVERY") {
      if (value.filledDelivered <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["filledDelivered"],
          message: "Add filled cylinders for delivery",
        });
      }

      if (value.rate <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["rate"],
          message: "Rate is required when cylinders are delivered",
        });
      }

      if (value.paidAmount > 0 && !value.paymentMode) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["paymentMode"],
          message: "Choose payment mode when money is collected",
        });
      }

      if (value.paidAmount === 0 && value.paymentMode) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["paymentMode"],
          message: "Payment mode is only needed when payment is collected",
        });
      }
    }

    if (value.entryType === "RETURN") {
      if (value.emptyReturned <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["emptyReturned"],
          message: "Add empty cylinders returned",
        });
      }

      if (value.filledDelivered !== 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["filledDelivered"],
          message: "Return entry cannot include filled delivery",
        });
      }

      if (value.rate !== 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["rate"],
          message: "Return entry does not need a rate",
        });
      }

      if (value.paidAmount !== 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["paidAmount"],
          message: "Return entry cannot include payment",
        });
      }

      if (value.paymentMode) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["paymentMode"],
          message: "Return entry does not need payment mode",
        });
      }
    }

    if (value.entryType === "SETTLEMENT") {
      if (value.paidAmount <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["paidAmount"],
          message: "Add settlement amount",
        });
      }

      if (!value.paymentMode) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["paymentMode"],
          message: "Choose payment mode for settlement",
        });
      }

      if (value.filledDelivered !== 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["filledDelivered"],
          message: "Settlement entry cannot include filled delivery",
        });
      }

      if (value.emptyReturned !== 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["emptyReturned"],
          message: "Settlement entry cannot include empty return",
        });
      }

      if (value.rate !== 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["rate"],
          message: "Settlement entry does not need rate",
        });
      }
    }
  });

export const stockMovementSchema = z
  .object({
    date: z.string().regex(isoDatePattern, "Date is required"),
    type: z.enum(["STOCK_INWARD", "REFILL_CONVERSION", "MANUAL_ADJUSTMENT"]),
    quantity: z.coerce
      .number()
      .int()
      .positive("Quantity must be positive")
      .max(10000),
    pricingMode: z
      .enum(["PER_CYLINDER", "TOTAL"])
      .optional()
      .default("PER_CYLINDER"),
    pricePerCylinder: z.coerce
      .number()
      .min(0)
      .max(1000000)
      .optional()
      .default(0),
    totalPrice: z.coerce.number().min(0).max(10000000).optional().default(0),
    supplierNote: z.string().trim().max(200).optional().default(""),
    notes: z.string().trim().max(300).optional().default(""),
    deltaFilled: z.coerce
      .number()
      .int()
      .min(-10000)
      .max(10000)
      .optional()
      .default(0),
    deltaEmpty: z.coerce
      .number()
      .int()
      .min(-10000)
      .max(10000)
      .optional()
      .default(0),
    deltaIssued: z.coerce
      .number()
      .int()
      .min(-10000)
      .max(10000)
      .optional()
      .default(0),
  })
  .superRefine((value, ctx) => {
    if (
      value.type === "MANUAL_ADJUSTMENT" &&
      value.deltaFilled === 0 &&
      value.deltaEmpty === 0 &&
      value.deltaIssued === 0
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["deltaFilled"],
        message: "Add at least one stock adjustment",
      });
    }

    if (value.type !== "MANUAL_ADJUSTMENT") {
      const hasPerCylinderPrice = Number(value.pricePerCylinder || 0) > 0;
      const hasTotalPrice = Number(value.totalPrice || 0) > 0;

      if (!hasPerCylinderPrice && !hasTotalPrice) {
        return;
      }

      if (value.pricingMode === "PER_CYLINDER" && !hasPerCylinderPrice) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["pricePerCylinder"],
          message: "Add per-cylinder fill-up price",
        });
      }

      if (value.pricingMode === "TOTAL" && !hasTotalPrice) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["totalPrice"],
          message: "Add total fill-up amount",
        });
      }
    }
  });
