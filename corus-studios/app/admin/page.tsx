import type { Metadata } from "next";
import AdminHome from "@/components/AdminHome";

export const metadata: Metadata = {
  title: "Admin | Corus Studios",
  description: "Corus Studios administrator dashboard.",
};

/**
 * Host page so the homepage components can be viewed. The admin navbar is
 * owned by someone else and slots in above <AdminHome />.
 */
export default function AdminHomePage() {
  return <AdminHome />;
}
