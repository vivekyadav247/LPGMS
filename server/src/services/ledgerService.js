const { endOfDay, startOfDay } = require("date-fns");

const Customer = require("../models/Customer");
const Transaction = require("../models/Transaction");
const escapeRegex = require("../utils/escapeRegex");
const AppError = require("../utils/AppError");
const { normalizeTransactionInput } = require("../utils/transactionUtils");
const {
  runWithOptionalTransaction,
  sessionOptions,
  withSession,
} = require("../utils/transactionSupport");
const {
  assertStockNonNegative,
  computeStockSummary,
} = require("./stockService");
const { processBackupJob, queueBackupJob } = require("./backupService");

async function recalculateCustomerLedger(customerId, session) {
  const transactions = await withSession(
    Transaction.find({
      customerId,
      isDeleted: false,
    }).sort({ date: 1, createdAt: 1 }),
    session,
  );

  let runningPending = 0;
  let runningCredit = 0;
  let lastRate = 0;
  let lastDeliveryDate = null;

  const bulkOperations = [];

  for (const transaction of transactions) {
    const nextPending =
      runningPending + transaction.filledDelivered - transaction.emptyReturned;
    const nextCredit =
      runningCredit + transaction.totalAmount - transaction.paidAmount;

    if (nextPending < 0) {
      throw new AppError(
        "Customer ledger would become negative. Check empty returns or old edits.",
        400,
      );
    }

    if (nextCredit < 0) {
      throw new AppError(
        "Payment is higher than the running outstanding balance.",
        400,
      );
    }

    bulkOperations.push({
      updateOne: {
        filter: { _id: transaction._id },
        update: {
          previousPending: runningPending,
          currentPending: nextPending,
          previousCreditBalance: runningCredit,
          currentCreditBalance: nextCredit,
        },
      },
    });

    runningPending = nextPending;
    runningCredit = nextCredit;

    if (transaction.rate > 0) {
      lastRate = transaction.rate;
    }

    if (transaction.filledDelivered > 0) {
      lastDeliveryDate = transaction.date;
    }
  }

  if (bulkOperations.length > 0) {
    await Transaction.bulkWrite(bulkOperations, sessionOptions(session));
  }

  await Customer.findByIdAndUpdate(
    customerId,
    {
      currentPendingCylinders: runningPending,
      totalCreditBalance: runningCredit,
      lastRate,
      lastDeliveryDate,
    },
    sessionOptions(session),
  );
}

function buildTransactionBackupPayload(transaction, customer, action) {
  return {
    action,
    recordId: String(transaction._id || ""),
    date: transaction.date,
    createdAt: transaction.createdAt,
    updatedAt: transaction.updatedAt,
    customerName: customer?.name || "Unknown",
    customerType: customer?.customerType || "",
    entryType: transaction.entryType,
    emptyReturned: transaction.emptyReturned,
    filledDelivered: transaction.filledDelivered,
    currentPending: transaction.currentPending,
    rate: transaction.rate,
    totalAmount: transaction.totalAmount,
    paymentType: transaction.paymentType,
    paymentMode: transaction.paymentMode,
    paidAmount: transaction.paidAmount,
    notes: transaction.notes,
  };
}

function getRestorableTransactionState(transaction) {
  return {
    customerId: transaction.customerId,
    date: transaction.date,
    entryType: transaction.entryType,
    emptyReturned: transaction.emptyReturned,
    filledDelivered: transaction.filledDelivered,
    previousPending: transaction.previousPending,
    currentPending: transaction.currentPending,
    previousCreditBalance: transaction.previousCreditBalance,
    currentCreditBalance: transaction.currentCreditBalance,
    rate: transaction.rate,
    totalAmount: transaction.totalAmount,
    paymentType: transaction.paymentType,
    paymentMode: transaction.paymentMode,
    paidAmount: transaction.paidAmount,
    notes: transaction.notes,
    isDeleted: transaction.isDeleted,
    deletedAt: transaction.deletedAt,
  };
}

