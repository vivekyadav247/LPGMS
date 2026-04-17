const { addDays, endOfDay, format, startOfDay, subDays } = require("date-fns");

const env = require("../config/env");
const StockMovement = require("../models/StockMovement");
const Transaction = require("../models/Transaction");
const AppError = require("../utils/AppError");
const { hasStockMovement } = require("../utils/transactionUtils");
const {
  runWithOptionalTransaction,
  sessionOptions,
} = require("../utils/transactionSupport");
const { processBackupJob, queueBackupJob } = require("./backupService");

async function aggregateManualStock(match = {}, session) {
  const aggregate = StockMovement.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        filledStock: { $sum: "$deltaFilled" },
        emptyStock: { $sum: "$deltaEmpty" },
        issuedStock: { $sum: "$deltaIssued" },
      },
    },
  ]);

  if (session) {
    aggregate.session(session);
  }

  const [summary] = await aggregate;

  return (
    summary || {
      filledStock: 0,
      emptyStock: 0,
      issuedStock: 0,
    }
  );
}

async function aggregateTransactionStock(match = {}, session) {
  const aggregate = Transaction.aggregate([
    {
      $match: {
        isDeleted: false,
        ...match,
      },
    },
    {
      $group: {
        _id: null,
        filledStock: {
          $sum: {
            $multiply: ["$filledDelivered", -1],
          },
        },
        emptyStock: { $sum: "$emptyReturned" },
        issuedStock: {
          $sum: {
            $subtract: ["$filledDelivered", "$emptyReturned"],
          },
        },
      },
    },
  ]);

  if (session) {
    aggregate.session(session);
  }

  const [summary] = await aggregate;

  return (
    summary || {
      filledStock: 0,
      emptyStock: 0,
      issuedStock: 0,
    }
  );
}

async function computeStockSummary({ session, endDate } = {}) {
  const manualMatch = {};
  const transactionMatch = {};

  if (endDate) {
    manualMatch.date = { $lte: endDate };
    transactionMatch.date = { $lte: endDate };
  }

  const manual = await aggregateManualStock(manualMatch, session);
  const transactions = await aggregateTransactionStock(
    transactionMatch,
    session,
  );

  return {
    filledStock: manual.filledStock + transactions.filledStock,
    emptyStock: manual.emptyStock + transactions.emptyStock,
    issuedStock: manual.issuedStock + transactions.issuedStock,
  };
}

async function assertStockNonNegative(session) {
  const summary = await computeStockSummary({ session });

  if (
    summary.filledStock < 0 ||
    summary.emptyStock < 0 ||
    summary.issuedStock < 0
  ) {
    throw new AppError(
      "Stock update would make filled, empty, or issued stock negative",
      400,
      summary,
    );
  }

  return summary;
}

function buildMovementValues(input) {
  if (input.type === "STOCK_INWARD") {
    return {
      deltaFilled: input.quantity,
      deltaEmpty: 0,
      deltaIssued: 0,
    };
  }

  if (input.type === "REFILL_CONVERSION") {
    return {
      deltaFilled: input.quantity,
      deltaEmpty: input.quantity * -1,
      deltaIssued: 0,
    };
  }

  return {
    deltaFilled: input.deltaFilled,
    deltaEmpty: input.deltaEmpty,
    deltaIssued: input.deltaIssued,
  };
}

function roundMoney(value = 0) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

function resolveMovementPricing(input) {
  if (input.type === "MANUAL_ADJUSTMENT") {
    return {
      pricingMode: "PER_CYLINDER",
      pricePerCylinder: 0,
      totalPrice: 0,
    };
  }

  const quantity = Number(input.quantity || 0);
  const pricingMode = input.pricingMode || "PER_CYLINDER";
  let pricePerCylinder = Number(input.pricePerCylinder || 0);
  let totalPrice = Number(input.totalPrice || 0);

  if (pricingMode === "PER_CYLINDER") {
    if (pricePerCylinder > 0) {
      totalPrice = roundMoney(pricePerCylinder * quantity);
    } else if (totalPrice > 0 && quantity > 0) {
      pricePerCylinder = roundMoney(totalPrice / quantity);
    }
  } else {
    if (totalPrice > 0 && quantity > 0) {
      pricePerCylinder = roundMoney(totalPrice / quantity);
    } else if (pricePerCylinder > 0) {
      totalPrice = roundMoney(pricePerCylinder * quantity);
    }
  }

  return {
    pricingMode,
    pricePerCylinder: roundMoney(pricePerCylinder),
    totalPrice: roundMoney(totalPrice),
  };
}

