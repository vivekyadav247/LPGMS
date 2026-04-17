import { ArrowRight, Edit3, Phone, PlusCircle, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { CustomerFormModal } from "../components/CustomerFormModal";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { Input } from "../components/ui/Input";
import { Loader } from "../components/ui/Loader";
import { SectionHeading } from "../components/ui/SectionHeading";
import { apiFetch } from "../lib/api";
import { formatCurrency, formatDate } from "../lib/utils";

export function CustomersPage() {
  const [search, setSearch] = useState("");
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);

  async function loadCustomers(currentSearch = search) {
    const response = await apiFetch(
      `/api/customers?search=${encodeURIComponent(currentSearch)}`,
    );
    setCustomers(response.customers);
  }

  useEffect(() => {
    async function load() {
      try {
        await loadCustomers("");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  if (loading) {
    return <Loader label="Loading customers..." />;
  }

  async function handleDelete(customer) {
    const confirmed = window.confirm(
      `Delete ${customer.name}? This works only when the customer has no active transactions.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      await apiFetch(`/api/customers/${customer._id}`, {
        method: "DELETE",
      });
      toast.success("Customer deleted");
      await loadCustomers(search);
    } catch (error) {
      toast.error(error.message);
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Ledger parties"
        title="Customers"
        description="Browse all hotels, homes, restaurants, and bulk parties with live pending and credit."
        action={
          <Button
            size="lg"
            className="w-full sm:w-auto"
            onClick={() => {
              setEditingCustomer(null);
              setModalOpen(true);
            }}
          >
            <PlusCircle size={16} />
            Add customer
          </Button>
        }
      />

      <Card className="p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by customer name or phone"
          />
          <Button
            variant="secondary"
            onClick={async () => {
              try {
                await loadCustomers(search);
              } catch (error) {
                toast.error(error.message);
              }
            }}
          >
            Search
          </Button>
        </div>
      </Card>

      {customers.length === 0 ? (
        <EmptyState
          title="No customers found"
          description="Add the first customer or change the search text."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {customers.map((customer) => {
            const canDelete = customer.canDelete === true;

            return (
              <Card key={customer._id}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xl font-bold text-ink">
                      {customer.name}
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-500">
                      {customer.customerType}
                    </p>
                  </div>
                  <div className="rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
                    Pending {customer.currentPendingCylinders}
                  </div>
                </div>

                <div className="mt-5 space-y-3 text-sm text-slate-600">
                  <p className="flex items-center gap-2">
                    <Phone size={14} />
                    {customer.phone || "No phone"}
                  </p>
                  <p>{customer.address || "No address saved"}</p>
                  <p>
                    Credit balance:{" "}
                    {formatCurrency(customer.totalCreditBalance)}
                  </p>
                  <p>Last delivery: {formatDate(customer.lastDeliveryDate)}</p>
                  {!canDelete ? (
                    <p className="text-xs font-semibold text-slate-500">
                      Delete available after all active transactions are
                      removed.
                    </p>
                  ) : null}
                </div>

                <div className="mt-6">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    <Link
                      to={`/customers/${customer._id}`}
                      className="col-span-2 sm:col-span-3"
                    >
                      <Button
                        variant="secondary"
                        className="w-full justify-between"
                      >
                        Open ledger
                        <ArrowRight size={16} />
                      </Button>
                    </Link>
                    <Button
                      variant="secondary"
                      className={`w-full ${!canDelete ? "col-span-2 sm:col-span-3" : ""}`}
                      onClick={() => {
                        setEditingCustomer(customer);
                        setModalOpen(true);
                      }}
                    >
                      <Edit3 size={14} />
                      Edit
                    </Button>
                    {canDelete ? (
                      <Button
                        variant="danger"
                        className="w-full sm:col-span-2"
                        onClick={() => handleDelete(customer)}
                      >
                        <Trash2 size={14} />
                        Delete
                      </Button>
                    ) : null}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <CustomerFormModal
        open={modalOpen}
        customer={editingCustomer}
        onClose={() => {
          setModalOpen(false);
          setEditingCustomer(null);
        }}
        onCreated={(customer) => {
          setCustomers((current) => [customer, ...current]);
        }}
        onSaved={(customer) => {
          setCustomers((current) =>
            current.map((row) => (row._id === customer._id ? customer : row)),
          );
        }}
      />
    </div>
  );
}
