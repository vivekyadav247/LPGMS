const { endOfDay, startOfDay } = require("date-fns");

const Customer = require("../models/Customer");
const Transaction = require("../models/Transaction");

async function getDailyReport(dateInput) {
  const baseDate = dateInput ? new Date(dateInput) : new Date();
  const start = startOfDay(baseDate);
  const end = endOfDay(baseDate);

  const transactions = await Transaction.find({
    isDeleted: false,
    date: {
      $gte: start,
      $lte: end,
    },
  }).lean();

  const pendingAgg = await Customer.aggregate([
    {
      $group: {
        _id: null,
        totalPending: { $sum: "$currentPendingCylinders" },
      },
    },
  ]);

  return {
    date: start,
    totalCylindersOut: transactions.reduce(
      (total, transaction) => total + transaction.filledDelivered,
      0,
    ),
    totalReturned: transactions.reduce(
      (total, transaction) => total + transaction.emptyReturned,
      0,
    ),
    pendingCount: pendingAgg[0]?.totalPending || 0,
    cashCollected: transactions
      .filter((transaction) => transaction.paymentMode === "CASH")
      .reduce((total, transaction) => total + transaction.paidAmount, 0),
    onlineCollected: transactions
      .filter((transaction) =>
        ["ONLINE", "UPI"].includes(transaction.paymentMode),
      )
      .reduce((total, transaction) => total + transaction.paidAmount, 0),
  };
}

module.exports = {
  getDailyReport,
};
