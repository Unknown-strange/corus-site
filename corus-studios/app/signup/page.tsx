import type { Metadata } from "next";
import SignUp from "@/components/SignUp";

export const metadata: Metadata = {
  title: "Sign Up | Corus Studios",
  description: "Create a Corus Studios account to book sessions, rent equipment, and shop.",
};

export default function SignUpPage() {
  return <SignUp />;
}
