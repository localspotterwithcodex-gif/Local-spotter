"use client";

import { useParams } from "next/navigation";
import { ProductFormPage } from "@/features/owner/ProductFormPage";

export default function EditProductPage() {
  const { productId } = useParams<{ productId: string }>();
  return <ProductFormPage productId={productId} />;
}
