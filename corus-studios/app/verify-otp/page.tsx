import VerifyOTP from "@/components/VerifyOTP";
import { Suspense } from "react";


export default function VerifyOTPPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
        <VerifyOTP />
    </Suspense>
);
}