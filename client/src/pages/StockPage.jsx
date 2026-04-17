import { AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";

import { StockMovementForm } from "../components/StockMovementForm";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { Loader } from "../components/ui/Loader";
import { SectionHeading } from "../components/ui/SectionHeading";
import { StatCard } from "../components/ui/StatCard";
import { apiFetch } from "../lib/api";
import { formatCurrency, formatDate, formatNumber } from "../lib/utils";

export function StockPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadOverview() {
    const response = await apiFetch("/api/stock/summary");
    setData(response);
  }

  useEffect(() => {
    async function load() {
      try {
        await loadOverview();
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  if (loading) {
    return <Loader label="Loading stock dashboard..." />;
  }

  const historyRows = data.history || [];
  const registerRows = data.register || [];

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Godown control"
        title="Stock management"
        description="Maintain filled stock, empty stock, issued cylinders, and daily stock register."
      />

      {data.summary.isLowStock ? (
        <Card className="border-amber-200 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-1 text-amber-600" size={20} />
            <div>
              <h4 className="font-semibold text-ink">Low stock alert</h4>
              <p className="mt-1 text-sm text-slate-600">
                Filled stock is {data.summary.filledStock}, below threshold{" "}
                {data.summary.lowStockThreshold}.
              </p>
            </div>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          title="Filled LPG stock"
          value={formatNumber(data.summary.filledStock)}
          subtitle="Ready for delivery"
        />
        <StatCard
          title="Empty cylinder stock"
          value={formatNumber(data.summary.emptyStock)}
          subtitle="Returned / godown stock"
          tone="amber"
        />
        <StatCard
          title="Issued cylinders"
          value={formatNumber(data.summary.issuedStock)}
          subtitle="Currently with customers"
          tone="rose"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-6">
          <SectionHeading
            eyebrow="Record movement"
            title="Stock inward / refill / adjustment"
            description="Use one form for all stock bucket changes."
            compact
          />
          <StockMovementForm onSaved={loadOverview} />
        </div>

        <Card className="p-5">
          <SectionHeading
            eyebrow="Movement history"
            title="Recent stock activity"
            description="Customer deliveries and manual stock movements in one timeline."
            compact
          />

          {historyRows.length > 0 ? (
            <div className="space-y-3">
              {historyRows.map((item) => (
                <div
                  key={item.id}
                  className="rounded-3xl border border-slate-100 bg-slate-50 px-4 py-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold text-ink">{item.label}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatDate(item.date)}
                      </p>
                    </div>
                    <div className="text-sm sm:text-right">
                      <p>
                        Filled {item.deltaFilled > 0 ? "+" : ""}
                        {item.deltaFilled}
                      </p>
                      <p>
                        Empty {item.deltaEmpty > 0 ? "+" : ""}
                        {item.deltaEmpty}
                      </p>
                    </div>
                  </div>
                  {item.notes ? (
                    <p className="mt-2 text-sm text-slate-500">{item.notes}</p>
                  ) : null}
                  {Number(item.totalPrice || 0) > 0 ? (
                    <p className="mt-1 text-xs font-semibold text-slate-600">
                      Fill-up value {formatCurrency(item.totalPrice)} | Per
                      cylinder {formatCurrency(item.pricePerCylinder || 0)}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No stock movement yet"
              description="As soon as you add stock inward, refill conversion, delivery, or return, it will show here."
            />
          )}
        </Card>
      </div>

      <Card className="p-5">
        <SectionHeading
          eyebrow="Daily register"
          title="Last 7 days stock register"
          description="Opening and closing balance for filled, empty, and issued buckets."
          compact
        />

        {registerRows.length > 0 ? (
          <div className="space-y-3">
            <div className="space-y-3 lg:hidden">
              {registerRows.map((row) => (
                <div
                  key={row.date}
                  className="rounded-3xl border border-slate-100 bg-slate-50 px-4 py-4"
                >
                  <p className="text-sm font-semibold text-ink">
                    {formatDate(row.date)}
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
                    <p>Opening filled: {row.openingFilled}</p>
                    <p>Delivered: {row.deliveredOut}</p>
                    <p>Filled in: {row.filledIn}</p>
                    <p>Empty in: {row.emptyIn}</p>
                    <p>Refill: {row.refillConverted}</p>
                    <p>Closing filled: {row.closingFilled}</p>
                    <p>Closing empty: {row.closingEmpty}</p>
                    <p>Closing issued: {row.closingIssued}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden overflow-x-auto lg:block">
              <table className="min-w-full text-left text-sm">
                <thead className="text-slate-500">
                  <tr>
                    {[
                      "Date",
                      "Opening filled",
                      "Delivered",
                      "Filled in",
                      "Empty in",
                      "Refill",
                      "Closing filled",
                      "Closing empty",
                      "Closing issued",
                    ].map((heading) => (
                      <th key={heading} className="px-3 py-3 font-semibold">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {registerRows.map((row) => (
                    <tr key={row.date} className="border-t border-slate-100">
                      <td className="px-3 py-3">{formatDate(row.date)}</td>
                      <td className="px-3 py-3">{row.openingFilled}</td>
                      <td className="px-3 py-3">{row.deliveredOut}</td>
                      <td className="px-3 py-3">{row.filledIn}</td>
                      <td className="px-3 py-3">{row.emptyIn}</td>
                      <td className="px-3 py-3">{row.refillConverted}</td>
                      <td className="px-3 py-3">{row.closingFilled}</td>
                      <td className="px-3 py-3">{row.closingEmpty}</td>
                      <td className="px-3 py-3">{row.closingIssued}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <EmptyState
            title="No stock register rows yet"
            description="The register will appear only after real stock movement or a non-zero opening balance exists."
          />
        )}
      </Card>
    </div>
  );
}
