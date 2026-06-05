import * as React from 'react';
import { notFound } from 'next/navigation';
import { getProductAction, getProductsAction } from '../../actions/products';
import { ProductDetailClient } from '../../../components/product/product-detail-client';

interface PageProps {
  params: Promise<{ id: string }>;
}

export const revalidate = 60; // Cache individual product views for up to 60 seconds

export default async function ProductDetailsPage(props: PageProps) {
  // AWAIT route params in compliance with Next.js 16
  const { id } = await props.params;

  const product = await getProductAction(id);

  if (!product) {
    notFound();
  }

  // Retrieve related products, filtering out the active product
  const allProducts = await getProductsAction();
  const relatedProducts = allProducts.filter((p: any) => p.id !== id).slice(0, 3);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8 flex-1">
      <ProductDetailClient product={product} relatedProducts={relatedProducts} />
    </div>
  );
}
