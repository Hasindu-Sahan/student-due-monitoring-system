export const lkr = (n: number) =>
  "LKR " + n.toLocaleString("en-LK", { minimumFractionDigits: 0 });

export type FeeStatus = "Due" | "Pending" | "Paid" | "Overdue";
export type Approval = "Approved" | "Pending" | "Rejected";
