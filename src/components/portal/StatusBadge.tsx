import { cn } from "@/lib/utils";

const map: Record<string, string> = {
  Paid: "bg-success-soft text-success",
  Approved: "bg-success-soft text-success",
  Due: "bg-warning-soft text-warning",
  Pending: "bg-primary-soft text-primary",
  Overdue: "bg-destructive-soft text-destructive",
  Rejected: "bg-destructive-soft text-destructive",
};

// "Pending" approvals in admin show as orange per spec
const approvalMap: Record<string, string> = {
  Approved: "bg-success-soft text-success",
  Pending: "bg-warning-soft text-warning",
  Rejected: "bg-destructive-soft text-destructive",
};

export function StatusBadge({
  status,
  variant = "fee",
}: {
  status: string;
  variant?: "fee" | "approval";
}) {
  const styles = (variant === "approval" ? approvalMap : map)[status] ?? "bg-muted text-muted-foreground";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        styles
      )}
    >
      <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {status}
    </span>
  );
}