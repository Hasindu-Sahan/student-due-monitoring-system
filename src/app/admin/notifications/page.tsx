"use client";

import { useEffect, useState } from "react";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { BellRing, CheckCheck } from "lucide-react";

type AdminProfile = { firstName: string; lastName: string; designation: string };
type NotificationItem = {
  id: number;
  studentId: string;
  studentName: string;
  type: string;
  message: string;
  status: "Read" | "Unread";
  sentDate: string;
};

function sessionQuery() {
  const stored = localStorage.getItem("portalUser");
  const session = stored ? JSON.parse(stored) : null;
  const params = new URLSearchParams();
  if (session?.userId) params.set("userId", String(session.userId));
  if (session?.username) params.set("username", session.username);
  return params.toString() ? `?${params.toString()}` : "";
}

export default function AdminNotifications() {
  const [admin, setAdmin] = useState<AdminProfile>({ firstName: "Admin", lastName: "", designation: "" });
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    Promise.all([
      fetch(`/api/admin/account${sessionQuery()}`).then((r) => r.json()),
      fetch("/api/admin/notifications").then((r) => r.json()),
    ]).then(([adminData, notificationData]) => {
      if (!adminData.error) setAdmin(adminData);
      if (Array.isArray(notificationData)) setNotifications(notificationData);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const markAllRead = async () => {
    await fetch("/api/admin/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    load();
  };

  return (
    <PortalLayout role="admin" user={{ name: `${admin.firstName} ${admin.lastName}`.trim(), sub: admin.designation, initials: `${admin.firstName?.[0] ?? "A"}${admin.lastName?.[0] ?? ""}` }} title="Notifications" subtitle="Student payment alerts">
      <div className="rounded-2xl border bg-card shadow-card">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft text-primary"><BellRing className="h-4 w-4" /></span>
            <div>
              <h2 className="text-base font-semibold">Notifications</h2>
              <p className="text-xs text-muted-foreground">{notifications.filter((n) => n.status === "Unread").length} unread</p>
            </div>
          </div>
          <button onClick={markAllRead} className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition hover:bg-accent">
            <CheckCheck className="h-4 w-4" /> Mark all read
          </button>
        </div>
        <div className="divide-y">
          {loading ? (
            <div className="px-6 py-8 text-center text-muted-foreground">Loading...</div>
          ) : notifications.length === 0 ? (
            <div className="px-6 py-8 text-center text-muted-foreground">No notifications yet</div>
          ) : notifications.map((notification) => (
            <div key={notification.id} className="flex items-start justify-between gap-4 px-6 py-4">
              <div>
                <div className="flex items-center gap-2">
                  {notification.status === "Unread" && <span className="h-2 w-2 rounded-full bg-destructive" />}
                  <p className="text-sm font-semibold">{notification.type}</p>
                  <span className="font-mono text-xs text-muted-foreground">{notification.studentId}</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{notification.message}</p>
                <p className="mt-1 text-xs text-muted-foreground">{notification.studentName} · {new Date(notification.sentDate).toLocaleString()}</p>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${notification.status === "Unread" ? "bg-warning-soft text-warning" : "bg-muted text-muted-foreground"}`}>{notification.status}</span>
            </div>
          ))}
        </div>
      </div>
    </PortalLayout>
  );
}
