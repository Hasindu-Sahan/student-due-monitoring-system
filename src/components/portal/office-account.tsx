"use client";

import { useEffect, useState } from "react";
import type { ElementType } from "react";
import { BadgeCheck, Briefcase, Hash, Mail, Phone, UserCog } from "lucide-react";
import { PortalLayout } from "@/components/portal/PortalLayout";

type OfficeProfile = {
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

export function OfficeAccountPage({
  defaultScope,
  facultyBasePath = "/faculty",
}: {
  defaultScope: string;
  facultyBasePath?: string;
}) {
  const [faculty, setFaculty] = useState<OfficeProfile | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("portalUser");
    const session = stored ? JSON.parse(stored) : null;

    const params = new URLSearchParams();
    if (session?.userId) params.set("userId", String(session.userId));
    if (session?.username) params.set("username", session.username);
    const query = params.toString() ? `?${params.toString()}` : "";

    fetch(`/api/admin/account${query}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) {
          setFaculty(data);
        }
      });
  }, []);

  if (!faculty) {
    return (
      <PortalLayout
        role="faculty"
        facultyBasePath={facultyBasePath}
        user={{
          name: defaultScope,
          sub: `${defaultScope} Portal`,
          initials: defaultScope.slice(0, 3).toUpperCase(),
        }}
        title="Profile"
        subtitle={`Your ${defaultScope} profile`}
      >
        <div className="p-8 text-center text-muted-foreground">Loading...</div>
      </PortalLayout>
    );
  }

  const initials = `${faculty.firstName?.[0] ?? "F"}${faculty.lastName?.[0] ?? ""}`;

  return (
    <PortalLayout
      role="faculty"
      facultyBasePath={facultyBasePath}
      user={{
        name: `${faculty.firstName} ${faculty.lastName}`,
        sub: defaultScope,
        initials,
      }}
      title={`${defaultScope} Profile`}
      subtitle={`Your ${defaultScope} office profile`}
    >
      <div className="grid gap-6 lg:grid-cols-3">
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
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Field icon={Hash} label="Employee ID" value={faculty.id} />
            <Field icon={Hash} label="Username" value={faculty.username} />
            <Field icon={Briefcase} label="Designation" value={faculty.designation} />
            <Field icon={UserCog} label="First Name" value={faculty.firstName} />
            <Field icon={UserCog} label="Last Name" value={faculty.lastName} />
            <Field icon={Mail} label="Email" value={faculty.email} />
            <Field icon={Phone} label="Phone" value={faculty.phone || "N/A"} />
            <Field icon={BadgeCheck} label="Access Level" value={`${defaultScope} Office`} />
            <Field
              icon={BadgeCheck}
              label="Last Sign-in"
              value={faculty.lastLogin ? new Date(faculty.lastLogin).toLocaleString() : "N/A"}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border bg-card p-6 shadow-card">
            <h3 className="text-base font-semibold text-muted-foreground">Office</h3>
            <p className="mt-2 text-sm font-medium">{defaultScope.replace("_Office", "") || defaultScope}</p>
            <p className="mt-1 text-xs text-muted-foreground">Office access</p>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
