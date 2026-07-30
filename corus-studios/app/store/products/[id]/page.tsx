import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import ProductCheckout from "@/components/ProductCheckout";
import Map from "@/components/Map";
import Footer from "@/components/Footer";
import { findProduct, formatGhs } from "@/lib/store-products";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const product = findProduct(id);

  return {
    title: product ? `${product.name} | Corus Studios` : "Product | Corus Studios",
    description: product
      ? `Buy the ${product.name} from Corus Studios for ${formatGhs(product.price)}.`
      : "Buy photography gadgets from Corus Studios.",
  };
}

export default async function ProductPage({ params }: Props) {
  const { id } = await params;

  return (
    <>
      <Navbar />
      <ProductCheckout product={findProduct(id)} />
      <Map />
      <Footer />
    </>
  );
}
