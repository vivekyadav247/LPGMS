const mongoose = require("mongoose");

const adminUserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120,
    },
    loginId: {
      type: String,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 120,
      index: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 120,
    },
    phone: {
      type: String,
      trim: true,
      maxlength: 30,
    },
    passwordHash: {
      type: String,
      required: true,
      minlength: 20,
    },
  },
  {
    timestamps: true,
  },
);

module.exports =
  mongoose.models.AdminUser || mongoose.model("AdminUser", adminUserSchema);
