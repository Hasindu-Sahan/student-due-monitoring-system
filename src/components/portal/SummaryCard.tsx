import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type Tone = "primary" | "success" | "destructive" | "warning";

const tones: Record<Tone, string> = {
  primary: "bg-primary-soft text-primary",
  success: "bg-success-soft text-success",
  destructive: "bg-destructive-soft text-destructive",
  warning: "bg-warning-soft text-warning",
};

export function SummaryCard({
  label,
  value,
  tone = "primary",
  icon: Icon,
  hint,
}: {
  label: string;
  value: string;
  tone?: Tone;
  icon?: LucideIcon;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-card transition hover:shadow-soft">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        {Icon && (
          <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", tones[tone])}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </div>
  );
}