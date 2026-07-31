import type { Metadata } from "next";
import AuthShell from "@/components/AuthShell";
import LogIn from "@/components/LogIn";
import Footer from "@/components/Footer";


export const metadata: Metadata = {
  title: "Log In | Corus Studios",
  description: "Log in to your Corus Studios account.",
};

export default function LogInPage() {
  return (
    <>
    <AuthShell>
      <LogIn />
    </AuthShell>
    <Footer />
    </>
  );
}
