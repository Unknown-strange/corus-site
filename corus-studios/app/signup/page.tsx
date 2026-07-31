import type { Metadata } from "next";
import AuthShell from "@/components/AuthShell";
import SignUp from "@/components/SignUp";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Sign Up | Corus Studios",
  description: "Create a Corus Studios account to book sessions, rent equipment, and shop.",
};

export default function SignUpPage() {
  return (
    <>
    <AuthShell>
      <SignUp />
    </AuthShell>
    <Footer />
    </>
  );
}
