import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  id: string; // Product UUID
  variantId?: string; // Selected Variant UUID
  name: string;
  price: number;
  image_url?: string;
  quantity: number;
  variantName?: string;
  domain_count?: number;
  layout_count?: number;
  billingCycle?: 'monthly' | 'yearly';
  durationMonths?: number;
  startDate?: string;
  endDate?: string;
  isRenewal?: boolean;
  renewalLicenseKey?: string;
}

interface CartState {
  items: CartItem[];
  couponCode: string | null;
  couponDiscountPercent: number;
  addToCart: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void;
  removeFromCart: (productId: string, variantId?: string) => void;
  updateQuantity: (productId: string, quantity: number, variantId?: string) => void;
  updateCartItem: (productId: string, variantId: string | undefined, updatedFields: Partial<CartItem>) => void;
  applyCoupon: (code: string) => { success: boolean; message: string };
  removeCoupon: () => void;
  clearCart: () => void;
  getTotals: () => {
    subtotal: number;
    discount: number;
    processingFee: number;
    tax: number;
    total: number;
  };
}

const TAX_RATE = 0.10; // 10% flat tax
const STRIPE_PERCENT = 0.029; // 2.9%
const STRIPE_FLAT = 0.30; // $0.30

// Predefined test coupons
const VALID_COUPONS: Record<string, number> = {
  'SAVE10': 10,
  'WELCOME50': 50,
  'ENTERPRISE20': 20,
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      couponCode: null,
      couponDiscountPercent: 0,

      addToCart: (item, quantity = 1) => {
        set((state) => {
          const existingItem = state.items.find(
            (i) => i.id === item.id && i.variantId === item.variantId
          );
          if (existingItem) {
            return {
              items: state.items.map((i) =>
                i.id === item.id && i.variantId === item.variantId
                  ? { ...i, quantity: i.quantity + quantity }
                  : i
              ),
            };
          }
          return { items: [...state.items, { ...item, quantity }] };
        });
      },

      removeFromCart: (productId, variantId) => {
        set((state) => ({
          items: state.items.filter(
            (i) => !(i.id === productId && i.variantId === variantId)
          ),
        }));
      },

      updateQuantity: (productId, quantity, variantId) => {
        if (quantity <= 0) {
          get().removeFromCart(productId, variantId);
          return;
        }
        set((state) => ({
          items: state.items.map((i) =>
            i.id === productId && i.variantId === variantId
              ? { ...i, quantity }
              : i
          ),
        }));
      },

      updateCartItem: (productId, variantId, updatedFields) => {
        set((state) => {
          const itemToUpdate = state.items.find(
            (i) => i.id === productId && i.variantId === variantId
          );
          if (!itemToUpdate) return {};

          const updatedItem = { ...itemToUpdate, ...updatedFields };

          // Check if another item with the new product/variant combo already exists
          const duplicateIndex = state.items.findIndex(
            (i) => i.id === productId && i.variantId === updatedItem.variantId && !(i.id === productId && i.variantId === variantId)
          );

          if (duplicateIndex !== -1) {
            // Merge quantity
            return {
              items: state.items
                .map((i, idx) => {
                  if (idx === duplicateIndex) {
                    return { ...i, quantity: i.quantity + updatedItem.quantity };
                  }
                  return i;
                })
                .filter((i) => !(i.id === productId && i.variantId === variantId)),
            };
          }

          // Otherwise, just update the item
          return {
            items: state.items.map((i) =>
              i.id === productId && i.variantId === variantId ? updatedItem : i
            ),
          };
        });
      },

      applyCoupon: (code) => {
        const uppercaseCode = code.toUpperCase().trim();
        const discount = VALID_COUPONS[uppercaseCode];

        if (discount !== undefined) {
          set({ couponCode: uppercaseCode, couponDiscountPercent: discount });
          return { success: true, message: `Coupon applied: ${discount}% discount!` };
        }
        return { success: false, message: 'Invalid coupon code.' };
      },

      removeCoupon: () => {
        set({ couponCode: null, couponDiscountPercent: 0 });
      },

      clearCart: () => {
        set({ items: [], couponCode: null, couponDiscountPercent: 0 });
      },

      getTotals: () => {
        const { items, couponDiscountPercent } = get();
        
        // 1. Calculate subtotal
        const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        
        // 2. Calculate coupon discount
        const discount = Number(((subtotal * couponDiscountPercent) / 100).toFixed(2));
        const afterDiscount = Math.max(0, subtotal - discount);
        
        // 3. Tax calculation (8%)
        const tax = Number((afterDiscount * TAX_RATE).toFixed(2));
        
        // 4. Processing Fee calculation (2.9% + $0.30)
        const processingFee = afterDiscount > 0 
          ? Number((afterDiscount * STRIPE_PERCENT + STRIPE_FLAT).toFixed(2))
          : 0;
          
        // 5. Total
        const total = Number((afterDiscount + tax + processingFee).toFixed(2));

        return {
          subtotal,
          discount,
          processingFee,
          tax,
          total,
        };
      },
    }),
    {
      name: 'apex-saas-cart', // Unique local storage key
    }
  )
);
