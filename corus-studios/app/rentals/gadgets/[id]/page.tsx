import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import GadgetDetail from "@/components/GadgetDetail";
import { RentEquipment } from "@/lib/types";
import api from "@/lib/api";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const res = await api.rentals.equipmentBySlug(id);
    if (!res.ok) return { title: "Gadget | Corus Studios" };
    const gadget: RentEquipment = await res.json();
    return {
      title: `${gadget.name} | Corus Studios`,
      description: `Rent the ${gadget.name} at GH₵${parseFloat(gadget.daily_rate_ghs).toFixed(2)} per day.`,
    };
  } catch {
    return { title: "Gadget | Corus Studios" };
  }
}

export default async function GadgetPage({ params }: Props) {
  const { id } = await params;
  try {
    const res = await api.rentals.equipmentBySlug(id);
    if (!res.ok) throw new Error("Not found");
    const gadget: RentEquipment = await res.json();
    return (
      <>
        <Navbar />
        <GadgetDetail gadget={gadget} />
      </>
    );
  } catch {
    notFound();
  }
}