function buildStockBackupPayload(movement, action) {
  return {
    action,
    recordId: String(movement._id || ""),
    date: movement.date,
    createdAt: movement.createdAt,
    updatedAt: movement.updatedAt,
    type: movement.type,
    quantity: movement.quantity,
    pricingMode: movement.pricingMode,
    pricePerCylinder: movement.pricePerCylinder,
    totalPrice: movement.totalPrice,
    deltaFilled: movement.deltaFilled,
    deltaEmpty: movement.deltaEmpty,
    deltaIssued: movement.deltaIssued,
    supplierNote: movement.supplierNote,
    notes: movement.notes,
  };
}

async function createStockMovement(input) {
  let movementId = null;
  let backupJobId = null;

  await runWithOptionalTransaction(async (session) => {
    try {
      const deltas = buildMovementValues(input);
      const pricing = resolveMovementPricing(input);

      const [movement] = await StockMovement.create(
        [
          {
            date: input.date,
            type: input.type,
            quantity: input.quantity,
            pricingMode: pricing.pricingMode,
            pricePerCylinder: pricing.pricePerCylinder,
            totalPrice: pricing.totalPrice,
            supplierNote: input.supplierNote || "",
            notes: input.notes || "",
            ...deltas,
          },
        ],
        sessionOptions(session),
      );

      movementId = String(movement._id);

      await assertStockNonNegative(session);

      const job = await queueBackupJob({
        type: "STOCK",
        action: "CREATE",
        entityId: String(movement._id),
        payload: buildStockBackupPayload(movement, "CREATE"),
        session,
      });

      backupJobId = String(job._id);
    } catch (error) {
      if (!session && movementId) {
        await StockMovement.findByIdAndDelete(movementId);
        movementId = null;
      }

      throw error;
    }
  });

  if (backupJobId) {
    await processBackupJob(backupJobId);
  }

  return StockMovement.findById(movementId).lean();
}

async function getStockMovementHistory({ from, to, limit = 30 } = {}) {
  const transactionMatch = { isDeleted: false };
  const movementMatch = {};

  if (from || to) {
    const range = {};

    if (from) {
      range.$gte = startOfDay(new Date(from));
    }

    if (to) {
      range.$lte = endOfDay(new Date(to));
    }

    transactionMatch.date = range;
    movementMatch.date = range;
  }

  const [transactions, manualMovements] = await Promise.all([
    Transaction.find(transactionMatch)
      .sort({ date: -1, createdAt: -1 })
      .limit(limit)
      .populate("customerId", "name customerType")
      .lean(),
    StockMovement.find(movementMatch)
      .sort({ date: -1, createdAt: -1 })
      .limit(limit)
      .lean(),
  ]);

  return [
    ...manualMovements.map((movement) => ({
      id: String(movement._id),
      date: movement.date,
      type: movement.type,
      label:
        movement.type === "STOCK_INWARD"
          ? "Filled stock inward"
          : movement.type === "REFILL_CONVERSION"
            ? "Refill conversion"
            : "Manual adjustment",
      quantity: movement.quantity,
      deltaFilled: movement.deltaFilled,
      deltaEmpty: movement.deltaEmpty,
      deltaIssued: movement.deltaIssued,
      pricingMode: movement.pricingMode,
      pricePerCylinder: movement.pricePerCylinder,
      totalPrice: movement.totalPrice,
      notes: movement.notes,
      supplierNote: movement.supplierNote,
    })),
    ...transactions
      .filter((transaction) => hasStockMovement(transaction))
      .map((transaction) => ({
        id: String(transaction._id),
        date: transaction.date,
        type: "CUSTOMER_ENTRY",
        label: transaction.customerId?.name || "Customer delivery",
        customerName: transaction.customerId?.name || "",
        quantity: transaction.filledDelivered,
        deltaFilled: transaction.filledDelivered * -1,
        deltaEmpty: transaction.emptyReturned,
        deltaIssued: transaction.filledDelivered - transaction.emptyReturned,
        notes: transaction.notes,
      })),
  ]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, limit);
}

