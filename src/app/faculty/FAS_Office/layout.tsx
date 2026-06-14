import type { ReactNode } from "react";

// Layout for FAS Office portal — children are rendered directly.
// PortalLayout is applied inside each page component.
export default function FASOfficeLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}