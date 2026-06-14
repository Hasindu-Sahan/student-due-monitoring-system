"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  ChevronDown,
  LogOut,
  LayoutDashboard,
  UserCircle2,
  CreditCard,
  Receipt,
  BadgePlus,
  FileBarChart2,
  GraduationCap,
  ClipboardList,
  BellRing,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type NavItem = { to: string; label: string; icon: LucideIcon };

const studentNav: NavItem[] = [
  { to: "/student", label: "Dashboard", icon: LayoutDashboard },
  { to: "/student/payment", label: "Payment", icon: CreditCard },
  { to: "/student/notifications", label: "Notifications", icon: Bell },
  { to: "/student/account", label: "Account", icon: UserCircle2 },
];

const adminNav: NavItem[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/payments", label: "Payments", icon: CreditCard },
  { to: "/admin/add-fee", label: "Add Fee", icon: BadgePlus },
  { to: "/admin/fees", label: "Fee Management", icon: Receipt },
  { to: "/admin/reports", label: "Reports", icon: FileBarChart2 },
  { to: "/admin/audit-logs", label: "Audit Logs", icon: ClipboardList },
  { to: "/admin/notifications", label: "Notifications", icon: BellRing },
  { to: "/admin/account", label: "Account", icon: UserCircle2 },
];

const facultyNav: NavItem[] = [
  { to: "/faculty", label: "Dashboard", icon: LayoutDashboard },
  { to: "/faculty/payments", label: "Payments", icon: CreditCard },
  { to: "/faculty/account", label: "Profile", icon: UserCircle2 },
];

export function PortalLayout({
  role,
  user,
  children,
  title,
  subtitle,
  facultyBasePath = "/faculty",
}: {
  role: "student" | "admin" | "faculty";
  user: { name: string; sub: string; initials: string };
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  facultyBasePath?: string;
}) {
  const nav =
    role === "student"
      ? studentNav
      : role === "faculty"
        ? facultyNav.map((item) => ({
            ...item,
            to: item.to.startsWith("/faculty") ? item.to.replace("/faculty", facultyBasePath) : item.to,
          }))
        : adminNav;
  const pathname = usePathname();
  const [hasUnread, setHasUnread] = useState(false);
  const isWelfarePortal =
    role === "faculty" &&
    [user.name, user.sub, user.initials].some((value) => value.toLowerCase().includes("welfare"));

  useEffect(() => {
    const loadUnread = () => {
      const route = role === "admin" ? "/api/admin/notifications" : "/api/student/notifications";
      fetch(route)
        .then((r) => r.json())
        .then((notifications) => {
          if (Array.isArray(notifications)) {
            setHasUnread(notifications.some((notification) => notification.status === "Unread"));
          }
        })
        .catch(() => setHasUnread(false));
    };

    loadUnread();
    const timer = window.setInterval(loadUnread, 30000);
    return () => window.clearInterval(timer);
  }, [role]);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground lg:flex">
        <div className="flex items-center gap-3 px-6 py-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">UniFee</p>
            <p className="text-xs text-sidebar-muted">Fee Management</p>
          </div>
        </div>

        <div className="px-3 pt-2 pb-1 text-[11px] uppercase tracking-wider text-sidebar-muted">
          {role === "admin"
            ? "Admin Portal"
            : role === "faculty"
              ? isWelfarePortal
                ? "Welfare Portal"
                : facultyBasePath === "/faculty/FAS_Office"
                  ? "FAS Portal"
                  : "Faculty Portal"
              : "Student Portal"}
        </div>

        <nav className="flex-1 space-y-1 px-3 py-2">
          {nav.map((item) => {
            const active =
              item.to === `/${role}`
                ? pathname === item.to
                : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                href={item.to}
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                  active
                    ? "bg-sidebar-active text-primary-foreground shadow-soft"
                    : "text-sidebar-foreground/80 hover:bg-white/5 hover:text-sidebar-foreground"
                )}
              >
                <item.icon className="h-[18px] w-[18px]" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="m-3 rounded-xl border border-sidebar-border bg-white/5 p-3">
          <p className="text-xs text-sidebar-muted">Signed in as</p>
          <p className="mt-0.5 truncate text-sm font-medium">{user.name}</p>
          <p className="truncate text-xs text-sidebar-muted">{user.sub}</p>
        </div>

        <div className="px-3 pb-4">
          <Link
            href="/"
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground/80 transition hover:bg-destructive/15 hover:text-destructive-foreground"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Link>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-card/80 px-6 backdrop-blur">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold tracking-tight">{title}</h1>
            {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-3">
            {role !== "faculty" && (
              <Link href={role === "admin" ? "/admin/notifications" : "/student/notifications"} className="relative flex h-10 w-10 items-center justify-center rounded-xl border bg-card text-muted-foreground transition hover:text-foreground">
                <Bell className="h-[18px] w-[18px]" />
                {hasUnread && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive" />}
              </Link>
            )}
            <button className="flex items-center gap-2 rounded-xl border bg-card pl-1 pr-3 py-1 transition hover:shadow-soft">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-soft text-sm font-semibold text-primary">
                {user.initials}
              </span>
              <span className="hidden text-left sm:block">
                <span className="block text-sm font-medium leading-tight">{user.name}</span>
                <span className="block text-[11px] text-muted-foreground">{user.sub}</span>
              </span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1440px] flex-1 px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