async function assertSufficientFilledStock(
  requiredFilled,
  session,
  allowance = 0,
) {
  if (requiredFilled <= 0) {
    return;
  }

  const summary = await computeStockSummary({ session });
  const availableFilled =
    Number(summary.filledStock || 0) + Number(allowance || 0);

  if (requiredFilled > availableFilled) {
    throw new AppError(
      `Only ${availableFilled} filled cylinders are available in stock`,
      400,
      {
        availableFilled,
        requestedFilled: requiredFilled,
      },
    );
  }
}

async function listCustomers({ search = "" } = {}) {
  const query = {};

  if (search.trim()) {
    const safeSearch = escapeRegex(search.trim());
    query.$or = [
      { name: { $regex: safeSearch, $options: "i" } },
      { phone: { $regex: safeSearch, $options: "i" } },
    ];
  }

  const customers = await Customer.find(query).sort({ name: 1 }).lean();

  if (!customers.length) {
    return [];
  }

  const customerIds = customers.map((customer) => customer._id);
  const activeTransactionCounts = await Transaction.aggregate([
    {
      $match: {
        isDeleted: false,
        customerId: { $in: customerIds },
      },
    },
    {
      $group: {
        _id: "$customerId",
        count: { $sum: 1 },
      },
    },
  ]);

  const activeCountMap = new Map(
    activeTransactionCounts.map((item) => [String(item._id), item.count]),
  );

  return customers.map((customer) => {
    const activeTransactionCount =
      activeCountMap.get(String(customer._id)) || 0;

    return {
      ...customer,
      activeTransactionCount,
      canDelete: activeTransactionCount === 0,
    };
  });
}

async function createCustomer(input) {
  const customer = await Customer.create({
    name: input.name,
    phone: input.phone || "",
    address: input.address || "",
    customerType: input.customerType,
  });

  return customer.toObject();
}

async function updateCustomer(customerId, input) {
  const customer = await Customer.findById(customerId);

  if (!customer) {
    throw new AppError("Customer not found", 404);
  }

  const previousCustomer = {
    name: customer.name,
    customerType: customer.customerType,
  };

  customer.name = input.name;
  customer.phone = input.phone || "";
  customer.address = input.address || "";
  customer.customerType = input.customerType;

  await customer.save();

  const identityChanged =
    previousCustomer.name !== customer.name ||
    previousCustomer.customerType !== customer.customerType;

  if (identityChanged) {
    const transactions = await Transaction.find({
      customerId,
      isDeleted: false,
    }).lean();

    for (const transaction of transactions) {
      const job = await queueBackupJob({
        type: "TRANSACTION",
        action: "UPDATE",
        entityId: String(transaction._id),
        payload: {
          ...buildTransactionBackupPayload(
            transaction,
            customer.toObject(),
            "UPDATE",
          ),
          previous: {
            ...buildTransactionBackupPayload(
              transaction,
              previousCustomer,
              "UPDATE",
            ),
          },
        },
      });

      await processBackupJob(job._id);
    }
  }

  return customer.toObject();
}

async function deleteCustomer(customerId) {
  const customer = await Customer.findById(customerId);

  if (!customer) {
    return {
      success: true,
      alreadyDeleted: true,
    };
  }

  const activeTransactions = await Transaction.countDocuments({
    customerId,
    isDeleted: false,
  });

  if (activeTransactions > 0) {
    throw new AppError(
      "Cannot delete customer with active transactions. Delete or move those entries first.",
      400,
    );
  }

  await Customer.findByIdAndDelete(customerId);

  return {
    success: true,
  };
}

async function getCustomerDetail(customerId) {
  const customer = await Customer.findById(customerId).lean();

  if (!customer) {
    throw new AppError("Customer not found", 404);
  }

  const transactions = await Transaction.find({
    customerId,
    isDeleted: false,
  })
    .sort({ date: -1, createdAt: -1 })
    .lean();

  return {
    customer,
    transactions,
  };
}

