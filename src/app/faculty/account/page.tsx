"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

function resolveOfficePath() {
  if (typeof window === "undefined") return "/faculty/FAS_Office/account";

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

  if (value.includes("WEL001") || value.includes("WELFARE")) return "/welfare/account";
  if (value.includes("FAC002") || value.includes("FOT_OFFICE") || value.includes("FOT"))
    return "/faculty/FOT_Office/account";
  if (value.includes("FAC003") || value.includes("FBSF_OFFICE") || value.includes("FBSF"))
    return "/faculty/FBSF_Office/account";
  return "/faculty/FAS_Office/account";
}

export default function FacultyAccountIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(resolveOfficePath());
  }, [router]);

  return null;
}
