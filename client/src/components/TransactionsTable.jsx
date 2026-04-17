import { Edit3, Trash2 } from "lucide-react";

import { exportToCsv, exportToExcel } from "../lib/exports";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  getEntryTypeLabel,
  getPaymentModeLabel,
  getPaymentStatusLabel,
  getTransactionEntryType,
} from "../lib/utils";
import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";

export function TransactionsTable({
  rows,
  onEdit,
  onDelete,
  fileLabel = "transactions",
}) {
  const exportRows = rows.map((row) => ({
    "Record ID": row._id || "-",
    "Entry Date Time": formatDateTime(row.date),
    "Created At": formatDateTime(row.createdAt),
    "Updated At": formatDateTime(row.updatedAt),
    Date: formatDate(row.date),
    Customer: row.customer?.name || row.customerName || "-",
    Type: getEntryTypeLabel(row),
    "Filled Given": row.filledDelivered,
    "Empty Returned": row.emptyReturned,
    Pending: row.currentPending,
    Rate: row.rate,
    Amount:
      getTransactionEntryType(row) === "SETTLEMENT"
        ? row.paidAmount
        : row.totalAmount,
    Collection: getPaymentStatusLabel(row),
    "Payment Mode": getPaymentModeLabel(row.paymentMode),
    "Paid Amount": row.paidAmount,
    Notes: row.notes || "",
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:gap-3">
        <Button
          variant="secondary"
          className="w-full sm:w-auto"
          onClick={() =>
            exportToCsv(
              [
                Object.keys(exportRows[0] || {}),
                ...exportRows.map(Object.values),
              ],
              fileLabel,
            )
          }
          disabled={rows.length === 0}
        >
          Export CSV
        </Button>
        <Button
          variant="secondary"
          className="w-full sm:w-auto"
          onClick={() => exportToExcel(exportRows, fileLabel, "Transactions")}
          disabled={rows.length === 0}
        >
          Export Excel
        </Button>
      </div>

      <div className="surface hidden overflow-hidden p-0 lg:block">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              {[
                "Date",
                "Customer",
                "Type",
                "Returned",
                "Filled",
                "Pending",
                "Rate",
                "Amount",
                "Collection",
                "Mode",
                "Notes",
                "Actions",
              ].map((heading) => (
                <th key={heading} className="px-4 py-4 font-semibold">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row._id} className="border-t border-slate-100 align-top">
                <td className="px-4 py-4">{formatDate(row.date)}</td>
                <td className="px-4 py-4 font-semibold text-ink">
                  {row.customer?.name || "-"}
                </td>
                <td className="px-4 py-4">
                  <Badge
                    tone={
                      getTransactionEntryType(row) === "SETTLEMENT"
                        ? "default"
                        : "success"
                    }
                  >
                    {getEntryTypeLabel(row)}
                  </Badge>
                </td>
                <td className="px-4 py-4">{row.emptyReturned}</td>
                <td className="px-4 py-4">{row.filledDelivered}</td>
                <td className="px-4 py-4">{row.currentPending}</td>
                <td className="px-4 py-4">{formatCurrency(row.rate)}</td>
                <td className="px-4 py-4">
                  {formatCurrency(
                    getTransactionEntryType(row) === "SETTLEMENT"
                      ? row.paidAmount
                      : row.totalAmount,
                  )}
                </td>
                <td className="px-4 py-4">
                  <Badge
                    tone={
                      getPaymentStatusLabel(row) === "Credit"
                        ? "warn"
                        : getPaymentStatusLabel(row) === "Partial"
                          ? "default"
                          : "success"
                    }
                  >
                    {getPaymentStatusLabel(row)}
                  </Badge>
                </td>
                <td className="px-4 py-4">
                  {getPaymentModeLabel(row.paymentMode)}
                </td>
                <td className="max-w-52 px-4 py-4 text-slate-500">
                  {row.notes || "-"}
                </td>
                <td className="px-4 py-4">
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="icon"
                      onClick={() => onEdit(row)}
                    >
                      <Edit3 size={15} />
                    </Button>
                    <Button
                      variant="danger"
                      size="icon"
                      onClick={() => onDelete(row)}
                    >
                      <Trash2 size={15} />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 lg:hidden">
        {rows.map((row) => (
          <Card key={row._id} className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-ink">
                  {row.customer?.name || "-"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {formatDate(row.date)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {getEntryTypeLabel(row)}
                </p>
              </div>
              <Badge tone={row.currentPending > 0 ? "warn" : "success"}>
                Pending {row.currentPending}
              </Badge>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-600">
              <div>Filled: {row.filledDelivered}</div>
              <div>Returned: {row.emptyReturned}</div>
              <div>
                Amount:{" "}
                {formatCurrency(
                  getTransactionEntryType(row) === "SETTLEMENT"
                    ? row.paidAmount
                    : row.totalAmount,
                )}
              </div>
              <div>Paid: {formatCurrency(row.paidAmount)}</div>
              <div>{getPaymentStatusLabel(row)}</div>
              <div>{getPaymentModeLabel(row.paymentMode)}</div>
            </div>

            <div className="mt-4 flex gap-2">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => onEdit(row)}
              >
                Edit
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                onClick={() => onDelete(row)}
              >
                Delete
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
