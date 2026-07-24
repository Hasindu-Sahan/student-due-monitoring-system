"use client";

import { useEffect, useState } from "react";
import { BellRing, CheckCircle2 } from "lucide-react";
import { PortalLayout } from "@/components/portal/PortalLayout";

type Notification = {
  id?: number;
  title?: string;
  message?: string;
  status?: string;
  createdAt?: string;
};

export function OfficeNotificationsPage({
  defaultScope,
  facultyBasePath = "/faculty",
}: {
  defaultScope: string;
  facultyBasePath?: string;
}) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/notifications")
      .then((r) => r.json())
      .then((data) => {
        setNotifications(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        setNotifications([]);
        setLoading(false);
      });
  }, []);

  return (
    <PortalLayout
      role="faculty"
      facultyBasePath={facultyBasePath}
      user={{ name: defaultScope, sub: `${defaultScope} Portal`, initials: defaultScope.slice(0, 3).toUpperCase() }}
      title="Notifications"
      subtitle={`${defaultScope} alerts`}
    >
      <div className="rounded-2xl border bg-card p-6 shadow-card">
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <h2 className="text-base font-semibold">Notifications</h2>
            <p className="text-xs text-muted-foreground">Recent portal updates</p>
          </div>
          <BellRing className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="mt-4 space-y-3">
          {loading ? (
            <p className="py-6 text-sm text-muted-foreground">Loading...</p>
          ) : notifications.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">No notifications found.</p>
          ) : (
            notifications.slice(0, 10).map((item, index) => (
              <div key={item.id ?? index} className="rounded-xl border p-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  {item.title || "Notification"}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{item.message || "No details available."}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </PortalLayout>
  );
}
