'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingCart } from 'lucide-react';
import { useCartStore } from '../../lib/store/use-cart-store';
import { useToast } from '../ui/toast';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';

export interface ProductImage {
  id: string;
  image_url: string;
  is_screenshot: boolean;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  is_active: boolean;
  product_images?: ProductImage[];
}

export function ProductCard({ product }: { product: Product }) {
  const router = useRouter();
  const { showToast } = useToast();
  const addToCart = useCartStore((state) => state.addToCart);

  const mainImage = product.product_images?.find((img) => !img.is_screenshot)?.image_url
    || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80';

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card navigation
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      image_url: mainImage,
    });
    showToast(
      'Added to Cart!',
      'success',
      `"${product.name}" has been added to your shopping cart.`
    );
  };

  return (
    <Card
      onClick={() => router.push(`/products/${product.id}`)}
      className="border-border/60 bg-card overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer group flex flex-col justify-between"
    >
      <div className="relative h-48 w-full bg-secondary/30 overflow-hidden flex items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={mainImage}
          alt={product.name}
          className="w-full h-full object-contain p-3 group-hover:scale-105 transition-transform duration-500"
        />
        <span className="absolute top-3 right-3 px-2.5 py-1 bg-black/60 backdrop-blur-md rounded-full text-xs font-bold text-white shadow-sm">
          ${product.price}
        </span>
      </div>
      <CardContent className="p-5 flex-1 flex flex-col justify-between gap-3">
        <div className="space-y-1.5">
          <h3 className="text-sm sm:text-base font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors">{product.name}</h3>
          <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
            {product.description || 'Premium software solution and ready-to-run package.'}
          </p>
        </div>
        <div className="w-full pt-2">
          <Button
            onClick={handleAddToCart}
            className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-xl bg-primary text-primary-foreground font-bold text-xs capitalize tracking-wider shadow-[0_4px_12px_rgba(79,70,229,0.12)] hover:shadow-[0_6px_20px_rgba(79,70,229,0.22)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer"
          >
            <ShoppingCart className="h-4 w-4" />
            Add to Cart
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
