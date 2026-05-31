"use client";

import { useEffect, useState } from "react";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { ArrowUpDown } from "lucide-react";

type AdminProfile = { firstName: string; lastName: string; designation: string };
type AuditLog = {
  id: number;
  action: string;
  tableName: string;
  recordId: string;
  previousState: unknown;
  currentState: unknown;
  timestamp: string;
  by: string;
};

function sessionQuery() {
  const stored = localStorage.getItem("portalUser");
  const session = stored ? JSON.parse(stored) : null;
  const params = new URLSearchParams();
  if (session?.userId) params.set("userId", String(session.userId));
  if (session?.username) params.set("username", session.username);
  return params.toString() ? `?${params.toString()}` : "";
}

function JsonBlock({ value }: { value: unknown }) {
  if (!value) return <span className="text-muted-foreground">-</span>;
  return <pre className="max-h-28 overflow-auto rounded-lg bg-muted p-2 text-[11px] leading-relaxed">{JSON.stringify(value, null, 2)}</pre>;
}

export default function AuditLogsPage() {
  const [admin, setAdmin] = useState<AdminProfile>({ firstName: "Admin", lastName: "", designation: "" });
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/admin/account${sessionQuery()}`).then((r) => r.json()),
      fetch("/api/admin/audit-logs").then((r) => r.json()),
    ]).then(([adminData, logsData]) => {
      if (!adminData.error) setAdmin(adminData);
      if (Array.isArray(logsData)) setLogs(logsData);
      setLoading(false);
    });
  }, []);

  return (
    <PortalLayout role="admin" user={{ name: `${admin.firstName} ${admin.lastName}`.trim(), sub: admin.designation, initials: `${admin.firstName?.[0] ?? "A"}${admin.lastName?.[0] ?? ""}` }} title="Audit Logs" subtitle="Admin changes with previous and current state">
      <div className="rounded-2xl border bg-card shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                {["Time", "Admin", "Action", "Table", "Record", "Previous State", "Current State"].map((h) => (
                  <th key={h} className="px-4 py-3 font-medium"><span className="inline-flex items-center gap-1.5">{h}<ArrowUpDown className="h-3 w-3 opacity-50" /></span></th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">Loading...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">No audit logs yet</td></tr>
              ) : logs.map((log) => (
                <tr key={log.id} className="border-b align-top last:border-0">
                  <td className="px-4 py-4 text-muted-foreground">{new Date(log.timestamp).toLocaleString()}</td>
                  <td className="px-4 py-4 font-medium">{log.by}</td>
                  <td className="px-4 py-4">{log.action}</td>
                  <td className="px-4 py-4 text-muted-foreground">{log.tableName}</td>
                  <td className="px-4 py-4 font-mono text-xs">{log.recordId}</td>
                  <td className="px-4 py-4"><JsonBlock value={log.previousState} /></td>
                  <td className="px-4 py-4"><JsonBlock value={log.currentState} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PortalLayout>
  );
}
