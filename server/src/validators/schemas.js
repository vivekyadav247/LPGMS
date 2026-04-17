const { z } = require("zod");
const { ENTRY_TYPES, PAYMENT_MODES } = require("../utils/transactionUtils");

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

const loginSchema = z.object({
  identifier: z.string().trim().min(3, "Enter your ID").max(120),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(200),
  remember: z.boolean().optional().default(true),
});

const customerSchema = z.object({
  name: z.string().trim().min(2, "Customer name is required").max(120),
  phone: z
    .string()
    .trim()
    .regex(/^\d{10}$/, "Mobile number must be exactly 10 digits"),
  address: z.string().trim().max(300).optional().default(""),
  customerType: z.enum(["HOTEL", "HOME", "RESTAURANT", "BULK"]),
});

const transactionSchema = z
  .object({
    customerId: z.string().regex(objectIdPattern, "Invalid customer"),
    date: z.coerce.date(),
    entryType: z.enum(ENTRY_TYPES),
    emptyReturned: z.coerce.number().int().min(0).max(1000),
    filledDelivered: z.coerce.number().int().min(0).max(1000),
    rate: z.coerce.number().min(0).max(100000),
    paymentMode: z
      .union([z.enum(PAYMENT_MODES), z.null(), z.literal("")])
      .optional()
      .transform((value) => value || null),
    paidAmount: z.coerce.number().min(0).max(10000000),
    notes: z.string().trim().max(300).optional().default(""),
  })
  .superRefine((value, ctx) => {
    if (value.entryType === "DELIVERY") {
      if (value.filledDelivered <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Delivery entry needs filled cylinders",
          path: ["filledDelivered"],
        });
      }

      if (value.rate <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Rate is required when cylinders are delivered",
          path: ["rate"],
        });
      }

      if (value.paidAmount > 0 && !value.paymentMode) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Choose payment mode when collection is added",
          path: ["paymentMode"],
        });
      }

      if (value.paidAmount === 0 && value.paymentMode) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Payment mode is only needed when payment is collected",
          path: ["paymentMode"],
        });
      }
    }

    if (value.entryType === "RETURN") {
      if (value.emptyReturned <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Return entry needs empty cylinders",
          path: ["emptyReturned"],
        });
      }

      if (value.filledDelivered !== 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Return entry cannot include filled delivery",
          path: ["filledDelivered"],
        });
      }

      if (value.rate !== 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Return entry does not need a rate",
          path: ["rate"],
        });
      }

      if (value.paidAmount !== 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Return entry cannot include payment collection",
          path: ["paidAmount"],
        });
      }

      if (value.paymentMode) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Return entry does not need payment mode",
          path: ["paymentMode"],
        });
      }
    }

    if (value.entryType === "SETTLEMENT") {
      if (value.paidAmount <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Settlement entry needs paid amount",
          path: ["paidAmount"],
        });
      }

      if (!value.paymentMode) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Choose payment mode for settlement",
          path: ["paymentMode"],
        });
      }

      if (value.filledDelivered !== 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Settlement entry cannot include filled delivery",
          path: ["filledDelivered"],
        });
      }

      if (value.emptyReturned !== 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Settlement entry cannot include empty return",
          path: ["emptyReturned"],
        });
      }

      if (value.rate !== 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Settlement entry does not need rate",
          path: ["rate"],
        });
      }
    }
  });

const stockMovementSchema = z
  .object({
    date: z.coerce.date(),
    type: z.enum(["STOCK_INWARD", "REFILL_CONVERSION", "MANUAL_ADJUSTMENT"]),
    quantity: z.coerce.number().int().positive().max(10000),
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
        message: "Manual adjustment needs at least one stock delta",
        path: ["deltaFilled"],
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
          message: "Add per-cylinder fill-up price",
          path: ["pricePerCylinder"],
        });
      }

      if (value.pricingMode === "TOTAL" && !hasTotalPrice) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Add total fill-up amount",
          path: ["totalPrice"],
        });
      }
    }
  });

module.exports = {
  loginSchema,
  customerSchema,
  transactionSchema,
  stockMovementSchema,
};
