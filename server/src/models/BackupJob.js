const mongoose = require("mongoose");

const backupJobSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["TRANSACTION", "STOCK"],
      required: true,
    },
    action: {
      type: String,
      enum: ["CREATE", "UPDATE", "DELETE"],
      required: true,
    },
    entityId: {
      type: String,
      required: true,
      index: true,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "SYNCED", "FAILED"],
      default: "PENDING",
      index: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    lastError: {
      type: String,
      default: "",
    },
    lastAttemptAt: {
      type: Date,
      default: null,
    },
    syncedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

module.exports =
  mongoose.models.BackupJob || mongoose.model("BackupJob", backupJobSchema);
