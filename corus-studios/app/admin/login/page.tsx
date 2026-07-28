import type { Metadata } from "next";
import AuthShell from "@/components/AuthShell";
import AdminLogIn from "@/components/AdminLogIn";

export const metadata: Metadata = {
  title: "Admin Log In | Corus Studios",
  description: "Staff and administrator access to the Corus Studios dashboard.",
};

export default function AdminLogInPage() {
  return (
    <AuthShell>
      <AdminLogIn />
    </AuthShell>
  );
}
