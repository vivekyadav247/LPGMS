const {
  eachDayOfInterval,
  endOfDay,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
} = require("date-fns");

const env = require("../config/env");
const Customer = require("../models/Customer");
const Transaction = require("../models/Transaction");
const { computeStockSummary } = require("./stockService");
const { getDailyReport } = require("./reportService");

function buildSeries(keys) {
  return Object.fromEntries(keys.map((key) => [key, 0]));
}

async function getSummaryAnalytics() {
  const [customers, todayTransactions, recentTransactions, stockSummary, report, transactionTotals] =
    await Promise.all([
      Customer.find().lean(),
      Transaction.find({
        isDeleted: false,
        date: {
          $gte: startOfDay(new Date()),
          $lte: endOfDay(new Date()),
        },
      })
        .sort({ date: -1, createdAt: -1 })
        .lean(),
      Transaction.find({ isDeleted: false })
        .sort({ date: -1, createdAt: -1 })
        .limit(8)
        .populate("customerId", "name customerType")
        .lean(),
      computeStockSummary(),
      getDailyReport(new Date()),
      Transaction.aggregate([
        {
          $match: {
            isDeleted: false,
          },
        },
        {
          $group: {
            _id: null,
            totalTransactions: { $sum: 1 },
            totalDeliveries: { $sum: "$filledDelivered" },
            totalReturns: { $sum: "$emptyReturned" },
            totalBilledAmount: { $sum: "$totalAmount" },
            totalPaidAmount: { $sum: "$paidAmount" },
          },
        },
      ]),
    ]);

  const totals = transactionTotals[0] || {
    totalTransactions: 0,
    totalDeliveries: 0,
    totalReturns: 0,
    totalBilledAmount: 0,
    totalPaidAmount: 0,
  };

  const totalPendingEmptyCylinders = customers.reduce(
    (total, customer) => total + customer.currentPendingCylinders,
    0,
  );
  const totalCreditAmount = customers.reduce(
    (total, customer) => total + customer.totalCreditBalance,
    0,
  );
  const todayRevenue = todayTransactions.reduce(
    (total, transaction) => total + transaction.totalAmount,
    0,
  );
  const topPendingCustomers = customers
    .filter((customer) => customer.currentPendingCylinders > 0)
    .sort((a, b) => b.currentPendingCylinders - a.currentPendingCylinders)
    .slice(0, 6);

  return {
    cards: {
      totalCustomers: customers.length,
      todayDeliveries: todayTransactions.reduce(
        (total, transaction) => total + transaction.filledDelivered,
        0,
      ),
      totalPendingEmptyCylinders,
      totalCreditAmount,
      todayRevenue,
      pendingPayments: totalCreditAmount,
    },
    totals: {
      totalCustomers: customers.length,
      totalTransactions: totals.totalTransactions,
      totalDeliveries: totals.totalDeliveries,
      totalReturns: totals.totalReturns,
      totalBilledAmount: totals.totalBilledAmount,
      totalPaidAmount: totals.totalPaidAmount,
      totalOutstandingAmount: totalCreditAmount,
      totalPendingEmptyCylinders,
      todayTransactionCount: todayTransactions.length,
      todayRevenue,
    },
    dailyReport: report,
    stockAlert: {
      filledStock: stockSummary.filledStock,
      lowStockThreshold: Number(env.LOW_STOCK_THRESHOLD || 15),
      isLowStock:
        stockSummary.filledStock <
        Number(env.LOW_STOCK_THRESHOLD || 15),
    },
    recentTransactions: recentTransactions.map((transaction) => ({
      ...transaction,
      customer: transaction.customerId,
    })),
    topPendingCustomers,
  };
}

