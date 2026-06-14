"use client";

import { OfficePaymentsPage } from "@/components/portal/office-payments";

export default function FOTOfficePaymentsPage() {
  return (
    <OfficePaymentsPage
      defaultScope="FOT_Office"
      facultyBasePath="/faculty/FOT_Office"
    />
  );
}