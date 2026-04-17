import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { CustomerFormModal } from "../components/CustomerFormModal";
import { TransactionForm } from "../components/TransactionForm";
import { TransactionsTable } from "../components/TransactionsTable";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Loader } from "../components/ui/Loader";
import { Modal } from "../components/ui/Modal";
import { SectionHeading } from "../components/ui/SectionHeading";
import { apiFetch } from "../lib/api";

export function TransactionsPage() {
  const [customers, setCustomers] = useState([]);
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [filters, setFilters] = useState({
    search: "",
    from: "",
    to: "",
  });
  const [loading, setLoading] = useState(true);
  const [editingRow, setEditingRow] = useState(null);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);

  const queryString = useMemo(() => {
    const params = new URLSearchParams({
      page: String(pagination.page),
      limit: String(pagination.limit),
      search: filters.search,
      from: filters.from,
      to: filters.to,
    });

    return params.toString();
  }, [
    filters.from,
    filters.search,
    filters.to,
    pagination.limit,
    pagination.page,
  ]);

  async function loadCustomers() {
    const response = await apiFetch("/api/customers");
    setCustomers(response.customers);
  }

  async function loadTransactions(showLoader = false) {
    if (showLoader) {
      setLoading(true);
    }

    try {
      const response = await apiFetch(`/api/transactions?${queryString}`);
      setRows(response.rows);
      setPagination(response.pagination);
    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        await Promise.all([loadCustomers(), loadTransactions()]);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  useEffect(() => {
    if (!loading) {
      loadTransactions();
    }
  }, [queryString]);

  async function handleDelete(row) {
    const confirmed = window.confirm(
      `Delete transaction for ${row.customer?.name || "customer"} on ${String(row.date).slice(0, 10)}?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      await apiFetch(`/api/transactions/${row._id}`, {
        method: "DELETE",
      });
      toast.success("Transaction deleted");
      await Promise.all([loadCustomers(), loadTransactions()]);
    } catch (error) {
      toast.error(error.message);
    }
  }

  if (loading) {
    return <Loader label="Loading transaction ledger..." />;
  }

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Editable table"
        title="Data table"
        description="Search, filter, export, edit delivery, return, and settlement entries with full ledger recalculation."
      />

      <Card className="p-4 sm:p-5">
        <div className="grid gap-3 lg:grid-cols-[1.3fr_1fr_1fr_auto]">
          <Input
            value={filters.search}
            onChange={(event) => {
              setPagination((current) => ({ ...current, page: 1 }));
              setFilters((current) => ({
                ...current,
                search: event.target.value,
              }));
            }}
            placeholder="Search customer"
          />
          <Input
            type="date"
            value={filters.from}
            onChange={(event) => {
              setPagination((current) => ({ ...current, page: 1 }));
              setFilters((current) => ({
                ...current,
                from: event.target.value,
              }));
            }}
          />
          <Input
            type="date"
            value={filters.to}
            onChange={(event) => {
              setPagination((current) => ({ ...current, page: 1 }));
              setFilters((current) => ({ ...current, to: event.target.value }));
            }}
          />
          <Button
            variant="secondary"
            className="w-full lg:w-auto"
            onClick={async () => {
              await Promise.all([loadCustomers(), loadTransactions(true)]);
            }}
          >
            Refresh
          </Button>
        </div>
      </Card>

      <TransactionsTable
        rows={rows}
        onEdit={setEditingRow}
        onDelete={handleDelete}
        fileLabel="lpgms-transactions"
      />

      <Card className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <p className="text-sm text-slate-500">
          Page {pagination.page} of {pagination.totalPages || 1} |{" "}
          {pagination.total} records
        </p>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-2">
          <Button
            variant="secondary"
            className="w-full"
            disabled={pagination.page <= 1}
            onClick={() =>
              setPagination((current) => ({
                ...current,
                page: current.page - 1,
              }))
            }
          >
            Previous
          </Button>
          <Button
            variant="secondary"
            className="w-full"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() =>
              setPagination((current) => ({
                ...current,
                page: current.page + 1,
              }))
            }
          >
            Next
          </Button>
        </div>
      </Card>

      <Modal
        open={Boolean(editingRow)}
        title="Edit transaction"
        description="Update the saved delivery, return, or settlement entry. Ledger and stock will recalculate automatically."
        onClose={() => setEditingRow(null)}
      >
        {editingRow ? (
          <TransactionForm
            customers={customers}
            transaction={editingRow}
            onCancel={() => setEditingRow(null)}
            onAddCustomer={() => setCustomerModalOpen(true)}
            onSaved={async () => {
              setEditingRow(null);
              await Promise.all([loadCustomers(), loadTransactions()]);
            }}
          />
        ) : null}
      </Modal>

      <CustomerFormModal
        open={customerModalOpen}
        onClose={() => setCustomerModalOpen(false)}
        onCreated={(customer) => {
          setCustomers((current) => [customer, ...current]);
        }}
      />
    </div>
  );
}
