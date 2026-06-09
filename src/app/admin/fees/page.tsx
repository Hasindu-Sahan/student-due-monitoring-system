"use client";

import React, { useState, useEffect, useRef, forwardRef } from "react";

import { PortalLayout } from "@/components/portal/PortalLayout";
import { lkr } from "@/lib/data";
import { Plus, Save, Pencil, Trash2, Search, ArrowUpDown } from "lucide-react";

type Fee = { feeId: number; type: string; feeTypeId: number; category: string; amount: number; due: string; year: string };
type AdminProfile = { firstName: string; lastName: string; designation: string };

type InputProps = { label: string } & React.InputHTMLAttributes<HTMLInputElement>;

const Input = forwardRef<HTMLInputElement, InputProps>(({ label, className, ...props }, ref) => {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      <input
        ref={ref}
        {...props}
        className={`h-10 w-full rounded-xl border bg-card px-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 ${className ?? ""}`}
      />
    </label>
  );
});
Input.displayName = "Input";

export default function FeeManagement() {
  const [fees, setFees] = useState<Fee[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Fee | null>(null);
  const [admin, setAdmin] = useState<AdminProfile>({ firstName: "Admin", lastName: "", designation: "" });
  const [sessionUserId, setSessionUserId] = useState<number | null>(null);

  // Edit form refs
  const editCategory = useRef<HTMLInputElement>(null);
  const editAmount = useRef<HTMLInputElement>(null);
  const editDue = useRef<HTMLInputElement>(null);

  const load = () => {
    setLoading(true);
    fetch("/api/admin/fees")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setFees(data);
        else setFees([]);
        setLoading(false);
      })
      .catch(() => {
        setFees([]);
        setLoading(false);
      });
  };

  useEffect(() => {
    const stored = localStorage.getItem("portalUser");
    const session = stored ? JSON.parse(stored) : null;
    setSessionUserId(session?.userId ?? null);

    const params = new URLSearchParams();
    if (session?.userId) params.set("userId", String(session.userId));
    if (session?.username) params.set("username", session.username);
    const accountQuery = params.toString() ? `?${params.toString()}` : "";

    load();
    fetch(`/api/admin/account${accountQuery}`).then((r) => r.json()).then((data) => {
      if (!data.error) setAdmin(data);
    });
  }, []);

  useEffect(() => {
    if (fees.length > 0 && !selected) setSelected(fees[0]);
  }, [fees, selected]);

  const handleEdit = async () => {
    if (!selected || !editCategory.current?.value || !editAmount.current?.value) return;

    await fetch("/api/admin/fees", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        feeId: selected.feeId,
        category: editCategory.current?.value ?? selected.category,
        amount: parseFloat(editAmount.current?.value ?? String(selected.amount)),
        dueDate: editDue.current?.value || null,
        userId: sessionUserId,
      }),
    });

    load();
  };

  const handleDelete = async (feeId: number) => {
    if (!confirm("Delete this fee?")) return;
    await fetch("/api/admin/fees", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ feeId, userId: sessionUserId }),
    });
    load();
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
      subtitle="Manage recently added fee types and amounts"
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border bg-card p-6 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Edit Current Fee</h2>
              <p className="text-xs text-muted-foreground">Update an existing fee definition</p>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-warning-soft text-warning">
              <Pencil className="h-4 w-4" />
            </span>
          </div>

          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Select fee</span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <select
                  value={selected?.feeId ?? ""}
                  onChange={(e) => setSelected(fees.find((f) => f.feeId === parseInt(e.target.value)) ?? null)}
                  className="h-10 w-full appearance-none rounded-xl border bg-card pl-10 pr-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                >
                  {fees.map((f) => (
                    <option key={f.feeId} value={f.feeId}>
                      {f.type}
                    </option>
                  ))}
                </select>
              </div>
            </label>

            {selected && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Category" defaultValue={selected.category} ref={editCategory} key={`cat-${selected.feeId}`} />
                <Input
                  label="Amount (LKR)"
                  defaultValue={String(selected.amount)}
                  type="number"
                  ref={editAmount}
                  key={`amt-${selected.feeId}`}
                />
                <Input
                  label="Due Date (optional)"
                  type="date"
                  defaultValue={selected.due}
                  ref={editDue}
                  key={`due-${selected.feeId}`}
                />
              </div>
            )}
          </div>

          <div className="mt-5 flex justify-end">
            <button
              onClick={handleEdit}
              className="inline-flex items-center gap-2 rounded-xl bg-warning px-4 py-2.5 text-sm font-semibold text-warning-foreground shadow-soft transition hover:opacity-90"
            >
              <Save className="h-4 w-4" /> Update Fee
            </button>
          </div>
        </section>

        <section className="rounded-2xl border bg-card p-6 shadow-card">
          <div className="flex items-center justify-between border-b px-2 pb-4">
            <div>
              <h2 className="text-base font-semibold">All Fee Types</h2>
              <p className="text-xs text-muted-foreground">{fees.length} fee definitions</p>
            </div>
            <span className="hidden">
              <Plus className="h-4 w-4" />
            </span>
          </div>

          <div className="overflow-x-auto mt-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  {["Fee Type", "Category", "Amount", "Due Date", "Actions"].map((h) => (
                    <th key={h} className="px-6 py-3 font-medium">
                      <span className="inline-flex items-center gap-1.5">
                        {h} <ArrowUpDown className="h-3 w-3 opacity-50" />
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
                  fees.map((f) => (
                    <tr key={f.feeId} className="border-b last:border-0 transition hover:bg-muted/30">
                      <td className="px-6 py-4 font-medium">{f.type}</td>
                      <td className="px-6 py-4">
                        <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                          {f.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-semibold tabular-nums">{lkr(f.amount)}</td>
                      <td className="px-6 py-4 text-muted-foreground">{f.due}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelected(f)}
                            className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-primary hover:text-primary"
                          >
                            <Pencil className="h-3.5 w-3.5" /> Edit
                          </button>
                          <button
                            onClick={() => handleDelete(f.feeId)}
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

