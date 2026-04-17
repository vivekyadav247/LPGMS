const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const env = require("../config/env");
const AdminUser = require("../models/AdminUser");
const AppError = require("../utils/AppError");

function sanitizeAdmin(admin) {
  return {
    id: String(admin._id),
    loginId: admin.loginId || "",
    name: admin.name,
    email: admin.email,
    phone: admin.phone,
  };
}

function createToken(admin) {
  return jwt.sign(
    {
      sub: String(admin._id),
      name: admin.name,
    },
    env.JWT_SECRET,
    {
      expiresIn: env.JWT_EXPIRES_IN || "7d",
    },
  );
}

async function ensureAdminUser() {
  const existing = await AdminUser.findOne().lean();

  if (!env.ADMIN_PASSWORD) {
    return existing || null;
  }

  const normalizedLoginId = String(env.ADMIN_ID || "LPGADMIN")
    .trim()
    .toLowerCase();

  if (existing) {
    const needsUpdate =
      !existing.loginId ||
      existing.loginId !== normalizedLoginId ||
      existing.name !== (env.ADMIN_NAME || "LPG Admin") ||
      existing.email !== (env.ADMIN_EMAIL || "").toLowerCase() ||
      existing.phone !== (env.ADMIN_PHONE || "");

    if (!needsUpdate) {
      return existing;
    }

    await AdminUser.findByIdAndUpdate(existing._id, {
      loginId: normalizedLoginId,
      name: env.ADMIN_NAME || "LPG Admin",
      email: (env.ADMIN_EMAIL || "").toLowerCase(),
      phone: env.ADMIN_PHONE || "",
    });

    return {
      ...existing,
      loginId: normalizedLoginId,
      name: env.ADMIN_NAME || "LPG Admin",
      email: (env.ADMIN_EMAIL || "").toLowerCase(),
      phone: env.ADMIN_PHONE || "",
    };
  }

  const passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, 12);

  const admin = await AdminUser.create({
    loginId: normalizedLoginId,
    name: env.ADMIN_NAME || "LPG Admin",
    email: (env.ADMIN_EMAIL || "").toLowerCase(),
    phone: env.ADMIN_PHONE || "",
    passwordHash,
  });

  return admin.toObject();
}

async function syncAdminUserFromEnv() {
  if (!env.ADMIN_PASSWORD) {
    throw new AppError(
      "ADMIN_PASSWORD is required to seed or reset the admin account",
      400,
    );
  }

  const passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, 12);
  const update = {
    loginId: String(env.ADMIN_ID || "LPGADMIN")
      .trim()
      .toLowerCase(),
    name: env.ADMIN_NAME || "LPG Admin",
    email: (env.ADMIN_EMAIL || "").toLowerCase(),
    phone: env.ADMIN_PHONE || "",
    passwordHash,
  };

  const existing = await AdminUser.findOne();

  if (existing) {
    existing.loginId = update.loginId;
    existing.name = update.name;
    existing.email = update.email;
    existing.phone = update.phone;
    existing.passwordHash = update.passwordHash;
    await existing.save();
    return {
      mode: "updated",
      admin: sanitizeAdmin(existing),
    };
  }

  const admin = await AdminUser.create(update);
  return {
    mode: "created",
    admin: sanitizeAdmin(admin),
  };
}

async function loginAdmin({ identifier, password }) {
  await ensureAdminUser();

  const normalized = identifier.trim().toLowerCase();

  const admin = await AdminUser.findOne({
    $or: [
      { loginId: normalized },
      { email: normalized },
      { phone: identifier.trim() },
    ],
  });

  if (!admin) {
    throw new AppError("Invalid login credentials", 401);
  }

  const isValid = await bcrypt.compare(password, admin.passwordHash);

  if (!isValid) {
    if (
      env.NODE_ENV !== "production" &&
      normalized ===
        String(env.ADMIN_ID || "")
          .trim()
          .toLowerCase() &&
      password === env.ADMIN_PASSWORD
    ) {
      const passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, 12);
      admin.passwordHash = passwordHash;
      if (!admin.loginId) {
        admin.loginId = normalized;
      }
      await admin.save();

      return {
        token: createToken(admin),
        admin: sanitizeAdmin(admin),
      };
    }

    throw new AppError("Invalid login credentials", 401);
  }

  return {
    token: createToken(admin),
    admin: sanitizeAdmin(admin),
  };
}

module.exports = {
  ensureAdminUser,
  loginAdmin,
  sanitizeAdmin,
  syncAdminUserFromEnv,
};
