import type { ReactNode } from "react";
import { PortalLayout } from "@/components/portal/PortalLayout";

// Faculty uses the admin backend data, but UI will be restricted inside PortalLayout.
export default function FacultyLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

