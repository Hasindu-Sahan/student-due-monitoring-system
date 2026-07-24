"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

function resolveOfficePath() {
  if (typeof window === "undefined") return "/faculty/FAS_Office";

  const stored = localStorage.getItem("portalUser");
  const session = stored ? JSON.parse(stored) : null;
  const value = [
    session?.username ?? "",
    session?.profileId ?? "",
    session?.designation ?? "",
    session?.dbRole ?? "",
    session?.role ?? "",
  ]
    .join(" ")
    .toUpperCase();

  if (value.includes("WEL001") || value.includes("WELFARE")) return "/welfare";
  if (value.includes("FAC002") || value.includes("FOT_OFFICE") || value.includes("FOT"))
    return "/faculty/FOT_Office";
  if (value.includes("FAC003") || value.includes("FBSF_OFFICE") || value.includes("FBSF"))
    return "/faculty/FBSF_Office";
  return "/faculty/FAS_Office";
}

export default function FacultyIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(resolveOfficePath());
  }, [router]);

  return null;
}
