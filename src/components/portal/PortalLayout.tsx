"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  LogOut,
  LayoutDashboard,
  UserCircle2,
  CreditCard,
  Receipt,
  BadgePlus,
  FileBarChart2,
  GraduationCap,
  ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type NavItem = { to: string; label: string; icon: LucideIcon };

const studentNav: NavItem[] = [
  { to: "/student", label: "Dashboard", icon: LayoutDashboard },
  { to: "/student/payment", label: "Payment", icon: CreditCard },
  { to: "/student/account", label: "Account", icon: UserCircle2 },
];

const adminNav: NavItem[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/add-fee", label: "Add Fee", icon: BadgePlus },
  { to: "/admin/fees", label: "Fee Management", icon: Receipt },
  { to: "/admin/audit-logs", label: "Audit", icon: ClipboardList },
  { to: "/admin/account", label: "Account", icon: UserCircle2 },
];

const officeNav: NavItem[] = [
  { to: "/faculty", label: "Dashboard", icon: LayoutDashboard },
  { to: "/faculty/payments", label: "Payments", icon: CreditCard },
  { to: "/faculty/reports", label: "Reports", icon: FileBarChart2 },
  { to: "/faculty/account", label: "Account", icon: UserCircle2 },
];

function getPortalBasePath(role: "student" | "admin" | "faculty", basePath?: string) {
  if (role !== "faculty") return null;
  return basePath?.replace(/\/$/, "") || "/faculty";
}

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
  children: ReactNode;
  facultyBasePath?: string;
}) {
  const portalBasePath = getPortalBasePath(role, facultyBasePath);
  const nav =
    role === "student"
      ? studentNav
      : role === "faculty"
        ? officeNav.map((item) => ({
            ...item,
            to:
              portalBasePath && item.to.startsWith("/faculty")
                ? item.to.replace("/faculty", portalBasePath)
                : item.to,
          }))
        : adminNav;
  const pathname = usePathname();
  const isWelfarePortal =
    role === "faculty" &&
    [user.name, user.sub, user.initials].some((value) => value.toLowerCase().includes("welfare"));
  const activeBasePath = portalBasePath ?? "/faculty";

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
                : facultyBasePath.includes("FAS_Office")
                  ? "FAS Portal"
                  : facultyBasePath.includes("FOT_Office")
                    ? "FOT Portal"
                    : facultyBasePath.includes("FBSF_Office")
                      ? "FBSF Portal"
                      : "Faculty Portal"
              : "Student Portal"}
        </div>

        <nav className="flex-1 space-y-1 px-3 py-2">
          {nav.map((item) => {
            const isDashboardItem = item.label.toLowerCase() === "dashboard";
            const active = isDashboardItem
              ? pathname === item.to || (role === "faculty" && pathname === activeBasePath)
              : item.to === `/${role}`
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
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem("portalUser");
              window.location.href = "/";
            }}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground/80 transition hover:bg-destructive/15 hover:text-destructive-foreground"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-card/80 px-6 backdrop-blur">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold tracking-tight">{title}</h1>
            {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 rounded-xl border bg-card pl-1 pr-3 py-1 transition hover:shadow-soft">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-soft text-sm font-semibold text-primary">
                {user.initials}
              </span>
              <span className="hidden text-left sm:block">
                <span className="block text-sm font-medium leading-tight">{user.name}</span>
                <span className="block text-[11px] text-muted-foreground">{user.sub}</span>
              </span>
            </button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1440px] flex-1 px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
