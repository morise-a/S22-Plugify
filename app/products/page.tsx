import * as React from 'react';
import { getProductsAction } from '../actions/products';
import { ProductCard, type Product } from '../../components/product/product-card';

export const revalidate = 60; // Revalidate list every 60 seconds

export default async function ProductsCatalogPage() {
  const products = await getProductsAction();

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8 flex-1 flex flex-col justify-start">
      {/* Title Header */}
      <div className="space-y-3 pb-8 border-b border-border/40">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
          Software Catalog
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground max-w-2xl">
          Deploy and run production-ready subscription items, developer templates, and SaaS tools instantly.
        </p>
      </div>

      {products.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-24 gap-4">
          <div className="p-4 bg-secondary/50 rounded-full border border-border">
            <svg
              className="h-10 w-10 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-foreground">No products available</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Check back later. The store administrator is currently updating the product catalog.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">
          {products.map((product: Product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
