import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import StudioRequest from "@/components/StudioRequest";
import Map from "@/components/Map";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Request a Studio Space | Corus Studios",
  description: "Request studio space at Corus Studios for your shoot.",
};

/**
 * Rendered per request, not at build time — otherwise "today" would be frozen
 * to whenever the site was deployed and the calendar would drift out of date.
 */
export const dynamic = "force-dynamic";

/**
 * Today's date in the studio's timezone, as YYYY-MM-DD.
 *
 * Africa/Accra matches the backend's `STUDIO_TIMEZONE`, so what counts as a
 * past date here is the same as what the API will accept. `en-CA` formats as
 * ISO, which is what the calendar expects.
 */
function studioToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Accra" }).format(new Date());
}

export default function StudioRequestPage() {
  return (
    <>
      <Navbar />
      <StudioRequest todayIso={studioToday()} />
      <Map />
      <Footer />
    </>
  );
}
