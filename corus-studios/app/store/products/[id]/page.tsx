import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import ProductCheckout from "@/components/ProductCheckout";
import Map from "@/components/Map";
import Footer from "@/components/Footer";
import { CatalogProduct } from "@/lib/types";
import api from "@/lib/api";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const res = await api.catalog.productBySlug(slug);
    if (!res.ok) throw new Error("Not found");
    const product: CatalogProduct = await res.json();
    const price = parseFloat(product.price).toFixed(2);
    return {
      title: `${product.name} | Corus Studios`,
      description: `Buy the ${product.name} from Corus Studios for GH₵${price}.`,
    };
  } catch {
    return { title: "Product | Corus Studios" };
  }
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  try {
    const res = await api.catalog.productBySlug(slug);
    if (!res.ok) throw new Error("Not found");
    const product: CatalogProduct = await res.json();
    return (
      <>
        <Navbar />
        <ProductCheckout product={product} />
        <Map />
        <Footer />
      </>
    );
  } catch {
    notFound();
  }
}