async function listTransactions({
  page = 1,
  limit = 20,
  search = "",
  from,
  to,
  customerId,
} = {}) {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
  const query = {
    isDeleted: false,
  };

  if (customerId) {
    query.customerId = customerId;
  }

  if (from || to) {
    query.date = {};

    if (from) {
      query.date.$gte = startOfDay(new Date(from));
    }

    if (to) {
      query.date.$lte = endOfDay(new Date(to));
    }
  }

  if (search.trim()) {
    const safeSearch = escapeRegex(search.trim());
    const matchingCustomers = await Customer.find({
      $or: [
        { name: { $regex: safeSearch, $options: "i" } },
        { phone: { $regex: safeSearch, $options: "i" } },
      ],
    }).select("_id");

    const customerIds = matchingCustomers.map((customer) => customer._id);

    if (customerIds.length === 0) {
      return {
        rows: [],
        pagination: {
          page: safePage,
          limit: safeLimit,
          total: 0,
          totalPages: 0,
        },
      };
    }

    query.customerId = { $in: customerIds };
  }

  const skip = (safePage - 1) * safeLimit;

  const [rows, total] = await Promise.all([
    Transaction.find(query)
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .populate("customerId", "name phone customerType")
      .lean(),
    Transaction.countDocuments(query),
  ]);

  return {
    rows: rows.map((row) => ({
      ...row,
      customer: row.customerId,
    })),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
    },
  };
}

async function createTransaction(input) {
  let createdTransactionId = null;
  let backupJobId = null;

  await runWithOptionalTransaction(async (session) => {
    try {
      const customer = await withSession(
        Customer.findById(input.customerId),
        session,
      );

      if (!customer) {
        throw new AppError("Customer not found", 404);
      }

      const normalized = normalizeTransactionInput(input);
      await assertSufficientFilledStock(normalized.filledDelivered, session);

      const [transaction] = await Transaction.create(
        [
          {
            customerId: input.customerId,
            date: input.date,
            entryType: normalized.entryType,
            emptyReturned: normalized.emptyReturned,
            filledDelivered: normalized.filledDelivered,
            rate: normalized.rate,
            totalAmount: normalized.totalAmount,
            paymentType: normalized.paymentType,
            paymentMode: normalized.paymentMode,
            paidAmount: normalized.paidAmount,
            notes: normalized.notes,
          },
        ],
        sessionOptions(session),
      );

      createdTransactionId = String(transaction._id);

      await recalculateCustomerLedger(input.customerId, session);
      await assertStockNonNegative(session);

      const finalTransaction = await withSession(
        Transaction.findById(transaction._id),
        session,
      ).lean();
      const finalCustomer = await withSession(
        Customer.findById(input.customerId),
        session,
      ).lean();

      const job = await queueBackupJob({
        type: "TRANSACTION",
        action: "CREATE",
        entityId: String(transaction._id),
        payload: buildTransactionBackupPayload(
          finalTransaction,
          finalCustomer,
          "CREATE",
        ),
        session,
      });

      backupJobId = String(job._id);
    } catch (error) {
      if (!session && createdTransactionId) {
        await Transaction.findByIdAndDelete(createdTransactionId);
        await recalculateCustomerLedger(input.customerId, null);
        createdTransactionId = null;
      }

      throw error;
    }
  });

  if (backupJobId) {
    await processBackupJob(backupJobId);
  }

  return Transaction.findById(createdTransactionId)
    .populate("customerId", "name phone customerType")
    .lean();
}

