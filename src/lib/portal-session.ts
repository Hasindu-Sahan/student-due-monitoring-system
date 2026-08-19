export type PortalSession = {
  userId?: number;
  username?: string;
  email?: string;
  role?: "student" | "admin" | "faculty";
  dbRole?: string;
  designation?: string | null;
  profileId?: string;
  name?: string;
};

export async function fetchPortalSession() {
  const response = await fetch("/api/auth/session", { cache: "no-store" });
  const data = await response.json();
  return (data?.session ?? null) as PortalSession | null;
}
