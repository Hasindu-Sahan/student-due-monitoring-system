"use client";

import { useEffect, useState } from "react";
import { ArrowUpDown, Pencil, Save, Search, Trash2 } from "lucide-react";

import { PortalLayout } from "@/components/portal/PortalLayout";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { lkr } from "@/lib/data";
import { allowedPaymentOwnerForAdmin, paymentOwnerOptions, resolvePaymentOwner } from "@/lib/belongs-to";

type Fee = {
  feeId: number;
  type: string;
  feeTypeId: number;
  category: string;
  description: string;
  belongsTo: string;
  amount: number;
  due: string;
  dueDate?: string;
  addedDate?: string;
  receivers?: string;
  assignedCount?: number;
};
type AdminProfile = { firstName: string; lastName: string; designation: string };
type FeeSuggestion = { feeName: string; category: string; description: string };
type Options = { feeTypes: string[]; categories: string[]; feeSuggestions: FeeSuggestion[]; faculties: string[]; levels: number[] };

const belongsToOptions = paymentOwnerOptions();

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

function lockedFacultyForBelongsTo(value: string) {
  const resolved = resolvePaymentOwner(value);
  if (resolved === "FAS_Office") return "FAS";
  if (resolved === "FBSF_Office") return "FBSF";
  if (resolved === "FOT_Office") return "FOT";
  return null;
}

const today = localDateInputValue();

const inputClass =
  "h-10 w-full rounded-xl border bg-card px-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10";

const textareaClass =
  "min-h-24 w-full rounded-xl border bg-card px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10";

