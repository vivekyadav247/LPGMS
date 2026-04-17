const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const env = require("../config/env");
const AdminUser = require("../models/AdminUser");
const AppError = require("../utils/AppError");

function stripWrappingQuotes(value) {
  return String(value || "")
    .trim()
    .replace(/^['\"]|['\"]$/g, "");
}

function normalizeIdentifier(value) {
  return stripWrappingQuotes(value).toLowerCase();
}

function normalizePhone(value) {
  return stripWrappingQuotes(value);
}

function getEnvAdminPassword() {
  return stripWrappingQuotes(env.ADMIN_PASSWORD || "");
}

function sanitizeAdmin(admin) {
  const resolvedId = admin.id || admin._id || "env-admin";
  return {
    id: String(resolvedId),
    loginId: admin.loginId || "",
    name: admin.name,
    email: admin.email || "",
    phone: admin.phone || "",
  };
}

function createToken(admin, source = "db") {
  const resolvedId = admin.id || admin._id || "env-admin";
  return jwt.sign(
    {
      sub: String(resolvedId),
      name: admin.name,
      loginId: admin.loginId || "",
      email: admin.email || "",
      phone: admin.phone || "",
      source,
    },
    env.JWT_SECRET,
    {
      expiresIn: env.JWT_EXPIRES_IN || "7d",
    },
  );
}

function getEnvAdminProfile() {
  return {
    id: "env-admin",
    loginId: normalizeIdentifier(env.ADMIN_ID || "LPGADMIN"),
    name: stripWrappingQuotes(env.ADMIN_NAME || "LPG Admin"),
    email: normalizeIdentifier(env.ADMIN_EMAIL || ""),
    phone: normalizePhone(env.ADMIN_PHONE || ""),
  };
}

async function ensureAdminUser() {
  const existing = await AdminUser.findOne().lean();
  const envPassword = getEnvAdminPassword();

  if (!envPassword) {
    return existing || null;
  }

  const normalizedLoginId = normalizeIdentifier(env.ADMIN_ID || "LPGADMIN");
  const normalizedName = stripWrappingQuotes(env.ADMIN_NAME || "LPG Admin");
  const normalizedEmail = normalizeIdentifier(env.ADMIN_EMAIL || "");
  const normalizedPhone = normalizePhone(env.ADMIN_PHONE || "");
  const passwordHash = await bcrypt.hash(envPassword, 12);

  if (existing) {
    const isPasswordSynced = await bcrypt.compare(
      envPassword,
      existing.passwordHash || "",
    );

    const needsUpdate =
      !existing.loginId ||
      existing.loginId !== normalizedLoginId ||
      existing.name !== normalizedName ||
      existing.email !== normalizedEmail ||
      existing.phone !== normalizedPhone ||
      !isPasswordSynced;

    if (!needsUpdate) {
      return existing;
    }

    await AdminUser.findByIdAndUpdate(existing._id, {
      loginId: normalizedLoginId,
      name: normalizedName,
      email: normalizedEmail,
      phone: normalizedPhone,
      passwordHash,
    });

    return {
      ...existing,
      loginId: normalizedLoginId,
      name: normalizedName,
      email: normalizedEmail,
      phone: normalizedPhone,
      passwordHash,
    };
  }

  const admin = await AdminUser.create({
    loginId: normalizedLoginId,
    name: normalizedName,
    email: normalizedEmail,
    phone: normalizedPhone,
    passwordHash,
  });

  return admin.toObject();
}

async function syncAdminUserFromEnv() {
  const envPassword = getEnvAdminPassword();

  if (!envPassword) {
    throw new AppError(
      "ADMIN_PASSWORD is required to seed or reset the admin account",
      400,
    );
  }

  const passwordHash = await bcrypt.hash(envPassword, 12);
  const update = {
    loginId: normalizeIdentifier(env.ADMIN_ID || "LPGADMIN"),
    name: stripWrappingQuotes(env.ADMIN_NAME || "LPG Admin"),
    email: normalizeIdentifier(env.ADMIN_EMAIL || ""),
    phone: normalizePhone(env.ADMIN_PHONE || ""),
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
  const inputIdentifier = stripWrappingQuotes(identifier);
  const normalized = inputIdentifier.toLowerCase();
  const inputPassword = stripWrappingQuotes(password);
  const envPassword = getEnvAdminPassword();
  const envAdmin = getEnvAdminProfile();
  const isEnvIdentifierMatch =
    normalized === envAdmin.loginId ||
    normalizeIdentifier(inputIdentifier) ===
      normalizeIdentifier(envAdmin.name) ||
    (envAdmin.email && normalized === envAdmin.email) ||
    (envAdmin.phone && normalizePhone(inputIdentifier) === envAdmin.phone);

  if (envPassword && isEnvIdentifierMatch && inputPassword === envPassword) {
    return {
      token: createToken(envAdmin, "env"),
      admin: sanitizeAdmin(envAdmin),
    };
  }

  await ensureAdminUser();

  const admin = await AdminUser.findOne({
    $or: [
      { loginId: normalized },
      { email: normalized },
      { phone: normalizePhone(inputIdentifier) },
    ],
  });

  if (!admin) {
    throw new AppError("Invalid login credentials", 401);
  }

  const isValid = await bcrypt.compare(inputPassword, admin.passwordHash);

  if (!isValid) {
    if (
      env.NODE_ENV !== "production" &&
      normalized === normalizeIdentifier(env.ADMIN_ID || "") &&
      inputPassword === envPassword
    ) {
      const passwordHash = await bcrypt.hash(envPassword, 12);
      admin.passwordHash = passwordHash;
      if (!admin.loginId) {
        admin.loginId = normalized;
      }
      await admin.save();

      return {
        token: createToken(admin, "db"),
        admin: sanitizeAdmin(admin),
      };
    }

    throw new AppError("Invalid login credentials", 401);
  }

  return {
    token: createToken(admin, "db"),
    admin: sanitizeAdmin(admin),
  };
}

module.exports = {
  getEnvAdminProfile,
  ensureAdminUser,
  loginAdmin,
  sanitizeAdmin,
  syncAdminUserFromEnv,
};
