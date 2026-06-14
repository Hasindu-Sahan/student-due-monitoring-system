"use client";

import { OfficePaymentsPage } from "@/components/portal/office-payments";

export default function FBSFOfficePaymentsPage() {
  return (
    <OfficePaymentsPage
      defaultScope="FBSF_Office"
      facultyBasePath="/faculty/FBSF_Office"
    />
  );
}