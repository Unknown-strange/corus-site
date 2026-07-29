import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import GadgetDetail from "@/components/GadgetDetail";
import { findGadget } from "@/lib/gadgets";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const gadget = findGadget(id);

  return {
    title: gadget ? `${gadget.name} | Corus Studios` : "Gadget | Corus Studios",
    description: gadget
      ? `Rent the ${gadget.name} from Corus Studios at GH₵${gadget.daily_rate_ghs} per day.`
      : "Rent photography gadgets from Corus Studios.",
  };
}

export default async function GadgetPage({ params }: Props) {
  const { id } = await params;

  return (
    <>
      <Navbar />
      <GadgetDetail gadget={findGadget(id)} />
    </>
  );
}
