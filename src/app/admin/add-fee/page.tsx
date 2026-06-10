"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { BadgePlus, CheckCircle2, Search, Send, Users } from "lucide-react";
import { PortalLayout } from "@/components/portal/PortalLayout";

type AdminProfile = { firstName: string; lastName: string; designation: string };
type FeeSuggestion = { feeName: string; category: string; description: string };
type Options = {
  feeTypes: string[];
  categories: string[];
  feeSuggestions: FeeSuggestion[];
  faculties: string[];
  levels: number[];
};

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
  const [options, setOptions] = useState<Options>({
    feeTypes: [],
    categories: [],
    feeSuggestions: [],
    faculties: [],
    levels: [],
  });
  const [receiverType, setReceiverType] = useState<"faculty" | "student">("faculty");
  const [feeName, setFeeName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [amount, setAmount] = useState("");
  const [faculty, setFaculty] = useState("all");
  const [level, setLevel] = useState("all");
  const [studentId, setStudentId] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");

  useEffect(() => {
    const stored = localStorage.getItem("portalUser");
    const session = stored ? JSON.parse(stored) : null;
    setSessionUserId(session?.userId ?? null);

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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    const normalizedAmount = normalizeAmount(amount);

    if (!feeName.trim() || !category.trim() || !dueDate || !amount) {
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

    if (receiverType === "student" && !studentId.trim()) {
      setMessageType("error");
      setMessage("Please enter the student ID.");
      return;
    }

    setSaving(true);

    const receiverFilters =
      receiverType === "faculty"
        ? { faculty, level }
        : { studentId: studentId.trim() };

    const response = await fetch("/api/admin/fees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        feeName: feeName.trim(),
        category: category.trim(),
        description: description.trim(),
        dueDate,
        amount: Number(normalizedAmount),
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
    setDescription("");
    setDueDate("");
    setAmount("");
    setStudentId("");
    setFaculty("all");
    setLevel("all");
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
      <form noValidate onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <section className="rounded-2xl border bg-card p-6 shadow-card">
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
                required
                min="0"
                step="0.01"
                inputMode="decimal"
                type="text"
                value={amount}
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
        </section>

        <section className="rounded-2xl border bg-card p-6 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Receivers</h2>
              <p className="text-xs text-muted-foreground">Faculty group or one student</p>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-success-soft text-success">
              <Users className="h-4 w-4" />
            </span>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2 rounded-xl border bg-muted/30 p-1">
            <button
              type="button"
              onClick={() => setReceiverType("faculty")}
              className={`h-10 rounded-lg text-sm font-medium transition ${
                receiverType === "faculty" ? "bg-card text-foreground shadow-soft" : "text-muted-foreground"
              }`}
            >
              Faculty
            </button>
            <button
              type="button"
              onClick={() => setReceiverType("student")}
              className={`h-10 rounded-lg text-sm font-medium transition ${
                receiverType === "student" ? "bg-card text-foreground shadow-soft" : "text-muted-foreground"
              }`}
            >
              Specific Student
            </button>
          </div>

          {receiverType === "faculty" ? (
            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Faculty</span>
                <select value={faculty} onChange={(event) => setFaculty(event.target.value)} className={inputClass}>
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
                <select value={level} onChange={(event) => setLevel(event.target.value)} className={inputClass}>
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
            <div className="mt-5">
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Student ID</span>
                <input
                  required={receiverType === "student"}
                  value={studentId}
                  onChange={(event) => setStudentId(event.target.value)}
                  className={inputClass}
                />
              </label>
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
              <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${messageType === "error" ? "bg-destructive-soft text-destructive" : "bg-muted/30 text-muted-foreground"}`}>
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
