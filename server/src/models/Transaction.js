const mongoose = require("mongoose");
const {
  ENTRY_TYPES,
  PAYMENT_MODES,
  PAYMENT_TYPES,
} = require("../utils/transactionUtils");

const transactionSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    entryType: {
      type: String,
      enum: ENTRY_TYPES,
      required: true,
      default: "DELIVERY",
    },
    emptyReturned: {
      type: Number,
      default: 0,
      min: 0,
      max: 1000,
    },
    filledDelivered: {
      type: Number,
      default: 0,
      min: 0,
      max: 1000,
    },
    previousPending: {
      type: Number,
      default: 0,
      min: 0,
    },
    currentPending: {
      type: Number,
      default: 0,
      min: 0,
    },
    previousCreditBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
    currentCreditBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
    rate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100000,
    },
    totalAmount: {
      type: Number,
      default: 0,
      min: 0,
      max: 100000000,
    },
    paymentType: {
      type: String,
      enum: PAYMENT_TYPES,
      default: null,
    },
    paymentMode: {
      type: String,
      enum: PAYMENT_MODES,
      default: null,
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
      max: 100000000,
    },
    notes: {
      type: String,
      trim: true,
      default: "",
      maxlength: 300,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

transactionSchema.index({ customerId: 1, date: 1, createdAt: 1 });

module.exports =
  mongoose.models.Transaction || mongoose.model("Transaction", transactionSchema);
