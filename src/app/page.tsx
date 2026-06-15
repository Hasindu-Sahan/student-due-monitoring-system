"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, Lock, User, ShieldCheck, BookOpen } from "lucide-react";
import { lkr } from "@/lib/data";

type Stats = {
  totalPaid: number;
  totalStudents: number;
  paymentRate: number;
};

export default function LoginPage() {
  const [role, setRole] = useState<"student" | "admin">("student");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [stats, setStats] = useState<Stats>({ totalPaid: 0, totalStudents: 0, paymentRate: 0 });
  const router = useRouter();

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) {
          setStats({
            totalPaid: data.totalPaid ?? 0,
            totalStudents: data.totalStudents ?? 0,
            paymentRate: data.paymentRate ?? 0,
          });
        }
      });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto grid min-h-screen max-w-[1440px] grid-cols-1 lg:grid-cols-2">
        {/* Left: form */}
        <div className="flex items-center justify-center px-6 py-12 lg:px-16">
          <div className="w-full max-w-md">
            <div className="mb-10 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-soft">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">UniFee</p>
                <p className="text-xs text-muted-foreground">University Fee Management</p>
              </div>
            </div>

            <h1 className="text-3xl font-semibold tracking-tight">Welcome back</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Sign in to the University Fee Management System
            </p>

            <div className="mt-8 grid grid-cols-2 gap-2 rounded-2xl border bg-card p-1.5 shadow-card">
              {(["student", "admin"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  className={`flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium capitalize transition ${
                    role === r
                      ? "bg-primary text-primary-foreground shadow-soft"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {r === "student" ? <BookOpen className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                  {r}
                </button>
              ))}
            </div>

            <form
              className="mt-6 space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                setError("");

                const usernameTrimmed = username.trim();
                const nextUsernameError = usernameTrimmed ? "" : "Username is required";
                const nextPasswordError = password ? "" : "Password is required";

                if (nextUsernameError || nextPasswordError) {
                  // field errors are surfaced below via aria-invalid descriptions
                  if (nextUsernameError) setUsernameError(nextUsernameError);
                  if (nextPasswordError) setPasswordError(nextPasswordError);
                  return;
                }

                setUsernameError("");
                setPasswordError("");
                setSigningIn(true);

                try {
                  const res = await fetch("/api/auth/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ role, username: usernameTrimmed, password }),
                  });

                  const data = await res.json();

                  if (!res.ok) {
                    const friendly = data?.error ?? "Unable to sign in";
                    setError(friendly);
                    // best-effort mapping to field-level errors
                    if (/username|email|invalid|user/i.test(friendly)) setUsernameError(friendly);
                    if (/password|invalid/i.test(friendly)) setPasswordError(friendly);
                    return;
                  }

                  // Always store in localStorage for current session
                  localStorage.setItem("portalUser", JSON.stringify(data));

                  // Route the user to the correct portal based on the
                  // portal role returned by the server (student / admin / faculty).
                  const nextRoute =
                    data.role === "student"
                      ? "/student"
                      : data.role === "faculty"
                        ? // Welfare is a separate portal section
                          data.profileId === "WEL001" ||
                            String(data.profileId ?? "").toUpperCase().includes("WEL")
                          ? "/welfare"
                          : data.profileId === "FAC001"
                            ? "/faculty/FAS_Office"
                            : data.profileId === "FAC002"
                              ? "/faculty/FOT_Office"
                              : data.profileId === "FAC003"
                                ? "/faculty/FBSF_Office"
                                : "/faculty/FAS_Office"
                        : "/admin";
                  router.push(nextRoute);
                } catch (err) {
                  setError("Network error. Please check your connection and try again.");
                } finally {
                  setSigningIn(false);
                }
              }}
            >
              <div>
                <label htmlFor="username" className="mb-1.5 block text-sm font-medium">
                  Username
                </label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      if (usernameError) setUsernameError("");
                    }}
                    aria-invalid={!!usernameError}
                    aria-describedby={usernameError ? "username-error" : undefined}
                    className={`h-11 w-full rounded-xl border bg-card pl-10 pr-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 ${
                      usernameError ? "border-destructive/40" : ""
                    }`}
                  />
                </div>
                {usernameError && (
                  <p id="username-error" className="mt-1.5 text-xs font-medium text-destructive">
                    {usernameError}
                  </p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="mb-1.5 block text-sm font-medium">
                    Password
                  </label>

                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="text-sm font-medium text-primary hover:underline"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>

                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (passwordError) setPasswordError("");
                    }}
                    aria-invalid={!!passwordError}
                    aria-describedby={passwordError ? "password-error" : undefined}
                    className={`h-11 w-full rounded-xl border bg-card pl-10 pr-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 ${
                      passwordError ? "border-destructive/40" : ""
                    }`}
                  />
                </div>
                {passwordError && (
                  <p id="password-error" className="mt-1.5 text-xs font-medium text-destructive">
                    {passwordError}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-input accent-[var(--primary)]"
                  />
                  Remember me
                </label>
                <a href="#" className="text-sm font-medium text-primary hover:underline">
                  Forgot password?
                </a>
              </div>

              <div aria-live="polite" aria-atomic="true">
                {error ? (
                  <div className="rounded-xl border border-destructive/20 bg-destructive-soft px-3 py-2 text-sm font-medium text-destructive">
                    {error}
                  </div>
                ) : (
                  <div className="h-0" />
                )}
              </div>

              <button
                type="submit"
                disabled={signingIn || !username.trim() || !password}
                className="h-11 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-soft transition hover:bg-primary/90 disabled:opacity-60"
              >
                {signingIn ? "Signing in..." : `Sign in as ${role}`}
              </button>

              <p className="pt-2 text-center text-xs text-muted-foreground">
                Need help? Contact the Bursar's Office at{" "}
                <span className="text-foreground">finance@university.lk</span>
              </p>
            </form>
          </div>
        </div>

        {/* Right: illustration */}
        <div className="relative hidden overflow-hidden bg-sidebar lg:block">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(37,99,235,0.45),transparent_55%),radial-gradient(circle_at_70%_80%,rgba(22,163,74,0.25),transparent_60%)]" />
          <div className="relative flex h-full flex-col justify-between p-12 text-sidebar-foreground">
            <div className="flex items-center gap-2 text-xs font-medium text-sidebar-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              All systems operational
            </div>

            <div className="space-y-8">
              <h2 className="text-4xl font-semibold leading-tight tracking-tight">
                Manage tuition,<br />payments & reports —<br />all in one place.
              </h2>

              <div className="grid gap-3">
                {[
                  { v: lkr(stats.totalPaid), l: "Collected through approved fees" },
                  { v: stats.totalStudents.toLocaleString("en-LK"), l: "Student accounts in database" },
                  { v: `${stats.paymentRate}%`, l: "Paid fee assignment rate" },
                ].map((s) => (
                  <div key={s.l} className="flex items-center justify-between rounded-2xl border border-sidebar-border bg-white/5 p-4 backdrop-blur">
                    <span className="text-sm text-sidebar-muted">{s.l}</span>
                    <span className="text-lg font-semibold">{s.v}</span>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-xs text-sidebar-muted">
              © 2026 Wayamba University of Sri Lanka · Bursar's Office
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