async function getRevenueAnalytics() {
  const now = new Date();
  const dailyStart = startOfDay(subDays(now, 13));
  const weeklyStart = startOfWeek(subWeeks(now, 7), { weekStartsOn: 1 });

  const transactions = await Transaction.find({
    isDeleted: false,
    date: {
      $gte: weeklyStart,
    },
  })
    .populate("customerId", "name")
    .lean();

  const dailySeriesMap = new Map(
    eachDayOfInterval({
      start: dailyStart,
      end: startOfDay(now),
    }).map((day) => [
      format(day, "dd MMM"),
      { label: format(day, "dd MMM"), deliveries: 0, revenue: 0 },
    ]),
  );

  const weeklySeries = Array.from({ length: 8 }, (_, index) => {
    const weekStart = startOfWeek(subWeeks(now, 7 - index), {
      weekStartsOn: 1,
    });

    return {
      label: format(weekStart, "dd MMM"),
      deliveries: 0,
    };
  });

  const monthlySeries = Array.from({ length: 6 }, (_, index) => {
    const monthStart = startOfMonth(subMonths(now, 5 - index));

    return {
      label: format(monthStart, "MMM yyyy"),
      revenue: 0,
      paid: 0,
    };
  });

  const paymentModeSplit = buildSeries(["CASH", "ONLINE", "UPI"]);
  const topCustomersMap = new Map();

  for (const transaction of transactions) {
    const dayKey = format(new Date(transaction.date), "dd MMM");
    const weekKey = format(
      startOfWeek(new Date(transaction.date), { weekStartsOn: 1 }),
      "dd MMM",
    );
    const monthKey = format(startOfMonth(new Date(transaction.date)), "MMM yyyy");

    if (dailySeriesMap.has(dayKey)) {
      const day = dailySeriesMap.get(dayKey);
      day.deliveries += transaction.filledDelivered;
      day.revenue += transaction.totalAmount;
    }

    const week = weeklySeries.find((item) => item.label === weekKey);

    if (week) {
      week.deliveries += transaction.filledDelivered;
    }

    const month = monthlySeries.find((item) => item.label === monthKey);

    if (month) {
      month.revenue += transaction.totalAmount;
      month.paid += transaction.paidAmount;
    }

    if (
      transaction.paymentMode &&
      paymentModeSplit[transaction.paymentMode] !== undefined
    ) {
      paymentModeSplit[transaction.paymentMode] += transaction.paidAmount;
    }

    const customerName = transaction.customerId?.name || "Walk-in";
    topCustomersMap.set(
      customerName,
      (topCustomersMap.get(customerName) || 0) + transaction.filledDelivered,
    );
  }

  return {
    dailyDeliveries: Array.from(dailySeriesMap.values()),
    weeklyDeliveries: weeklySeries,
    monthlyRevenue: monthlySeries,
    cylinderOutflowTrend: Array.from(dailySeriesMap.values()).map((item) => ({
      label: item.label,
      outflow: item.deliveries,
    })),
    paymentModeSplit: Object.entries(paymentModeSplit).map(([name, value]) => ({
      name,
      value,
    })),
    topCustomersByUsage: Array.from(topCustomersMap.entries())
      .map(([name, cylinders]) => ({ name, cylinders }))
      .sort((a, b) => b.cylinders - a.cylinders)
      .slice(0, 8),
  };
}

async function getPendingAnalytics() {
  const [customers, stockSummary] = await Promise.all([
    Customer.find().lean(),
    computeStockSummary(),
  ]);

  return {
    pendingByCustomer: customers
      .filter((customer) => customer.currentPendingCylinders > 0)
      .sort((a, b) => b.currentPendingCylinders - a.currentPendingCylinders)
      .slice(0, 10)
      .map((customer) => ({
        name: customer.name,
        cylinders: customer.currentPendingCylinders,
      })),
    creditOutstanding: customers
      .filter((customer) => customer.totalCreditBalance > 0)
      .sort((a, b) => b.totalCreditBalance - a.totalCreditBalance)
      .slice(0, 10)
      .map((customer) => ({
        name: customer.name,
        amount: customer.totalCreditBalance,
      })),
    customerTypeSplit: ["HOTEL", "HOME", "RESTAURANT", "BULK"].map((type) => ({
      name: type,
      value: customers.filter((customer) => customer.customerType === type)
        .length,
    })),
    stockSummary,
  };
}

module.exports = {
  getSummaryAnalytics,
  getRevenueAnalytics,
  getPendingAnalytics,
};
