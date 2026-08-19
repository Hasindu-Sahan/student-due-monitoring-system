"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { fetchPortalSession } from "@/lib/portal-session";

export default function FacultyPaymentsIndexPage() {
  const router = useRouter();

  useEffect(() => {
    fetchPortalSession()
      .then((session) => {
        const value = [
          session?.username ?? "",
          session?.profileId ?? "",
          session?.designation ?? "",
          session?.dbRole ?? "",
          session?.role ?? "",
        ]
          .join(" ")
          .toUpperCase();

        if (value.includes("WEL001") || value.includes("WELFARE")) return "/welfare/payments";
        if (value.includes("FAC002") || value.includes("FOT_OFFICE") || value.includes("FOT")) return "/faculty/FOT_Office/payments";
        if (value.includes("FAC003") || value.includes("FBSF_OFFICE") || value.includes("FBSF")) return "/faculty/FBSF_Office/payments";
        return "/faculty/FAS_Office/payments";
      })
      .then((nextPath) => router.replace(nextPath));
  }, [router]);

  return null;
}
