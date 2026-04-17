import { PlusCircle, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { cn, formatCurrency } from "../lib/utils";
import { Button } from "./ui/Button";

export function CustomerCombobox({
  customers,
  value,
  onChange,
  onAddCustomer,
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const selectedCustomer = useMemo(
    () => customers.find((customer) => String(customer._id) === String(value)),
    [customers, value],
  );

  useEffect(() => {
    setQuery(selectedCustomer?.name || "");
  }, [selectedCustomer?.name]);

  const filteredCustomers = useMemo(() => {
    if (!query.trim()) {
      return customers.slice(0, 12);
    }

    return customers
      .filter((customer) =>
        `${customer.name} ${customer.phone} ${customer.address}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      )
      .slice(0, 12);
  }, [customers, query]);

  return (
    <div className="relative">
      <div className="control-base flex items-center gap-3 px-4">
        <Search size={17} className="shrink-0 text-slate-400" />
        <input
          value={query}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 140)}
          onChange={(event) => {
            setQuery(event.target.value);
            onChange("");
            setOpen(true);
          }}
          className="w-full border-none bg-transparent p-0 text-sm outline-none placeholder:text-slate-400"
          placeholder="Search customer by name, phone, or area"
        />
      </div>

      {open ? (
        <div className="surface absolute z-30 mt-3 w-full overflow-hidden p-2">
          <Button
            variant="secondary"
            className="mb-2 w-full justify-start"
            onMouseDown={(event) => {
              event.preventDefault();
              onAddCustomer();
            }}
          >
            <PlusCircle size={16} />
            Add new customer
          </Button>

          <div className="max-h-72 space-y-1 overflow-auto pr-1">
            {filteredCustomers.length > 0 ? (
              filteredCustomers.map((customer) => (
                <button
                  key={customer._id}
                  type="button"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    onChange(String(customer._id));
                    setQuery(customer.name);
                    setOpen(false);
                  }}
                    className={cn(
                      "w-full rounded-[1.35rem] border border-transparent px-3 py-3 text-left transition hover:border-slate-200 hover:bg-slate-50",
                      String(customer._id) === String(value) &&
                      "border-accent/20 bg-accent/5",
                    )}
                  >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">
                        {customer.name}
                      </p>
                      <p className="mt-1 truncate text-xs text-slate-500">
                        {customer.phone || "No phone"} | {customer.address || "No address"}
                      </p>
                    </div>
                    <div className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                      {customer.currentPendingCylinders} pending
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-medium text-slate-500">
                    <span className="rounded-full bg-white px-2.5 py-1 shadow-panel">
                      Last rate {formatCurrency(customer.lastRate || 0)}
                    </span>
                    <span className="rounded-full bg-white px-2.5 py-1 shadow-panel">
                      Credit {formatCurrency(customer.totalCreditBalance || 0)}
                    </span>
                  </div>
                </button>
              ))
            ) : (
              <div className="rounded-[1.35rem] bg-slate-50 px-4 py-5 text-sm text-slate-500">
                No matching customer found.
              </div>
            )}
          </div>
        </div>
      ) : null}

      {!selectedCustomer ? (
        <p className="mt-2 px-1 text-xs font-medium text-slate-400">
          Repeat customer search is optimized for one-tap selection.
        </p>
      ) : null}
    </div>
  );
}
