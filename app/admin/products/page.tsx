import * as React from 'react';
import { getProductsAction } from '../../actions/products';
import { ProductCrudClient } from '../../../components/admin/product-crud-client';

export const revalidate = 0; // Prevent cache to show real-time catalog changes

export default async function AdminProductsPage() {
  const products = await getProductsAction({ includeInactive: true });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
          Product Management
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Create, edit, delete, and configure product information and files in Supabase Storage.
        </p>
      </div>

      <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-sm">
        <ProductCrudClient initialProducts={products as any} />
      </div>
    </div>
  );
}
