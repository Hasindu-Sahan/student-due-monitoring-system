"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { BadgePlus, CheckCircle2, Search, Send } from "lucide-react";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { allowedPaymentOwnerForAdmin, paymentOwnerOptions, resolvePaymentOwner } from "@/lib/belongs-to";
import { fetchPortalSession } from "@/lib/portal-session";

type AdminProfile = { firstName: string; lastName: string; designation: string };
type FeeSuggestion = { feeName: string; category: string; description: string };
type BatchAssignment = { studentId: string; amount: number };
type Options = {
  feeTypes: string[];
  categories: string[];
  feeSuggestions: FeeSuggestion[];
  faculties: string[];
  levels: number[];
};

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

const today = localDateInputValue();

const inputClass =
  "h-10 w-full rounded-xl border bg-card px-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10";

const textareaClass =
  "min-h-24 w-full rounded-xl border bg-card px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10";

export default function AddFeePage() {
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
  const [belongsTo, setBelongsTo] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [amount, setAmount] = useState("");
  const [level, setLevel] = useState<number | "all">("all");
  const [faculty, setFaculty] = useState("all");
  const [studentId, setStudentId] = useState("");
  const [batchFileName, setBatchFileName] = useState("");
  const [batchAssignments, setBatchAssignments] = useState<BatchAssignment[]>([]);
  const [batchError, setBatchError] = useState("");

  const [receiverType, setReceiverType] = useState<"faculty" | "specific_student" | "batch_upload">("faculty");
  const receiverIsSpecificStudent = receiverType === "specific_student";
  const receiverIsBatchUpload = receiverType === "batch_upload";

  const lockedFacultyForBelongsTo = (value: string) => {
    const resolved = resolvePaymentOwner(value);
    if (resolved === "FAS_Office") return "FAS";
    if (resolved === "FBSF_Office") return "FBSF";
    if (resolved === "FOT_Office") return "FOT";
    return null;
  };

  useEffect(() => {
    const locked = lockedFacultyForBelongsTo(belongsTo);
    if (locked) setFaculty(locked);
  }, [belongsTo]);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");

  useEffect(() => {
    fetchPortalSession().then((session) => {
      setSessionUserId(session?.userId ?? null);
      setAllowedOwner(allowedPaymentOwnerForAdmin(session?.username));

      const params = new URLSearchParams();
      if (session?.userId) params.set("userId", String(session.userId));
      if (session?.username) params.set("username", session.username);
      const accountQuery = params.toString() ? `?${params.toString()}` : "";

      fetch(`/api/admin/account${accountQuery}`)
        .then((r) => r.json())
        .then((data) => {
          if (!data.error) setAdmin(data);
        });

      fetch("/api/admin/payments-options")
        .then((r) => r.json())
        .then((data) => {
          if (!data.error) {
            setOptions({
              feeTypes: data.feeTypes ?? [],
              categories: data.categories ?? [],
              feeSuggestions: data.feeSuggestions ?? [],
              faculties: data.faculties ?? [],
              levels: data.levels ?? [],
            });
          }
        });
    });
  }, []);

  const matchingFee = useMemo(
    () => options.feeSuggestions.find((item) => item.feeName.toLowerCase() === feeName.trim().toLowerCase()),
    [feeName, options.feeSuggestions]
  );

  const matchingDetails = useMemo(
    () =>
      options.feeSuggestions.find(
        (item) =>
          item.feeName.toLowerCase() === feeName.trim().toLowerCase() &&
          item.category.toLowerCase() === category.trim().toLowerCase()
      ),
    [category, feeName, options.feeSuggestions]
  );

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
        const [header, ...dataRows] = rows;
        if (!header || header.length < 2) throw new Error("The file must include student ID and amount columns.");
        const assignments = dataRows
          .map((row) => ({ studentId: row[0] ?? "", amount: Number(row[1]) }))
          .filter((row) => row.studentId && Number.isFinite(row.amount) && row.amount > 0);
        if (assignments.length === 0) throw new Error("No valid student rows were found in the file.");
        setBatchAssignments(assignments);
        return;
      }

      if (extension === "xlsx" || extension === "xls") {
        const buffer = await file.arrayBuffer();
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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    const normalizedAmount = normalizeAmount(amount);

    if (!feeName.trim() || !category.trim() || !belongsTo || !dueDate || (!receiverIsBatchUpload && !amount)) {
      setMessageType("error");
      setMessage("Please fill all required fields.");
      return;
    }

    if (!receiverIsBatchUpload && (!/^\d+(\.\d{2})$/.test(normalizedAmount) || Number(normalizedAmount) <= 0)) {
      setMessageType("error");
      setMessage("Amount must be a valid positive number.");
      return;
    }

    if (dueDate < today) {
      setMessageType("error");
      setMessage("Due date cannot be a previous day.");
      return;
    }

    const isSpecificStudent = receiverIsSpecificStudent;
    const isBatchUpload = receiverIsBatchUpload;

    if (isSpecificStudent) {
      if (!studentId.trim()) {
        setMessageType("error");
        setMessage("Please enter the student ID.");
        return;
      }
    } else if (isBatchUpload) {
      if (batchAssignments.length === 0) {
        setMessageType("error");
        setMessage("Please upload a valid batch file with student IDs and amounts.");
        return;
      }
    } else {
      // For faculty-based fees, Level can be "all" (means all levels).
      // So we only block when the state is still invalid/empty.
      if (level === undefined || level === null) {
        setMessageType("error");
        setMessage("Please select a level.");
        return;
      }
    }


    setSaving(true);

    const receiverFilters = isSpecificStudent
      ? { studentId: studentId.trim() }
      : isBatchUpload
        ? { batchAssignments }
        : level === "all"
          ? { faculty, level: "all" }
          : { faculty, level: String(level) };


    const response = await fetch("/api/admin/fees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        feeName: feeName.trim(),
        category: category.trim(),
        belongsTo: resolvePaymentOwner(belongsTo),
        description: description.trim(),
        dueDate,
        amount: isBatchUpload ? null : Number(normalizedAmount),
        receiverType,
        receiverFilters,
        userId: sessionUserId,
      }),
    });


    const data = await response.json();
    setSaving(false);

    if (!response.ok) {
      setMessageType("error");
      setMessage(data.error ?? "Failed to add fee");
      return;
    }

    setMessageType("success");
    setMessage(`Fee added for ${data.assignedCount} receiver${data.assignedCount === 1 ? "" : "s"}.`);
    setFeeName("");
    setCategory("");
    setBelongsTo("");
    setDescription("");
    setDueDate("");
    setAmount("");
    setStudentId("");
    setBatchFileName("");
    setBatchAssignments([]);
    setBatchError("");
    setFaculty("all");
    setLevel("all");
    setReceiverType("faculty");
    window.dispatchEvent(new Event("fee-data-changed"));
  };

  return (
    <PortalLayout
      role="admin"
      user={{
        name: `${admin.firstName} ${admin.lastName}`.trim(),
        sub: admin.designation,
        initials: `${admin.firstName?.[0] ?? "A"}${admin.lastName?.[0] ?? ""}`,
      }}
      title="Add Fee"
      subtitle="Create and assign a new student due"
    >
      <form noValidate onSubmit={handleSubmit} className="grid gap-6">
        <section className="mx-auto flex w-full max-w-5xl flex-col rounded-2xl border bg-card p-6 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Fee Details</h2>
              <p className="text-xs text-muted-foreground">Description is optional</p>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <BadgePlus className="h-4 w-4" />
            </span>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
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
                    if (next === "FAS_Office") setFaculty("FAS");
                    if (next === "FBSF_Office") setFaculty("FBSF");
                    if (next === "FOT_Office") setFaculty("FOT");
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

            {/* Receiver radio section placed after belongsTo line */}
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
                    checked={receiverType === "specific_student"}
                    onChange={() => setReceiverType("specific_student")}
                  />
                  Specific Student
                </label>

                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="receiver"
                    value="batch_upload"
                    checked={receiverType === "batch_upload"}
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
                    onChange={(event: ChangeEvent<HTMLInputElement>) => {
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

            {/* Faculty/Level or StudentID depending on receiver */}
            {receiverIsSpecificStudent ? (
              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Student ID</span>
                <input required value={studentId} onChange={(event) => setStudentId(event.target.value)} className={inputClass} />
              </label>
            ) : receiverIsBatchUpload ? null : (
              <>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Faculty</span>
                  <select
                    value={faculty}
                    onChange={(event) => setFaculty(event.target.value)}
                    className={inputClass}
                    disabled={belongsTo === "FAS_Office" || belongsTo === "FBSF_Office" || belongsTo === "FOT_Office"}
                  >
                    <option value="all">All faculties</option>
                    {options.faculties.map((item) => {
                      // Hide non-matching options when belongsTo locks faculty.
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
                    onChange={(event) => setLevel(event.target.value === "all" ? "all" : Number(event.target.value))}
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

            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Description</span>
              <textarea value={description} onChange={(event) => setDescription(event.target.value)} className={textareaClass} />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Due Date</span>
              <input required min={today} type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className={inputClass} />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Amount</span>
              <input
                disabled={receiverIsBatchUpload}
                required={!receiverIsBatchUpload}
                min="0"
                step="0.01"
                inputMode="decimal"
                type="text"
                value={receiverIsBatchUpload ? "Loaded from file" : amount}
                onBlur={() => setAmount((value) => normalizeAmount(value))}
                onChange={(event) => setAmount(sanitizeAmount(event.target.value))}
                className={inputClass}
              />
            </label>
          </div>

          {(matchingFee || matchingDetails) && (
            <div className="mt-5 rounded-xl border bg-muted/30 p-4 text-sm">
              <div className="flex items-start gap-3">
                <Search className="mt-0.5 h-4 w-4 text-primary" />
                <div className="min-w-0">
                  <p className="font-medium">Previous details</p>
                  <p className="mt-1 text-muted-foreground">
                    {matchingDetails?.description || matchingFee?.description || "No saved description"}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Category: {matchingDetails?.category || matchingFee?.category || "N/A"}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3">
            <button
              disabled={saving}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-soft transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Send className="h-4 w-4" />
              {saving ? "Adding..." : "Add Fee"}
            </button>
            {message && (
              <div
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
                  messageType === "error" ? "bg-destructive-soft text-destructive" : "bg-muted/30 text-muted-foreground"
                }`}
              >
                <CheckCircle2 className={`h-4 w-4 ${messageType === "error" ? "text-destructive" : "text-success"}`} />
                {message}
              </div>
            )}
          </div>
        </section>
      </form>
    </PortalLayout>
  );
}

