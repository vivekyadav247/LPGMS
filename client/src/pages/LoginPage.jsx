import { zodResolver } from "@hookform/resolvers/zod";
import { LockKeyhole, ShieldCheck, UserRound } from "lucide-react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Field } from "../components/ui/Field";
import { Input } from "../components/ui/Input";
import { useAuth } from "../context/AuthContext";
import { loginSchema } from "../validators/schemas";

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: "",
      password: "",
      remember: true,
    },
  });

  async function onSubmit(values) {
    try {
      await login(values);
      toast.success("Welcome back");
      navigate("/");
    } catch (error) {
      toast.error(error.message);
    }
  }

  return (
    <div className="min-h-screen bg-shell px-4 py-6 sm:px-5 sm:py-8">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl items-center gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="surface-ink hidden overflow-hidden px-8 py-8 lg:block xl:px-10 xl:py-10">
          <div className="inline-flex items-center gap-3 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold">
            <ShieldCheck size={16} />
            LPGMS
          </div>

          <h1 className="mt-8 max-w-xl text-5xl font-bold leading-tight">
            Fast ledger control for daily LPG deliveries.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-white/70">
            Handle bhari delivery, khali returns, pending empty tracking, stock
            movement, and khata settlement from one clean operator dashboard.
          </p>

          <div className="mt-10 grid gap-4">
            {[
              {
                title: "Pending stays accurate",
                text: "Old balance automatically carries into every next delivery.",
              },
              {
                title: "Stock-safe billing",
                text: "Delivery blocks if filled stock is not available in godown.",
              },
              {
                title: "Udhari settlement ready",
                text: "Collect old dues separately without touching stock movement.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-[1.6rem] border border-white/10 bg-white/10 px-5 py-4"
              >
                <p className="text-sm font-semibold">{item.title}</p>
                <p className="mt-2 text-sm leading-6 text-white/70">
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </div>

        <Card className="mx-auto w-full max-w-md">
          <div className="mb-6">
            <div className="inline-flex rounded-full border border-accent/20 bg-accent/[0.08] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">
              Admin login
            </div>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink">
              LPG Cylinder Management
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Sign in using your ID and password to continue operations.
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <Field label="ID" error={errors.identifier?.message}>
              <div className="relative">
                <UserRound
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  size={16}
                />
                <Input
                  className="control-with-leading-icon"
                  placeholder="Enter your ID"
                  autoComplete="username"
                  {...register("identifier")}
                />
              </div>
            </Field>

            <Field label="Password" error={errors.password?.message}>
              <div className="relative">
                <LockKeyhole
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  size={16}
                />
                <Input
                  type="password"
                  className="control-with-leading-icon"
                  placeholder="Enter password"
                  autoComplete="current-password"
                  {...register("password")}
                />
              </div>
            </Field>

            <label className="flex items-center gap-3 rounded-[1.35rem] bg-slate-50 px-4 py-3 text-sm font-medium text-slate-600">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300"
                {...register("remember")}
              />
              Remember me on this device
            </label>

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Signing in..." : "Login to dashboard"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
