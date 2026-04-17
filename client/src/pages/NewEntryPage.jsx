import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { CustomerFormModal } from "../components/CustomerFormModal";
import { TransactionForm } from "../components/TransactionForm";
import { Button } from "../components/ui/Button";
import { Loader } from "../components/ui/Loader";
import { SectionHeading } from "../components/ui/SectionHeading";
import { apiFetch } from "../lib/api";

export function NewEntryPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  async function loadCustomers() {
    const response = await apiFetch("/api/customers");
    setCustomers(response.customers);
  }

  useEffect(() => {
    async function load() {
      try {
        await loadCustomers();
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  if (loading) {
    return <Loader label="Loading entry form..." />;
  }

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Daily operations"
        title="New delivery / return / settlement"
        action={
          <Button
            variant="secondary"
            className="w-full sm:w-auto"
            onClick={async () => {
              try {
                await loadCustomers();
                toast.success("Customer list refreshed");
              } catch (error) {
                toast.error(error.message);
              }
            }}
          >
            <RefreshCw size={16} />
            Refresh customers
          </Button>
        }
      />

      <TransactionForm
        customers={customers}
        onAddCustomer={() => setModalOpen(true)}
        onSaved={async () => {
          await loadCustomers();
        }}
      />

      <CustomerFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={(customer) => {
          setCustomers((current) => [customer, ...current]);
        }}
      />
    </div>
  );
}
