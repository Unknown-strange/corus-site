import type { Metadata } from "next";

import AdminGuard from "@/components/AdminGuard";

export const metadata: Metadata = {
  title:
    "Admin | Corus Studios",

  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminGuard>
      {children}
    </AdminGuard>
  );
}