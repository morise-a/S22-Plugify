'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingCart, Star, CheckCircle2, ChevronRight } from 'lucide-react';
import { useCartStore } from '../../lib/store/use-cart-store';
import { useToast } from '../ui/toast';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

interface ProductImage {
  id: string;
  image_url: string;
  is_screenshot: boolean;
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  is_active: boolean;
  product_images?: ProductImage[];
}

export function ProductDetailClient({ product, relatedProducts }: { product: Product; relatedProducts: Product[] }) {
  const router = useRouter();
  const { showToast } = useToast();
  const addToCart = useCartStore((state) => state.addToCart);
  
  const [selectedImage, setSelectedImage] = React.useState<string>('');
  const [quantity, setQuantity] = React.useState<number>(1);

  const images = product.product_images || [];
  const mainImage = images.find((img) => !img.is_screenshot)?.image_url 
    || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80';

  const screenshots = images.filter((img) => img.is_screenshot);

  React.useEffect(() => {
    setSelectedImage(mainImage);
  }, [mainImage]);

  const handleAddToCart = () => {
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      image_url: mainImage,
    }, quantity);
    showToast(
      'Added to Cart!',
      'success',
      `"${product.name}" (${quantity}x) has been added to your cart.`
    );
  };

  const handleBuyNow = () => {
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      image_url: mainImage,
    }, quantity);
    router.push('/cart');
  };

  // Mock Reviews
  const reviews = [
    { name: 'Sarah Jenkins', rating: 5, date: 'May 12, 2026', comment: 'Absolutely brilliant. The codebase compiles cleanly and integrates with Stripe webhooks immediately.' },
    { name: 'Marcus Vance', rating: 4, date: 'April 28, 2026', comment: 'Very clean folder structure and robust RLS policies. Ideal starting kit for subscription eCommerce.' },
  ];

  return (
    <div className="space-y-16">
      {/* 1. Main Grid: Gallery + Purchasing Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
        {/* Left Column: Image Gallery */}
        <div className="space-y-4">
          <div className="relative h-96 w-full bg-secondary/30 rounded-2xl overflow-hidden border border-border/60">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selectedImage}
              alt={product.name}
              className="w-full h-full object-cover transition-all duration-300"
            />
          </div>
          
          {/* Thumbnails Row */}
          {images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {/* Main Image Thumbnail */}
              <button
                type="button"
                onClick={() => setSelectedImage(mainImage)}
                className={`relative h-20 w-24 rounded-lg overflow-hidden border-2 flex-shrink-0 cursor-pointer ${
                  selectedImage === mainImage ? 'border-primary' : 'border-transparent'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={mainImage} alt="Main" className="w-full h-full object-cover" />
              </button>

              {/* Screenshots Thumbnails */}
              {screenshots.map((img) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => setSelectedImage(img.image_url)}
                  className={`relative h-20 w-24 rounded-lg overflow-hidden border-2 flex-shrink-0 cursor-pointer ${
                    selectedImage === img.image_url ? 'border-primary' : 'border-transparent'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.image_url} alt="Screenshot" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Information & Actions */}
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">{product.name}</h1>
            <div className="flex items-center gap-2">
              <div className="flex text-amber-500">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <span className="text-xs text-muted-foreground">(2 customer reviews)</span>
              <Badge variant="success" className="ml-2">Active Solution</Badge>
            </div>
          </div>

          <div className="text-3xl font-extrabold text-foreground">
            ${product.price}
          </div>

          <hr className="border-border/60" />

          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Description</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {product.description}
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Included Features</h3>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
              {[
                'Next.js 16 integration',
                'Zustand cart persistent store',
                'Supabase Storage uploads',
                'Stripe Elements confirmations',
                'SMTP email template parsing',
                'Responsive SaaS UI layout',
              ].map((feat, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </div>

          <hr className="border-border/60" />

          {/* Quantity and Actions */}
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-foreground/80">Quantity:</span>
              <div className="flex items-center border border-input bg-card rounded-lg overflow-hidden h-10">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-3 h-full hover:bg-secondary/40 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  -
                </button>
                <span className="px-4 text-sm font-semibold">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity(quantity + 1)}
                  className="px-3 h-full hover:bg-secondary/40 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>

            <div className="flex gap-4 pt-2">
              <Button
                variant="outline"
                className="flex-1 inline-flex items-center justify-center gap-2 h-11"
                onClick={handleAddToCart}
              >
                <ShoppingCart className="h-4 w-4" />
                Add to Cart
              </Button>
              <Button
                className="flex-1 h-11"
                onClick={handleBuyNow}
              >
                Buy Now
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Customer Reviews Tab */}
      <div className="space-y-6 border-t border-border/40 pt-12">
        <h3 className="text-xl font-bold text-foreground">Customer Reviews</h3>
        <div className="space-y-6">
          {reviews.map((rev, idx) => (
            <div key={idx} className="border border-border/60 bg-card rounded-2xl p-5 space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-foreground">{rev.name}</h4>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{rev.date}</p>
                </div>
                <div className="flex text-amber-500">
                  {Array.from({ length: rev.rating }).map((_, r) => (
                    <Star key={r} className="h-3.5 w-3.5 fill-current" />
                  ))}
                </div>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed italic">
                &ldquo;{rev.comment}&rdquo;
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Related Products */}
      {relatedProducts.length > 0 && (
        <div className="space-y-6 border-t border-border/40 pt-12">
          <h3 className="text-xl font-bold text-foreground">Related Products</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {relatedProducts.map((rel) => {
              const relImg = rel.product_images?.find((img) => !img.is_screenshot)?.image_url 
                || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80';
              return (
                <div
                  key={rel.id}
                  onClick={() => router.push(`/products/${rel.id}`)}
                  className="border border-border/60 bg-card rounded-2xl overflow-hidden hover:shadow-md transition-all duration-300 cursor-pointer group"
                >
                  <div className="h-36 bg-secondary/20 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={relImg} alt={rel.name} className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500" />
                  </div>
                  <div className="p-4 space-y-1">
                    <h4 className="text-xs sm:text-sm font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors">{rel.name}</h4>
                    <p className="text-xs font-bold text-foreground">${rel.price}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