export default function FeeManagement() {
  const [fees, setFees] = useState<Fee[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Fee | null>(null);
  const [admin, setAdmin] = useState<AdminProfile>({ firstName: "Admin", lastName: "", designation: "" });
  const [sessionUserId, setSessionUserId] = useState<number | null>(null);
  const [allowedOwner, setAllowedOwner] = useState("");
  const [options, setOptions] = useState<Options>({
    feeTypes: [],
    categories: [],
    feeSuggestions: [],
    faculties: [],
    levels: [],
  });
  const [feeName, setFeeName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [belongsTo, setBelongsTo] = useState("");
  const [receiverType, setReceiverType] = useState<"faculty" | "specific_student" | "batch_upload">("faculty");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [faculty, setFaculty] = useState("all");
  const [level, setLevel] = useState("all");
  const [studentId, setStudentId] = useState("");
  const [batchFileName, setBatchFileName] = useState("");
  const [batchAssignments, setBatchAssignments] = useState<{ studentId: string; amount: number }[]>([]);
  const [batchError, setBatchError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Fee | null>(null);

  const receiverIsSpecificStudent = receiverType === "specific_student";
  const receiverIsBatchUpload = receiverType === "batch_upload";

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

  const notifyFeeDataChanged = () => {
    window.dispatchEvent(new Event("fee-data-changed"));
  };

  useEffect(() => {
    const stored = localStorage.getItem("portalUser");
    const session = stored ? JSON.parse(stored) : null;
    setSessionUserId(session?.userId ?? null);
    setAllowedOwner(allowedPaymentOwnerForAdmin(session?.username));

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
      .then((data) =>
        setOptions({
          feeTypes: data.feeTypes ?? [],
          categories: data.categories ?? [],
          feeSuggestions: data.feeSuggestions ?? [],
          faculties: data.faculties ?? [],
          levels: data.levels ?? [],
        })
      );
  }, []);

  useEffect(() => {
    if (!selected) return;
    setFeeName(selected.type);
    setCategory(selected.category);
    setDescription(selected.description ?? "");
    setBelongsTo(selected.belongsTo || "");
    setAmount(String(selected.amount));
    setDueDate(selected.due);
    setFaculty(lockedFacultyForBelongsTo(selected.belongsTo) ?? "all");
    setLevel("all");
    setReceiverType("faculty");
    setMessage("");

    // StudentID editing is only meaningful when belongsTo is SPECIFIC_STUDENT.
    setStudentId("");
    setBatchFileName("");
    setBatchAssignments([]);
    setBatchError("");
  }, [selected]);



  const handleFeeNameChange = (value: string) => {
    setFeeName(value);
    const previous = options.feeSuggestions.find((item) => item.feeName.toLowerCase() === value.trim().toLowerCase());
    if (previous) {
      setCategory(previous.category);
    setDescription(previous.description);
    }
  };

  const parseBatchFile = async (file: File) => {
    setBatchError("");
    setBatchAssignments([]);
    setBatchFileName(file.name);

    const extension = file.name.split(".").pop()?.toLowerCase();
    try {
      if (extension === "csv") {
        const text = await file.text();
        const rows = text
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => line.split(",").map((cell) => cell.trim()));
        const [, ...dataRows] = rows;
        const assignments = dataRows
          .map((row) => ({ studentId: row[0] ?? "", amount: Number(row[1]) }))
          .filter((row) => row.studentId && Number.isFinite(row.amount) && row.amount > 0);
        if (assignments.length === 0) throw new Error("No valid student rows were found in the file.");
        setBatchAssignments(assignments);
        return;
      }

      if (extension === "xlsx" || extension === "xls") {
        const buffer = await file.arrayBuffer();
        const XLSX = await import("xlsx");
        const workbook = XLSX.read(buffer, { type: "array" });
        const sheet = workbook.SheetNames[0];
        if (!sheet) throw new Error("The spreadsheet does not contain any sheets.");
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheet], { header: 1, defval: "" }) as (string | number)[][];
        const [, ...dataRows] = rows;
        const assignments = dataRows
          .map((row) => ({ studentId: String(row[0] ?? "").trim(), amount: Number(row[1]) }))
          .filter((row) => row.studentId && Number.isFinite(row.amount) && row.amount > 0);
        if (assignments.length === 0) throw new Error("No valid student rows were found in the file.");
        setBatchAssignments(assignments);
        return;
      }

      throw new Error("Please upload a CSV, XLS, or XLSX file.");
    } catch (error) {
      setBatchAssignments([]);
      setBatchError(error instanceof Error ? error.message : "Failed to read the upload file.");
    }
  };

  const handleEdit = async () => {
    if (!selected) return;
    setMessage("");
    const normalizedAmount = normalizeAmount(amount);

    if (!feeName.trim() || !category.trim() || !belongsTo || !amount || !dueDate) {
      setMessageType("error");
      setMessage("Please fill all required fields.");
      return;
    }

    if (receiverIsSpecificStudent) {
      if (!studentId.trim()) {
        setMessageType("error");
        setMessage("Please enter the student ID.");
        return;
      }
    } else if (receiverIsBatchUpload) {
      if (batchAssignments.length === 0) {
        setMessageType("error");
        setMessage("Please upload a valid batch file.");
        return;
      }
    } else {
      if (!level) {
        setMessageType("error");
        setMessage("Please select a level.");
        return;
      }
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

    const receiverFilters = receiverIsSpecificStudent
      ? { studentId: studentId.trim() }
      : receiverIsBatchUpload
        ? { batchAssignments }
        : level === "all"
          ? { faculty, level: "all" }
          : { faculty, level: String(level) };


    const response = await fetch("/api/admin/fees", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        feeId: selected.feeId,
        feeName: feeName.trim(),
        category: category.trim(),
        description: description.trim(),
        belongsTo: resolvePaymentOwner(belongsTo),
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
    notifyFeeDataChanged();
  };

  const handleDelete = async (feeId: number) => {
    await fetch("/api/admin/fees", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ feeId, userId: sessionUserId }),
    });
    loadFees();
    notifyFeeDataChanged();
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

              <div className="mt-2 grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Fee Type</span>
                  <input
                    required
                    list="fee-type-suggestions"
                    value={feeName}
                    onChange={(event) => handleFeeNameChange(event.target.value)}
                    className={inputClass}
                  />
                  <datalist id="fee-type-suggestions">
                    {options.feeTypes.map((item) => (
                      <option key={item} value={item} />
                    ))}
                  </datalist>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Category</span>
                  <input
                    required
                    list="category-suggestions"
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                    className={inputClass}
                  />
                  <datalist id="category-suggestions">
                    {options.categories.map((item) => (
                      <option key={item} value={item} />
                    ))}
                  </datalist>
                </label>

                {/* belongsTo dropdown line (ONLY field in that line) */}
                <div className="sm:col-span-2">
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Belongs To</span>
                    <select
                      required
                      value={belongsTo}
                      onChange={(event) => {
                        const next = event.target.value;
                        setBelongsTo(next);
                        setFaculty(lockedFacultyForBelongsTo(next) ?? "all");
                      }}
                      className={inputClass}
                    >
                      <option value="">Select owner</option>
                      {(allowedOwner ? [allowedOwner] : belongsToOptions).map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                {/* Receiver radios after belongsTo */}
                <div className="sm:col-span-2">
                  <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Receiver</span>
                  <div className="flex items-center gap-4">
                    <label className="inline-flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="receiver"
                        value="faculty"
                        checked={receiverType === "faculty"}
                        onChange={() => setReceiverType("faculty")}
                      />
                      Faculty
                    </label>

                    <label className="inline-flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="receiver"
                        value="specific_student"
                        checked={receiverIsSpecificStudent}
                        onChange={() => setReceiverType("specific_student")}
                      />
                      Specific Student
                    </label>

                    <label className="inline-flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="receiver"
                        value="batch_upload"
                        checked={receiverIsBatchUpload}
                        onChange={() => setReceiverType("batch_upload")}
                      />
                      Batch Upload
                    </label>
                  </div>
                </div>

                {receiverIsBatchUpload && (
                  <div className="sm:col-span-2 rounded-xl border border-dashed bg-muted/20 p-4">
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Batch Upload</span>
                      <input
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) void parseBatchFile(file);
                        }}
                        className="block w-full text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-semibold file:text-primary-foreground"
                      />
                    </label>
                    <p className="mt-2 text-xs text-muted-foreground">
                      First row should contain headings. Column 1 must be Student ID and column 2 must be Fee Amount.
                    </p>
                    {batchFileName && <p className="mt-2 text-xs font-medium text-foreground">File: {batchFileName}</p>}
                    {batchAssignments.length > 0 && (
                      <p className="mt-1 text-xs text-success">{batchAssignments.length} student row(s) loaded.</p>
                    )}
                    {batchError && <p className="mt-2 text-xs text-destructive">{batchError}</p>}
                  </div>
                )}

                {receiverIsSpecificStudent ? (
                  <label className="block sm:col-span-2">
                    <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Student ID</span>
                    <input required value={studentId} onChange={(e) => setStudentId(e.target.value)} className={inputClass} />
                  </label>
                ) : receiverIsBatchUpload ? null : (
                  <>
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Faculty</span>
                      <select
                        value={faculty}
                        onChange={(e) => setFaculty(e.target.value)}
                        className={inputClass}
                        disabled={belongsTo === "FAS_Office" || belongsTo === "FBSF_Office" || belongsTo === "FOT_Office"}
                      >
                        <option value="all">All faculties</option>
                        {options.faculties.map((item) => {
                          const lockedFaculty =
                            belongsTo === "FAS_Office"
                              ? "FAS"
                              : belongsTo === "FBSF_Office"
                                ? "FBSF"
                                : belongsTo === "FOT_Office"
                                  ? "FOT"
                                  : null;

                          if (lockedFaculty && item !== lockedFaculty) return null;

                          return (
                            <option key={item} value={item}>
                              {item}
                            </option>
                          );
                        })}
                      </select>
                    </label>

                    <label className="block">
                      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Level</span>
                      <select
                        value={level}
                        onChange={(e) => setLevel(e.target.value)}
                        className={inputClass}
                      >
                        <option value="all">All Levels</option>
                        {options.levels.map((item) => (
                          <option key={item} value={String(item)}>
                            Level {item}
                          </option>
                        ))}
                      </select>
                    </label>
                  </>
                )}

                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Amount (LKR)</span>
                  <input
                    required
                    type="text"
                    inputMode="decimal"
                    disabled={receiverIsBatchUpload}
                    value={receiverIsBatchUpload ? "Loaded from file" : amount}
                    onBlur={() => setAmount((value) => normalizeAmount(value))}
                    onChange={(event) => setAmount(sanitizeAmount(event.target.value))}
                    className={inputClass}
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Due Date</span>
                  <input
                    required
                    type="date"
                    min={today}
                    value={dueDate}
                    onChange={(event) => setDueDate(event.target.value)}
                    className={inputClass}
                  />
                </label>

                <label className="block sm:col-span-2">
                  <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Description</span>
                  <textarea value={description} onChange={(event) => setDescription(event.target.value)} className={textareaClass} />
                </label>
              </div>
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
                  {["Fee Type", "Category", "Belongs To", "Amount", "Due Date", "Receivers", "Actions"].map((heading) => (
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
                    <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">
                      Loading...
                    </td>
                  </tr>
                ) : fees.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">
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
                      <td className="px-6 py-4 text-muted-foreground">{fee.belongsTo}</td>
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
                            onClick={() => setDeleteTarget(fee)}
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
        <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this fee?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete {deleteTarget?.type ?? "this fee"}? This will remove the fee and its
                related assignments. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setDeleteTarget(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  if (!deleteTarget) return;
                  await handleDelete(deleteTarget.feeId);
                  setDeleteTarget(null);
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </PortalLayout>
  );
}
