"use client";

import { OfficeDashboardPage } from "@/components/portal/office-portal";

export default function FOTOfficeDashboardPage() {
  return (
    <OfficeDashboardPage
      defaultScope="FOT_Office"
      facultyBasePath="/faculty/FOT_Office"
    />
  );
}