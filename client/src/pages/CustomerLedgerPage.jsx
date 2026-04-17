import { Download, FileText } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { Loader } from "../components/ui/Loader";
import { SectionHeading } from "../components/ui/SectionHeading";
import { StatCard } from "../components/ui/StatCard";
import { exportLedgerPdf, exportToExcel } from "../lib/exports";
import { apiFetch } from "../lib/api";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
  getEntryTypeLabel,
  getPaymentModeLabel,
  getPaymentStatusLabel,
} from "../lib/utils";

export function CustomerLedgerPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const response = await apiFetch(`/api/customers/${id}`);
        setData(response);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id]);

  if (loading) {
    return <Loader label="Loading customer ledger..." />;
  }

  if (!data) {
    return (
      <EmptyState
        title="Customer not found"
        description="This ledger party could not be loaded."
      />
    );
  }

  const exportRows = data.transactions.map((item) => ({
    "Record ID": item._id || "-",
    "Entry Date Time": formatDateTime(item.date),
    "Created At": formatDateTime(item.createdAt),
    "Updated At": formatDateTime(item.updatedAt),
    Date: formatDate(item.date),
    Type: getEntryTypeLabel(item),
    "Filled Given": item.filledDelivered,
    "Empty Returned": item.emptyReturned,
    Pending: item.currentPending,
    Rate: item.rate,
    Amount: item.totalAmount,
    Collection: getPaymentStatusLabel(item),
    "Payment Mode": getPaymentModeLabel(item.paymentMode),
    "Paid Amount": item.paidAmount,
    Notes: item.notes || "",
  }));

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Khata + inventory mix"
        title={data.customer.name}
        description={`${data.customer.customerType} | ${data.customer.phone || "No phone"} | ${data.customer.address || "No address"}`}
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              className="w-full sm:w-auto"
              onClick={() =>
                exportToExcel(
                  exportRows,
                  `${data.customer.name}-ledger`,
                  "Ledger",
                )
              }
            >
              <Download size={16} />
              Excel
            </Button>
            <Button
              variant="secondary"
              className="w-full sm:w-auto"
              onClick={() => exportLedgerPdf(data.customer, data.transactions)}
            >
              <FileText size={16} />
              PDF
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Current pending cylinders"
          value={formatNumber(data.customer.currentPendingCylinders)}
          subtitle="Outstanding empty cylinders"
        />
        <StatCard
          title="Outstanding amount"
          value={formatCurrency(data.customer.totalCreditBalance)}
          subtitle="Current customer credit balance"
          tone="amber"
        />
        <StatCard
          title="Last delivery date"
          value={formatDate(data.customer.lastDeliveryDate)}
          subtitle="Most recent filled issue"
          tone="blue"
        />
        <StatCard
          title="Saved entries"
          value={formatNumber(data.transactions.length)}
          subtitle="Complete running transaction history"
          tone="green"
        />
      </div>

      <Card className="p-5">
        <SectionHeading
          eyebrow="Full ledger"
          title="Running history"
          description="Each row already includes recalculated pending cylinders after that transaction."
          compact
        />

        {data.transactions.length === 0 ? (
          <EmptyState
            title="No transactions yet"
            description="This customer does not have any delivery or payment entries."
          />
        ) : (
          <div className="space-y-3">
            <div className="space-y-3 lg:hidden">
              {data.transactions.map((item) => (
                <div
                  key={item._id}
                  className="rounded-3xl border border-slate-100 bg-slate-50 px-4 py-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-ink">
                        {formatDate(item.date)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {getEntryTypeLabel(item)}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-ink">
                      Pending {formatNumber(item.currentPending)}
                    </p>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
                    <p>Filled: {item.filledDelivered}</p>
                    <p>Returned: {item.emptyReturned}</p>
                    <p>Prev pending: {item.previousPending}</p>
                    <p>Mode: {getPaymentModeLabel(item.paymentMode)}</p>
                    <p>Amount: {formatCurrency(item.totalAmount)}</p>
                    <p>Paid: {formatCurrency(item.paidAmount)}</p>
                  </div>

                  {item.notes ? (
                    <p className="mt-3 text-xs text-slate-500">{item.notes}</p>
                  ) : null}
                </div>
              ))}
            </div>

            <div className="hidden overflow-x-auto rounded-[2rem] border border-slate-200 lg:block">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    {[
                      "Date",
                      "Type",
                      "Filled",
                      "Returned",
                      "Prev pending",
                      "Current pending",
                      "Amount",
                      "Paid",
                      "Collection",
                      "Mode",
                      "Notes",
                    ].map((heading) => (
                      <th key={heading} className="px-4 py-4 font-semibold">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.transactions.map((item) => (
                    <tr key={item._id} className="border-t border-slate-100">
                      <td className="px-4 py-4">{formatDate(item.date)}</td>
                      <td className="px-4 py-4">{getEntryTypeLabel(item)}</td>
                      <td className="px-4 py-4">{item.filledDelivered}</td>
                      <td className="px-4 py-4">{item.emptyReturned}</td>
                      <td className="px-4 py-4">{item.previousPending}</td>
                      <td className="px-4 py-4 font-semibold text-ink">
                        {item.currentPending}
                      </td>
                      <td className="px-4 py-4">
                        {formatCurrency(item.totalAmount)}
                      </td>
                      <td className="px-4 py-4">
                        {formatCurrency(item.paidAmount)}
                      </td>
                      <td className="px-4 py-4">
                        {getPaymentStatusLabel(item)}
                      </td>
                      <td className="px-4 py-4">
                        {getPaymentModeLabel(item.paymentMode)}
                      </td>
                      <td className="max-w-60 px-4 py-4 text-slate-500">
                        {item.notes || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
