"use client";

import { OfficeDashboardPage } from "@/components/portal/office-portal";

export default function FASOfficeDashboardPage() {
  return (
    <OfficeDashboardPage
      defaultScope="FAS_Office"
      facultyBasePath="/faculty/FAS_Office"
    />
  );
}