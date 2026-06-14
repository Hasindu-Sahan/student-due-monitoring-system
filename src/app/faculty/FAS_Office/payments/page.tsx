"use client";

import { OfficePaymentsPage } from "@/components/portal/office-payments";

export default function FASOfficePaymentsPage() {
  return (
    <OfficePaymentsPage
      defaultScope="FAS_Office"
      facultyBasePath="/faculty/FAS_Office"
    />
  );
}