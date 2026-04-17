import { motion } from "framer-motion";

import { Card } from "./Card";

export function StatCard({ title, value, subtitle, icon: Icon, tone = "green" }) {
  const tones = {
    green: {
      chip: "bg-emerald-100 text-emerald-700",
      line: "from-emerald-500/20 to-transparent",
    },
    amber: {
      chip: "bg-amber-100 text-amber-700",
      line: "from-amber-500/20 to-transparent",
    },
    rose: {
      chip: "bg-rose-100 text-rose-700",
      line: "from-rose-500/20 to-transparent",
    },
    blue: {
      chip: "bg-sky-100 text-sky-700",
      line: "from-sky-500/20 to-transparent",
    },
  };

  const selectedTone = tones[tone] || tones.green;

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="relative overflow-hidden">
        <div
          className={`absolute inset-x-0 top-0 h-16 bg-gradient-to-b ${selectedTone.line}`}
        />
        <div className="relative flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              {title}
            </p>
            <p className="mt-4 truncate text-3xl font-bold tracking-tight text-ink">
              {value}
            </p>
            {subtitle ? (
              <p className="mt-3 text-sm leading-6 text-slate-500">{subtitle}</p>
            ) : null}
          </div>

          {Icon ? (
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.2rem] ${selectedTone.chip}`}
            >
              <Icon size={22} />
            </div>
          ) : null}
        </div>
      </Card>
    </motion.div>
  );
}
