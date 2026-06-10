"use client";

import { useEffect, useState } from "react";
import { ArrowUpDown, Pencil, Save, Search, Trash2, Users } from "lucide-react";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { lkr } from "@/lib/data";

type Fee = {
  feeId: number;
  type: string;
  feeTypeId: number;
  category: string;
  amount: number;
  due: string;
  assignedCount?: number;
};
type AdminProfile = { firstName: string; lastName: string; designation: string };
type Options = { faculties: string[]; levels: number[] };

function localDateInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function sanitizeAmount(value: string) {
  const sanitized = value.replace(/[^\d.]/g, "");
  const [whole, ...rest] = sanitized.split(".");
  return rest.length > 0 ? `${whole}.${rest.join("").slice(0, 2)}` : whole;
}

function normalizeAmount(value: string) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount.toFixed(2) : value;
}

const today = localDateInputValue();

const inputClass =
  "h-10 w-full rounded-xl border bg-card px-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10";

export default function FeeManagement() {
  const [fees, setFees] = useState<Fee[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Fee | null>(null);
  const [admin, setAdmin] = useState<AdminProfile>({ firstName: "Admin", lastName: "", designation: "" });
  const [sessionUserId, setSessionUserId] = useState<number | null>(null);
  const [options, setOptions] = useState<Options>({ faculties: [], levels: [] });
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [receiverType, setReceiverType] = useState<"faculty" | "student">("faculty");
  const [updateReceivers, setUpdateReceivers] = useState(false);
  const [faculty, setFaculty] = useState("all");
  const [level, setLevel] = useState("all");
  const [studentId, setStudentId] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");

  const loadFees = () => {
    setLoading(true);
    fetch("/api/admin/fees")
      .then((r) => r.json())
      .then((data) => {
        const nextFees = Array.isArray(data) ? data : [];
        setFees(nextFees);
        setSelected((current) => {
          if (!current) return nextFees[0] ?? null;
          return nextFees.find((fee) => fee.feeId === current.feeId) ?? nextFees[0] ?? null;
        });
      })
      .catch(() => setFees([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const stored = localStorage.getItem("portalUser");
    const session = stored ? JSON.parse(stored) : null;
    setSessionUserId(session?.userId ?? null);

    const params = new URLSearchParams();
    if (session?.userId) params.set("userId", String(session.userId));
    if (session?.username) params.set("username", session.username);
    const accountQuery = params.toString() ? `?${params.toString()}` : "";

    loadFees();
    fetch(`/api/admin/account${accountQuery}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) setAdmin(data);
      });
    fetch("/api/admin/payments-options")
      .then((r) => r.json())
      .then((data) => setOptions({ faculties: data.faculties ?? [], levels: data.levels ?? [] }));
  }, []);

  useEffect(() => {
    if (!selected) return;
    setCategory(selected.category);
    setAmount(String(selected.amount));
    setDueDate(selected.due);
    setUpdateReceivers(false);
    setMessage("");
  }, [selected]);

  const handleEdit = async () => {
    if (!selected) return;
    setMessage("");
    const normalizedAmount = normalizeAmount(amount);

    if (!category.trim() || !amount || !dueDate) {
      setMessageType("error");
      setMessage("Please fill all required fields.");
      return;
    }

    if (!/^\d+(\.\d{2})$/.test(normalizedAmount) || Number(normalizedAmount) <= 0) {
      setMessageType("error");
      setMessage("Amount must be a valid positive number.");
      return;
    }

    if (dueDate < today) {
      setMessageType("error");
      setMessage("Due date cannot be a previous day.");
      return;
    }

    if (updateReceivers && receiverType === "student" && !studentId.trim()) {
      setMessageType("error");
      setMessage("Please enter the student ID.");
      return;
    }

    const receiverFilters = updateReceivers
      ? receiverType === "faculty"
        ? { faculty, level }
        : { studentId: studentId.trim() }
      : undefined;

    const response = await fetch("/api/admin/fees", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        feeId: selected.feeId,
        category,
        amount: Number(normalizedAmount),
        dueDate,
        receiverFilters,
        userId: sessionUserId,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      setMessageType("error");
      setMessage(data.error ?? "Failed to update fee");
      return;
    }

    setMessageType("success");
    setMessage(`Fee updated for ${data.assignedCount} receiver${data.assignedCount === 1 ? "" : "s"}.`);
    loadFees();
  };

  const handleDelete = async (feeId: number) => {
    if (!confirm("Delete this fee?")) return;
    await fetch("/api/admin/fees", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ feeId, userId: sessionUserId }),
    });
    loadFees();
  };

  return (
    <PortalLayout
      role="admin"
      user={{
        name: `${admin.firstName} ${admin.lastName}`.trim(),
        sub: admin.designation,
        initials: `${admin.firstName?.[0] ?? "A"}${admin.lastName?.[0] ?? ""}`,
      }}
      title="Fee Management"
      subtitle="Edit fee details and receivers"
    >
      <div className="space-y-6">
        <section className="rounded-2xl border bg-card p-6 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Edit Current Fee</h2>
              <p className="text-xs text-muted-foreground">Update fee details and assign receivers again</p>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-warning-soft text-warning">
              <Pencil className="h-4 w-4" />
            </span>
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Select fee</span>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <select
                    value={selected?.feeId ?? ""}
                    onChange={(event) => setSelected(fees.find((fee) => fee.feeId === Number(event.target.value)) ?? null)}
                    className="h-10 w-full appearance-none rounded-xl border bg-card pl-10 pr-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                  >
                    {fees.map((fee) => (
                      <option key={fee.feeId} value={fee.feeId}>
                        {fee.type}
                      </option>
                    ))}
                  </select>
                </div>
              </label>

              <div className="grid gap-4 sm:grid-cols-3">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Category</span>
                  <input required value={category} onChange={(event) => setCategory(event.target.value)} className={inputClass} />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Amount (LKR)</span>
                  <input required type="text" inputMode="decimal" value={amount} onBlur={() => setAmount((value) => normalizeAmount(value))} onChange={(event) => setAmount(sanitizeAmount(event.target.value))} className={inputClass} />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Due Date</span>
                  <input required type="date" min={today} value={dueDate} onChange={(event) => setDueDate(event.target.value)} className={inputClass} />
                </label>
              </div>
            </div>

            <div className="rounded-xl border bg-muted/25 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Users className="h-4 w-4 text-primary" />
                Edit Receivers
              </div>
              <label className="mt-4 flex items-center gap-2 rounded-xl border bg-card px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={updateReceivers}
                  onChange={(event) => setUpdateReceivers(event.target.checked)}
                  className="h-4 w-4 accent-primary"
                />
                Update receivers for this fee
              </label>
              <div className={`mt-4 grid grid-cols-2 gap-2 rounded-xl border bg-card p-1 ${updateReceivers ? "" : "opacity-50"}`}>
                <button
                  type="button"
                  onClick={() => setReceiverType("faculty")}
                  disabled={!updateReceivers}
                  className={`h-9 rounded-lg text-sm font-medium transition ${receiverType === "faculty" ? "bg-primary text-primary-foreground shadow-soft" : "text-muted-foreground"}`}
                >
                  Faculty
                </button>
                <button
                  type="button"
                  onClick={() => setReceiverType("student")}
                  disabled={!updateReceivers}
                  className={`h-9 rounded-lg text-sm font-medium transition ${receiverType === "student" ? "bg-primary text-primary-foreground shadow-soft" : "text-muted-foreground"}`}
                >
                  Student
                </button>
              </div>

              {receiverType === "faculty" ? (
                <div className={`mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1 ${updateReceivers ? "" : "pointer-events-none opacity-50"}`}>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Faculty</span>
                    <select disabled={!updateReceivers} value={faculty} onChange={(event) => setFaculty(event.target.value)} className={inputClass}>
                      <option value="all">All faculties</option>
                      {options.faculties.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Level</span>
                    <select disabled={!updateReceivers} value={level} onChange={(event) => setLevel(event.target.value)} className={inputClass}>
                      <option value="all">All levels</option>
                      {options.levels.map((item) => (
                        <option key={item} value={String(item)}>
                          Level {item}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              ) : (
                <label className={`mt-4 block ${updateReceivers ? "" : "pointer-events-none opacity-50"}`}>
                  <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Student ID</span>
                  <input disabled={!updateReceivers} value={studentId} onChange={(event) => setStudentId(event.target.value)} className={inputClass} />
                </label>
              )}
            </div>
          </div>

          <div className="mt-5 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <p className="text-sm text-muted-foreground">
              Current receivers: <span className="font-semibold text-foreground">{selected?.assignedCount ?? 0}</span>
            </p>
            <div className="flex items-center gap-3">
              {message && <span className={`text-sm ${messageType === "error" ? "text-destructive" : "text-muted-foreground"}`}>{message}</span>}
              <button
                type="button"
                onClick={handleEdit}
                disabled={!selected}
                className="inline-flex items-center gap-2 rounded-xl bg-warning px-4 py-2.5 text-sm font-semibold text-warning-foreground shadow-soft transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save className="h-4 w-4" /> Update Fee
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border bg-card p-6 shadow-card">
          <div className="flex items-center justify-between border-b px-2 pb-4">
            <div>
              <h2 className="text-base font-semibold">All Fee Types</h2>
              <p className="text-xs text-muted-foreground">{fees.length} fee definitions</p>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  {["Fee Type", "Category", "Amount", "Due Date", "Receivers", "Actions"].map((heading) => (
                    <th key={heading} className="px-6 py-3 font-medium">
                      <span className="inline-flex items-center gap-1.5">
                        {heading} <ArrowUpDown className="h-3 w-3 opacity-50" />
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                      Loading...
                    </td>
                  </tr>
                ) : fees.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                      No fees yet
                    </td>
                  </tr>
                ) : (
                  fees.map((fee) => (
                    <tr key={fee.feeId} className="border-b last:border-0 transition hover:bg-muted/30">
                      <td className="px-6 py-4 font-medium">{fee.type}</td>
                      <td className="px-6 py-4">
                        <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                          {fee.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-semibold tabular-nums">{lkr(fee.amount)}</td>
                      <td className="px-6 py-4 text-muted-foreground">{fee.due}</td>
                      <td className="px-6 py-4 tabular-nums">{fee.assignedCount ?? 0}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelected(fee)}
                            className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-primary hover:text-primary"
                          >
                            <Pencil className="h-3.5 w-3.5" /> Edit
                          </button>
                          <button
                            onClick={() => handleDelete(fee.feeId)}
                            className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium text-destructive transition hover:bg-destructive-soft"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </PortalLayout>
  );
}