async function updateTransaction(transactionId, input) {
  let updatedTransactionId = transactionId;
  let backupJobId = null;

  await runWithOptionalTransaction(async (session) => {
    let existing = null;
    let snapshot = null;
    let previousCustomerId = null;
    let previousBackupPayload = null;

    try {
      existing = await withSession(
        Transaction.findOne({
          _id: transactionId,
          isDeleted: false,
        }),
        session,
      );

      if (!existing) {
        throw new AppError("Transaction not found", 404);
      }

      snapshot = getRestorableTransactionState(existing);
      previousCustomerId = String(existing.customerId);
      const previousCustomer = await withSession(
        Customer.findById(existing.customerId),
        session,
      ).lean();
      previousBackupPayload = buildTransactionBackupPayload(
        existing.toObject(),
        previousCustomer,
        "UPDATE",
      );

      const targetCustomer = await withSession(
        Customer.findById(input.customerId),
        session,
      );

      if (!targetCustomer) {
        throw new AppError("Customer not found", 404);
      }

      const normalized = normalizeTransactionInput(input);
      await assertSufficientFilledStock(
        normalized.filledDelivered,
        session,
        existing.filledDelivered,
      );

      existing.customerId = input.customerId;
      existing.date = input.date;
      existing.entryType = normalized.entryType;
      existing.emptyReturned = normalized.emptyReturned;
      existing.filledDelivered = normalized.filledDelivered;
      existing.rate = normalized.rate;
      existing.totalAmount = normalized.totalAmount;
      existing.paymentType = normalized.paymentType;
      existing.paymentMode = normalized.paymentMode;
      existing.paidAmount = normalized.paidAmount;
      existing.notes = normalized.notes;

      await existing.save(sessionOptions(session));

      await recalculateCustomerLedger(previousCustomerId, session);

      if (previousCustomerId !== input.customerId) {
        await recalculateCustomerLedger(input.customerId, session);
      }

      await assertStockNonNegative(session);

      const finalTransaction = await withSession(
        Transaction.findById(existing._id),
        session,
      ).lean();
      const finalCustomer = targetCustomer.toObject();

      const job = await queueBackupJob({
        type: "TRANSACTION",
        action: "UPDATE",
        entityId: String(existing._id),
        payload: {
          ...buildTransactionBackupPayload(
            finalTransaction,
            finalCustomer,
            "UPDATE",
          ),
          previous: previousBackupPayload,
        },
        session,
      });

      updatedTransactionId = String(existing._id);
      backupJobId = String(job._id);
    } catch (error) {
      if (!session && existing && snapshot) {
        await Transaction.findByIdAndUpdate(existing._id, snapshot);
        await recalculateCustomerLedger(previousCustomerId, null);

        if (previousCustomerId && previousCustomerId !== input.customerId) {
          await recalculateCustomerLedger(input.customerId, null);
        }
      }

      throw error;
    }
  });

  if (backupJobId) {
    await processBackupJob(backupJobId);
  }

  return Transaction.findById(updatedTransactionId)
    .populate("customerId", "name phone customerType")
    .lean();
}

async function softDeleteTransaction(transactionId) {
  let backupJobId = null;

  await runWithOptionalTransaction(async (session) => {
    let transaction = null;
    let customerId = null;

    try {
      transaction = await withSession(
        Transaction.findOne({
          _id: transactionId,
          isDeleted: false,
        }),
        session,
      );

      if (!transaction) {
        throw new AppError("Transaction not found", 404);
      }

      customerId = String(transaction.customerId);
      const customer = await withSession(
        Customer.findById(transaction.customerId),
        session,
      ).lean();

      const backupPayload = buildTransactionBackupPayload(
        transaction.toObject(),
        customer,
        "DELETE",
      );

      transaction.isDeleted = true;
      transaction.deletedAt = new Date();
      await transaction.save(sessionOptions(session));

      await recalculateCustomerLedger(customerId, session);
      await assertStockNonNegative(session);

      const job = await queueBackupJob({
        type: "TRANSACTION",
        action: "DELETE",
        entityId: String(transaction._id),
        payload: backupPayload,
        session,
      });

      backupJobId = String(job._id);
    } catch (error) {
      if (!session && transaction) {
        transaction.isDeleted = false;
        transaction.deletedAt = null;
        await transaction.save();
        await recalculateCustomerLedger(customerId, null);
      }

      throw error;
    }
  });

  if (backupJobId) {
    await processBackupJob(backupJobId);
  }

  return {
    success: true,
  };
}

module.exports = {
  listCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerDetail,
  listTransactions,
  createTransaction,
  updateTransaction,
  softDeleteTransaction,
};
