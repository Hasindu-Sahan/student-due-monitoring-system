"use client";

import { useState, useEffect } from "react";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { KeyRound, UserCog, Mail, Phone, GraduationCap, Calendar, BadgeCheck, Hash } from "lucide-react";

type StudentProfile = { id: string; firstName: string; lastName: string; email: string; phone: string; faculty: string; level?: number | null; status: string };

function Field({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />{label}
      </div>
      <p className="mt-1.5 text-sm font-medium">{value}</p>
    </div>
  );
}

export default function StudentAccount() {
  const [student, setStudent] = useState<StudentProfile | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("portalUser");
    const session = stored ? JSON.parse(stored) : null;
    const params = new URLSearchParams();
    if (session?.userId) params.set("userId", String(session.userId));
    if (session?.username) params.set("username", session.username);
    const query = params.toString() ? `?${params.toString()}` : "";

    fetch(`/api/student/account${query}`)
      .then(r => r.json())
      .then(data => {
        if (!data.error) setStudent(data);
      });
  }, []);

  if (!student) return (
    <PortalLayout role="student" user={{ name: "Student", sub: "", initials: "S" }} title="Account" subtitle="Your personal and academic information">
      <div className="p-8 text-center text-muted-foreground">Loading...</div>
    </PortalLayout>
  );

  const initials = `${student.firstName?.[0] ?? "S"}${student.lastName?.[0] ?? ""}`;

  return (
    <PortalLayout
      role="student"
      user={{ name: `${student.firstName} ${student.lastName}`, sub: student.id, initials }}
      title="Account"
      subtitle="Your personal and academic information"
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border bg-card p-6 shadow-card lg:col-span-2">
          <div className="flex items-center gap-4 border-b pb-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-soft text-xl font-semibold text-primary">{initials}</div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold">{student.firstName} {student.lastName}</h2>
              <p className="text-sm text-muted-foreground">{student.faculty}</p>
            </div>
            <span className="rounded-full bg-success-soft px-3 py-1 text-xs font-medium text-success">{student.status}</span>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Field icon={Hash} label="Student ID" value={student.id} />
            <Field icon={BadgeCheck} label="Enrollment Status" value={student.status} />
            <Field icon={UserCog} label="First Name" value={student.firstName} />
            <Field icon={UserCog} label="Last Name" value={student.lastName} />
            <Field icon={Mail} label="Email" value={student.email} />
            <Field icon={Phone} label="Phone" value={student.phone} />
            <Field icon={GraduationCap} label="Faculty" value={student.faculty} />
            <Field icon={Calendar} label="Level" value={student.level ? `Level ${student.level}` : ""} />
          </div>
          <p className="mt-4 text-xs text-muted-foreground">Personal details are view-only. Contact the registrar to request changes.</p>
        </div>
        <div className="space-y-4">
          <div className="rounded-2xl border bg-card p-6 shadow-card">
            <h3 className="text-base font-semibold">Security</h3>
            <p className="mt-1 text-xs text-muted-foreground">Manage your sign-in credentials.</p>
            <div className="mt-5 space-y-3">
              <button className="flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-medium transition hover:border-primary hover:bg-primary-soft">
                <span className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-primary"><UserCog className="h-4 w-4" /></span>Reset Username</span>
                <span className="text-xs text-muted-foreground">›</span>
              </button>
              <button className="flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-medium transition hover:border-primary hover:bg-primary-soft">
                <span className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-primary"><KeyRound className="h-4 w-4" /></span>Reset Password</span>
                <span className="text-xs text-muted-foreground">›</span>
              </button>
            </div>
          </div>
          <div className="rounded-2xl border bg-sidebar p-6 text-sidebar-foreground shadow-card">
            <p className="text-xs uppercase tracking-wider text-sidebar-muted">Need help?</p>
            <p className="mt-2 text-sm">Visit the Bursar's office between 9 AM and 4 PM, weekdays.</p>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
