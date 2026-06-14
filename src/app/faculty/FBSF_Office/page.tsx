"use client";

import { OfficeDashboardPage } from "@/components/portal/office-portal";

export default function FBSFOfficeDashboardPage() {
  return (
    <OfficeDashboardPage
      defaultScope="FBSF_Office"
      facultyBasePath="/faculty/FBSF_Office"
    />
  );
}