import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "UniFee · University Fee Management System",
  description: "Secure portal for students and administrators to manage university fees, payments, and reports.",
  authors: [{ name: "UniFee" }],
  openGraph: {
    title: "UniFee",
    description: "University Fee Management System",
    type: "website",
  },
  twitter: {
    card: "summary",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
