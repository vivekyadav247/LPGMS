const mongoose = require("mongoose");

const stockMovementSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["STOCK_INWARD", "REFILL_CONVERSION", "MANUAL_ADJUSTMENT"],
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      max: 10000,
    },
    pricingMode: {
      type: String,
      enum: ["PER_CYLINDER", "TOTAL"],
      default: "PER_CYLINDER",
    },
    pricePerCylinder: {
      type: Number,
      default: 0,
      min: 0,
      max: 1000000,
    },
    totalPrice: {
      type: Number,
      default: 0,
      min: 0,
      max: 10000000,
    },
    deltaFilled: {
      type: Number,
      default: 0,
      min: -10000,
      max: 10000,
    },
    deltaEmpty: {
      type: Number,
      default: 0,
      min: -10000,
      max: 10000,
    },
    deltaIssued: {
      type: Number,
      default: 0,
      min: -10000,
      max: 10000,
    },
    supplierNote: {
      type: String,
      trim: true,
      default: "",
      maxlength: 200,
    },
    notes: {
      type: String,
      trim: true,
      default: "",
      maxlength: 300,
    },
  },
  {
    timestamps: true,
  },
);

module.exports =
  mongoose.models.StockMovement ||
  mongoose.model("StockMovement", stockMovementSchema);
