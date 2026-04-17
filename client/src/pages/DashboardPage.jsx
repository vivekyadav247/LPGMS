import {
  ArrowRight,
  Boxes,
  CircleAlert,
  CreditCard,
  IndianRupee,
  PackageOpen,
  RotateCcw,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { apiFetch } from "../lib/api";
import {
  formatCurrency,
  formatDate,
  formatNumber,
  getEntryTypeLabel,
  getPaymentModeLabel,
  getPaymentStatusLabel,
  getTransactionEntryType,
} from "../lib/utils";
import { Badge } from "../components/ui/Badge";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { Loader } from "../components/ui/Loader";
import { SectionHeading } from "../components/ui/SectionHeading";
import { StatCard } from "../components/ui/StatCard";

function SummaryList({ items, emptyTitle, emptyDescription, renderValue }) {
  if (!items.length) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div
          key={`${item.name}-${index}`}
          className="flex items-center justify-between gap-3 rounded-3xl border border-slate-100 bg-slate-50 px-4 py-4"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold text-ink">
              {item.name}
            </p>
          </div>
          <div className="shrink-0 whitespace-nowrap text-right">
            {renderValue(item)}
          </div>
        </div>
      ))}
    </div>
  );
}

export function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [summary, pending] = await Promise.all([
          apiFetch("/api/analytics/summary"),
          apiFetch("/api/analytics/pending"),
        ]);

        setData({ summary, pending });
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  if (loading) {
    return <Loader label="Loading dashboard..." />;
  }

  if (!data) {
    return (
      <EmptyState
        title="Dashboard unavailable"
        description="Please try refreshing the page."
      />
    );
  }

  const summary = data.summary;
  const pending = data.pending;
  const totals = summary.totals || {};
  const stock = pending.stockSummary || {
    filledStock: 0,
    emptyStock: 0,
    issuedStock: 0,
  };

  return (
    <div className="space-y-6">
      <section>
        <SectionHeading title="Home overview" />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard
            title="Total customers"
            value={formatNumber(summary.cards.totalCustomers)}
            subtitle="Active ledger parties"
            icon={Users}
            tone="green"
          />
          <StatCard
            title="Today deliveries"
            value={formatNumber(summary.cards.todayDeliveries)}
            subtitle="Filled cylinders out"
            icon={PackageOpen}
            tone="amber"
          />
          <StatCard
            title="Pending empty cylinders"
            value={formatNumber(summary.cards.totalPendingEmptyCylinders)}
            subtitle="Outstanding in market"
            icon={Boxes}
            tone="rose"
          />
          <StatCard
            title="Pending"
            value={formatCurrency(summary.cards.totalCreditAmount)}
            subtitle="Khata receivable"
            icon={CreditCard}
            tone="blue"
          />
          <StatCard
            title="Today revenue"
            value={formatCurrency(summary.cards.todayRevenue)}
            subtitle="Delivery amount only (not collections)"
            icon={IndianRupee}
            tone="green"
          />
          <StatCard
            title="Today received"
            value={formatCurrency(
              summary.dailyReport.cashCollected +
                summary.dailyReport.onlineCollected,
            )}
            subtitle="Cash + online collection"
            icon={IndianRupee}
            tone="amber"
          />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card className="p-4 sm:p-5">
          <SectionHeading
            eyebrow="Recent activity"
            title="Latest transactions"
            compact
            action={
              <Link
                to="/transactions"
                className="text-sm font-semibold text-accent"
              >
                View all
              </Link>
            }
          />

          <div className="space-y-3">
            {summary.recentTransactions.length > 0 ? (
              summary.recentTransactions.map((item) => {
                const paymentStatus = getPaymentStatusLabel(item);
                const isCredit = paymentStatus === "Credit";
                const paymentMode = getPaymentModeLabel(item.paymentMode);

                return (
                  <div
                    key={item._id}
                    className="rounded-3xl border border-slate-100 bg-slate-50 px-4 py-4"
                  >
                    <div className="grid grid-cols-[minmax(0,1fr)_6.5rem] items-start gap-x-3 sm:grid-cols-[minmax(0,1fr)_7.5rem]">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-ink">
                          {item.customer?.name}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatDate(item.date)}
                        </p>
                      </div>
                      <div className="w-[6.5rem] shrink-0 text-right sm:w-[7.5rem]">
                        <p className="text-base font-semibold text-ink">
                          {formatCurrency(
                            getTransactionEntryType(item) === "SETTLEMENT"
                              ? item.paidAmount
                              : item.totalAmount,
                          )}
                        </p>
                        <p
                          className={`mt-1 inline-flex items-center justify-end gap-1 whitespace-nowrap text-xs font-semibold ${
                            isCredit ? "text-rose-600" : "text-slate-600"
                          }`}
                        >
                          {isCredit ? <CircleAlert size={12} /> : null}
                          {paymentStatus}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 space-y-1 text-xs text-slate-500">
                      <p>
                        {getEntryTypeLabel(item)} | Filled{" "}
                        {item.filledDelivered} | Returned {item.emptyReturned}
                      </p>
                      <p>{paymentMode}</p>
                    </div>
                  </div>
                );
              })
            ) : (
              <EmptyState
                title="No transactions yet"
                description="Create the first entry to start the running ledger."
              />
            )}
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="p-4 sm:p-5">
            <SectionHeading
              eyebrow="Top pending"
              title="Customers to collect empties from"
              compact
            />
            <div className="space-y-3">
              {summary.topPendingCustomers.map((customer) => (
                <Link
                  key={customer._id}
                  to={`/customers/${customer._id}`}
                  className="flex items-center justify-between gap-3 rounded-3xl border border-slate-100 px-4 py-4 hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-ink">
                      {customer.name}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {customer.customerType}
                    </p>
                  </div>
                  <Badge tone="danger" className="whitespace-nowrap">
                    <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-rose-600" />
                    {customer.currentPendingCylinders} pending
                  </Badge>
                </Link>
              ))}
            </div>
          </Card>

          <Card className="p-4 sm:p-5">
            <SectionHeading
              eyebrow="Daily report"
              title="Today collection snapshot"
              compact
            />
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-3xl bg-slate-50 px-4 py-4">
                <p className="text-slate-500">Cylinders out</p>
                <p className="mt-2 text-xl font-bold text-ink">
                  {summary.dailyReport.totalCylindersOut}
                </p>
              </div>
              <div className="rounded-3xl bg-slate-50 px-4 py-4">
                <p className="text-slate-500">Returned</p>
                <p className="mt-2 text-xl font-bold text-ink">
                  {summary.dailyReport.totalReturned}
                </p>
              </div>
              <div className="rounded-3xl bg-slate-50 px-4 py-4">
                <p className="text-slate-500">Cash collected</p>
                <p className="mt-2 text-xl font-bold text-ink">
                  {formatCurrency(summary.dailyReport.cashCollected)}
                </p>
              </div>
              <div className="rounded-3xl bg-slate-50 px-4 py-4">
                <p className="text-slate-500">Online collected</p>
                <p className="mt-2 text-xl font-bold text-ink">
                  {formatCurrency(summary.dailyReport.onlineCollected)}
                </p>
              </div>
            </div>
          </Card>

          <Card variant="ink" className="p-4 text-white sm:p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
                  Stock alert
                </p>
                <h4 className="mt-2 text-2xl font-bold">
                  Filled stock {summary.stockAlert.filledStock}
                </h4>
                <p className="mt-2 text-sm text-white/70">
                  Threshold {summary.stockAlert.lowStockThreshold}. Refill or
                  inward before next route.
                </p>
              </div>
              <Badge
                tone={summary.stockAlert.isLowStock ? "danger" : "success"}
              >
                {summary.stockAlert.isLowStock ? "Low stock" : "Healthy"}
              </Badge>
            </div>

            <Link
              to="/stock"
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-white"
            >
              Open stock page
              <ArrowRight size={16} />
            </Link>
          </Card>
        </div>
      </section>

      <section>
        <SectionHeading eyebrow="All-time totals" title="Business analytics" />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total transactions"
            value={formatNumber(totals.totalTransactions)}
            subtitle="All saved entries"
            icon={CircleAlert}
            tone="blue"
          />
          <StatCard
            title="Total cylinders delivered"
            value={formatNumber(totals.totalDeliveries)}
            subtitle="All-time filled out"
            icon={PackageOpen}
            tone="amber"
          />
          <StatCard
            title="Total cylinders returned"
            value={formatNumber(totals.totalReturns)}
            subtitle="All-time empty in"
            icon={RotateCcw}
            tone="green"
          />
          <StatCard
            title="Total collected"
            value={formatCurrency(totals.totalPaidAmount)}
            subtitle="All-time payment received"
            icon={IndianRupee}
            tone="green"
          />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card className="p-4 sm:p-5">
          <SectionHeading
            eyebrow="Pending empties"
            title="Customers with pending cylinders"
            compact
          />

          <SummaryList
            items={pending.pendingByCustomer || []}
            emptyTitle="No pending cylinders"
            emptyDescription="All customer empty balances are clear right now."
            renderValue={(item) => (
              <Badge tone="danger">
                <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-rose-600" />
                {formatNumber(item.cylinders)} pending
              </Badge>
            )}
          />
        </Card>

        <Card className="p-4 sm:p-5">
          <SectionHeading
            eyebrow="Outstanding"
            title="Customers with pending amount"
            compact
          />

          <SummaryList
            items={pending.creditOutstanding || []}
            emptyTitle="No outstanding credit"
            emptyDescription="There is no pending amount right now."
            renderValue={(item) => (
              <p className="text-sm font-semibold text-ink">
                {formatCurrency(item.amount)}
              </p>
            )}
          />
        </Card>
      </section>

      <section>
        <SectionHeading
          eyebrow="Stock buckets"
          title="Current stock position"
          compact
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard
            title="Filled stock"
            value={formatNumber(stock.filledStock)}
            subtitle="Ready for delivery"
            icon={Boxes}
            tone="green"
          />
          <StatCard
            title="Empty stock"
            value={formatNumber(stock.emptyStock)}
            subtitle="Available in godown"
            icon={RotateCcw}
            tone="amber"
          />
          <StatCard
            title="Issued stock"
            value={formatNumber(stock.issuedStock)}
            subtitle="Currently with customers"
            icon={PackageOpen}
            tone="blue"
          />
        </div>
      </section>
    </div>
  );
}