async function getDailyStockRegister({ days = 7 } = {}) {
  const startDate = startOfDay(subDays(new Date(), days - 1));
  const openingBalanceDate = new Date(startDate.getTime() - 1);
  const opening = await computeStockSummary({ endDate: openingBalanceDate });
  const history = await getStockMovementHistory({
    from: startDate,
    to: endOfDay(new Date()),
    limit: 500,
  });

  const dayMap = new Map();

  for (let index = 0; index < days; index += 1) {
    const day = addDays(startDate, index);
    const key = format(day, "yyyy-MM-dd");

    dayMap.set(key, {
      date: key,
      filledIn: 0,
      deliveredOut: 0,
      emptyIn: 0,
      refillConverted: 0,
      issuedDelta: 0,
      openingFilled: 0,
      openingEmpty: 0,
      openingIssued: 0,
      closingFilled: 0,
      closingEmpty: 0,
      closingIssued: 0,
    });
  }

  for (const item of history) {
    const key = format(new Date(item.date), "yyyy-MM-dd");
    const day = dayMap.get(key);

    if (!day) {
      continue;
    }

    if (item.deltaFilled > 0) {
      day.filledIn += item.deltaFilled;
    } else if (item.deltaFilled < 0) {
      day.deliveredOut += Math.abs(item.deltaFilled);
    }

    if (item.deltaEmpty > 0) {
      day.emptyIn += item.deltaEmpty;
    }

    if (item.type === "REFILL_CONVERSION") {
      day.refillConverted += item.quantity || Math.abs(item.deltaEmpty);
    }

    day.issuedDelta += item.deltaIssued;
  }

  let runningFilled = opening.filledStock;
  let runningEmpty = opening.emptyStock;
  let runningIssued = opening.issuedStock;

  return Array.from(dayMap.values())
    .map((day) => {
      day.openingFilled = runningFilled;
      day.openingEmpty = runningEmpty;
      day.openingIssued = runningIssued;

      runningFilled += day.filledIn - day.deliveredOut;
      runningEmpty += day.emptyIn - day.refillConverted;
      runningIssued += day.issuedDelta;

      day.closingFilled = runningFilled;
      day.closingEmpty = runningEmpty;
      day.closingIssued = runningIssued;

      return day;
    })
    .filter(
      (day) =>
        day.filledIn !== 0 ||
        day.deliveredOut !== 0 ||
        day.emptyIn !== 0 ||
        day.refillConverted !== 0 ||
        day.openingFilled !== 0 ||
        day.openingEmpty !== 0 ||
        day.openingIssued !== 0 ||
        day.closingFilled !== 0 ||
        day.closingEmpty !== 0 ||
        day.closingIssued !== 0,
    );
}

async function getStockOverview() {
  const [summary, history, register] = await Promise.all([
    computeStockSummary(),
    getStockMovementHistory({ limit: 40 }),
    getDailyStockRegister({ days: 7 }),
  ]);

  const threshold = Number(env.LOW_STOCK_THRESHOLD || 15);

  return {
    summary: {
      ...summary,
      lowStockThreshold: threshold,
      isLowStock: summary.filledStock < threshold,
    },
    history,
    register,
  };
}

module.exports = {
  assertStockNonNegative,
  computeStockSummary,
  createStockMovement,
  getStockMovementHistory,
  getDailyStockRegister,
  getStockOverview,
};
