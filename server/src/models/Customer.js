const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 10,
      match: [/^\d{10}$/, "Phone must be exactly 10 digits"],
    },
    address: {
      type: String,
      trim: true,
      default: "",
      maxlength: 300,
    },
    customerType: {
      type: String,
      enum: ["HOTEL", "HOME", "RESTAURANT", "BULK"],
      required: true,
    },
    currentPendingCylinders: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalCreditBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastRate: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastDeliveryDate: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

customerSchema.index({ name: 1 });
customerSchema.index({ phone: 1 });

module.exports =
  mongoose.models.Customer || mongoose.model("Customer", customerSchema);
