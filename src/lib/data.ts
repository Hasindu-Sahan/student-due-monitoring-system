export const lkr = (value: number | string | null | undefined) => {
  const numeric = typeof value === "number" ? value : Number(value);
  const safeValue = Number.isFinite(numeric) ? numeric : 0;
  return "LKR " + safeValue.toLocaleString("en-LK", { minimumFractionDigits: 0 });
};

export type FeeStatus = "Due" | "Pending" | "Paid" | "Overdue";
export type Approval = "Approved" | "Pending" | "Rejected";
