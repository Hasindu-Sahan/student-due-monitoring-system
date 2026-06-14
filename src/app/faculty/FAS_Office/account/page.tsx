"use client";

import { useEffect, useState } from "react";
import type { ElementType } from "react";
import { PortalLayout } from "@/components/portal/PortalLayout";
import {
  Pencil,
  KeyRound,
  UserCog,
  Mail,
  Phone,
  BadgeCheck,
  Hash,
  Briefcase,
} from "lucide-react";

type FacultyProfile = {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  designation: string;
  lastLogin: string | null;
};

function Field({
  icon: Icon,
  label,
  value,
}: {
  icon: ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-1.5 text-sm font-medium">{value}</p>
    </div>
  );
}

export default function FASOfficeAccountPage() {
  const [faculty, setFaculty] = useState<FacultyProfile | null>(null);
  const [mode, setMode] = useState<"profile" | "username" | "password" | null>(null);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    designation: "",
    username: "",
    password: "",
  });
  const [sessionUserId, setSessionUserId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("portalUser");
    const session = stored ? JSON.parse(stored) : null;
    setSessionUserId(session?.userId ?? null);

    const params = new URLSearchParams();
    if (session?.userId) params.set("userId", String(session.userId));
    if (session?.username) params.set("username", session.username);
    const query = params.toString() ? `?${params.toString()}` : "";

    fetch(`/api/admin/account${query}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) {
          setFaculty(data);
          setForm({
            firstName: data.firstName ?? "",
            lastName: data.lastName ?? "",
            phone: data.phone ?? "",
            designation: data.designation ?? "",
            username: data.username ?? "",
            password: "",
          });
        }
      });
  }, []);

  if (!faculty) {
    return (
      <PortalLayout
        role="faculty"
        facultyBasePath="/faculty/FAS_Office"
        user={{ name: "FAS Office", sub: "FAS Portal", initials: "FAS" }}
        title="FAS Profile"
        subtitle="Your FAS office profile"
      >
        <div className="p-8 text-center text-muted-foreground">Loading…</div>
      </PortalLayout>
    );
  }

  const initials = `${faculty.firstName?.[0] ?? "F"}${faculty.lastName?.[0] ?? ""}`;

  const save = async () => {
    setSaving(true);
    setError("");

    const body =
      mode === "profile"
        ? {
            userId: sessionUserId,
            firstName: form.firstName,
            lastName: form.lastName,
            phone: form.phone,
            designation: form.designation,
          }
        : mode === "username"
          ? { userId: sessionUserId, username: form.username }
          : { userId: sessionUserId, password: form.password };

    try {
      const res = await fetch("/api/admin/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.error) {
        setFaculty(data);
        setMode(null);
        setForm((prev) => ({ ...prev, password: "" }));
      } else {
        setError(data.error);
      }
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PortalLayout
      role="faculty"
      facultyBasePath="/faculty/FAS_Office"
      user={{
        name: `${faculty.firstName} ${faculty.lastName}`,
        sub: "FAS Office",
        initials,
      }}
      title="FAS Profile"
      subtitle="Your FAS office profile"
    >
      <div className="grid gap-6 lg:grid-cols-3">
        {/* ── Main profile card ───────────────────────────────────────── */}
        <div className="rounded-2xl border bg-card p-6 shadow-card lg:col-span-2">
          <div className="flex items-center gap-4 border-b pb-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-soft text-xl font-semibold text-primary">
              {initials}
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold">
                {faculty.firstName} {faculty.lastName}
              </h2>
              <p className="text-sm text-muted-foreground">{faculty.designation}</p>
            </div>
            <button
              onClick={() => setMode("profile")}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-soft transition hover:bg-primary/90"
            >
              <Pencil className="h-4 w-4" /> Edit Profile
            </button>
          </div>

          {/* ── Inline edit form ───────────────────────────────────────── */}
          {mode && (
            <div className="mt-6 rounded-xl border bg-muted/30 p-4">
              {error && (
                <p className="mb-3 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {error}
                </p>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                {mode === "profile" && (
                  <>
                    <input
                      value={form.firstName}
                      onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                      placeholder="First name"
                      className="h-10 rounded-xl border bg-card px-3 text-sm outline-none focus:border-primary"
                    />
                    <input
                      value={form.lastName}
                      onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                      placeholder="Last name"
                      className="h-10 rounded-xl border bg-card px-3 text-sm outline-none focus:border-primary"
                    />
                    <input
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="Phone"
                      className="h-10 rounded-xl border bg-card px-3 text-sm outline-none focus:border-primary"
                    />
                    <input
                      value={form.designation}
                      onChange={(e) => setForm({ ...form, designation: e.target.value })}
                      placeholder="Designation"
                      className="h-10 rounded-xl border bg-card px-3 text-sm outline-none focus:border-primary"
                    />
                  </>
                )}
                {mode === "username" && (
                  <input
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    placeholder="New username"
                    className="h-10 rounded-xl border bg-card px-3 text-sm outline-none focus:border-primary sm:col-span-2"
                  />
                )}
                {mode === "password" && (
                  <input
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    type="password"
                    placeholder="New password"
                    className="h-10 rounded-xl border bg-card px-3 text-sm outline-none focus:border-primary sm:col-span-2"
                  />
                )}
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={() => { setMode(null); setError(""); }}
                  className="rounded-xl border px-4 py-2 text-sm font-medium transition hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  onClick={save}
                  disabled={saving}
                  className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          )}

          {/* ── Profile fields ─────────────────────────────────────────── */}
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Field icon={Hash} label="Employee ID" value={faculty.id} />
            <Field icon={Hash} label="Username" value={faculty.username} />
            <Field icon={Briefcase} label="Designation" value={faculty.designation} />
            <Field icon={UserCog} label="First Name" value={faculty.firstName} />
            <Field icon={UserCog} label="Last Name" value={faculty.lastName} />
            <Field icon={Mail} label="Email" value={faculty.email} />
            <Field icon={Phone} label="Phone" value={faculty.phone || "N/A"} />
            <Field icon={BadgeCheck} label="Access Level" value="FAS Office (Sub-Admin)" />
            <Field
              icon={BadgeCheck}
              label="Last Sign-in"
              value={faculty.lastLogin ? new Date(faculty.lastLogin).toLocaleString() : "N/A"}
            />
          </div>
        </div>

        {/* ── Security sidebar ───────────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="rounded-2xl border bg-card p-6 shadow-card">
            <h3 className="text-base font-semibold">Security</h3>
            <div className="mt-5 space-y-3">
              <button
                onClick={() => setMode("username")}
                className="flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-medium transition hover:border-primary hover:bg-primary-soft"
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
                    <UserCog className="h-4 w-4" />
                  </span>
                  Reset Username
                </span>
                <span className="text-xs text-muted-foreground">›</span>
              </button>
              <button
                onClick={() => setMode("password")}
                className="flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-medium transition hover:border-primary hover:bg-primary-soft"
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
                    <KeyRound className="h-4 w-4" />
                  </span>
                  Reset Password
                </span>
                <span className="text-xs text-muted-foreground">›</span>
              </button>
            </div>
          </div>

          <div className="rounded-2xl border bg-card p-6 shadow-card">
            <h3 className="text-base font-semibold text-muted-foreground">Office</h3>
            <p className="mt-2 text-sm font-medium">Faculty of Applied Sciences (FAS)</p>
            <p className="mt-1 text-xs text-muted-foreground">Sub-administrator access</p>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}