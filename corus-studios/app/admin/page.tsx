import type { Metadata } from "next";

import AdminHome from "@/components/AdminHome";
import NavbarAdmin from "@/components/NavbarAdmin";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
    title: "Admin | Corus Studios",
    description:
        "Corus Studios administrator dashboard.",
};

export default function AdminHomePage() {
    return (
        <>
            <NavbarAdmin />

            <AdminHome />

            <Footer />
        </>
    );
}