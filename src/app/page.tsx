"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { BookOpen, GraduationCap, Lock, ShieldCheck, User } from "lucide-react";
import adminBackground from "../../Admin.jpeg";

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
    <div className="relative min-h-screen overflow-hidden bg-slate-950">
      <Image src={adminBackground} alt="Admin background" fill priority className="object-cover" />
      <div className="absolute inset-0 bg-slate-950/60" />

      <div className="relative flex min-h-screen items-center justify-center px-6 py-12">
        <div className="glass-panel w-full max-w-md rounded-3xl p-8 text-white sm:p-10">
          <div className="mb-10 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 text-white shadow-soft ring-1 ring-white/20">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">UniFee</p>
              <p className="text-xs text-white/70">University Fee Management</p>
            </div>
          </div>

          <h1 className="text-3xl font-semibold tracking-tight text-white">Welcome back</h1>
          <p className="mt-2 text-sm text-white/70">
            Sign in to the University Fee Management System
          </p>

          <div className="mt-8 grid grid-cols-2 gap-2 rounded-2xl border border-white/15 bg-white/10 p-1.5 shadow-sm backdrop-blur-md">
            {(["student", "admin"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={`flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium capitalize transition ${
                  role === r
                    ? "bg-white text-slate-950 shadow-soft"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
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
                  if (/username|email|invalid|user/i.test(friendly)) setUsernameError(friendly);
                  if (/password|invalid/i.test(friendly)) setPasswordError(friendly);
                  return;
                }

                localStorage.setItem("portalUser", JSON.stringify(data));

                const profileId = String(data.profileId ?? "").toUpperCase();
                const isWelfare = profileId.includes("WEL001") || profileId.includes("WEL");
                const isFas = profileId.includes("FAC001") || profileId.includes("FAS");
                const isFot = profileId.includes("FAC002") || profileId.includes("FOT");
                const isFbsf = profileId.includes("FAC003") || profileId.includes("FBSF");
                const nextRoute =
                  data.role === "student"
                    ? "/student"
                    : data.dbRole === "Staff"
                      ? isWelfare
                        ? "/welfare"
                        : isFas
                          ? "/faculty/FAS_Office"
                          : isFot
                            ? "/faculty/FOT_Office"
                            : isFbsf
                              ? "/faculty/FBSF_Office"
                              : "/faculty"
                      : "/admin";
                router.push(nextRoute);
              } catch {
                setError("Network error. Please check your connection and try again.");
              } finally {
                setSigningIn(false);
              }
            }}
          >
            <div>
              <label htmlFor="username" className="mb-1.5 block text-sm font-medium text-white/85">
                Username
              </label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/55" />
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
                  className={`h-11 w-full rounded-xl border border-white/15 bg-white/12 pl-10 pr-3 text-sm text-white outline-none transition placeholder:text-white/45 focus:border-white/35 focus:ring-4 focus:ring-white/10 ${
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
                <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-white/85">
                  Password
                </label>

                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="text-sm font-medium text-white hover:underline"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>

              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/55" />
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
                  className={`h-11 w-full rounded-xl border border-white/15 bg-white/12 pl-10 pr-3 text-sm text-white outline-none transition placeholder:text-white/45 focus:border-white/35 focus:ring-4 focus:ring-white/10 ${
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
              <label className="flex items-center gap-2 text-sm text-white/70">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-input accent-[var(--primary)]"
                />
                Remember me
              </label>
              <a href="#" className="text-sm font-medium text-white hover:underline">
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
              className="h-11 w-full rounded-xl bg-white text-sm font-semibold text-slate-950 shadow-soft transition hover:bg-white/90 disabled:opacity-60"
            >
              {signingIn ? "Signing in..." : `Sign in as ${role}`}
            </button>

            <p className="pt-2 text-center text-xs text-white/65">
              Need help? Contact the Bursar&apos;s Office at{" "}
              <span className="text-white">finance@university.lk</span>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
