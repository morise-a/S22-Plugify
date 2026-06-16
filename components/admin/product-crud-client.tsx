'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Edit2, Trash2, Upload, X, Eye, EyeOff, Loader2, Sparkles, Image as ImageIcon, FileText, Layers, ChevronRight, CheckCircle2 } from 'lucide-react';
import { productSchema, ProductInput } from '../../lib/validations/schemas';
import { createProductAction, updateProductAction, deleteProductAction, deleteProductImageAction } from '../../app/actions/products';
import { useToast } from '../ui/toast';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../ui/table';
import { Badge } from '../ui/badge';
import { Modal } from '../ui/modal';
import { ConfirmationModal } from '../ui/confirmation-modal';

interface ProductImage {
  id: string;
  image_url: string;
  is_screenshot: boolean;
}

interface ProductVariant {
  id: string;
  product_id: string;
  name: string;
  price: number;
  domain_count?: number;
  layout_count?: number;
  billing_cycle?: 'monthly' | 'yearly';
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  is_active: boolean;
  api_key?: string[];
  product_images?: ProductImage[];
  product_variants?: ProductVariant[];
}

export function ProductCrudClient({ initialProducts }: { initialProducts: Product[] }) {
  const { showToast } = useToast();
  const [products, setProducts] = React.useState<Product[]>(initialProducts);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingProduct, setEditingProduct] = React.useState<Product | null>(null);
  const [productToDeleteId, setProductToDeleteId] = React.useState<string | null>(null);
  const [imageToDeleteId, setImageToDeleteId] = React.useState<string | null>(null);
  const [isDeletingProduct, setIsDeletingProduct] = React.useState(false);
  const [isDeletingImage, setIsDeletingImage] = React.useState(false);

  const [images, setImages] = React.useState<File[]>([]);
  const [screenshots, setScreenshots] = React.useState<File[]>([]);
  const [pluginZip, setPluginZip] = React.useState<File | null>(null);
  const [keepExistingPlugin, setKeepExistingPlugin] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const [dragOverImages, setDragOverImages] = React.useState(false);
  const [dragOverScreenshots, setDragOverScreenshots] = React.useState(false);

  // Step wizard & Variants state
  const [currentStep, setCurrentStep] = React.useState(1);
  interface ClientProductVariant {
    id?: string;
    name: string;
    price: number;
    domain_count: number;
    layout_count: number;
    billing_cycle?: 'monthly' | 'yearly';
  }
  const [variants, setVariants] = React.useState<ClientProductVariant[]>([
    { name: 'Single Domain single layout', price: 99, domain_count: 1, layout_count: 1, billing_cycle: 'monthly' },
    { name: 'Multiple domain multiple layout', price: 299, domain_count: 5, layout_count: 5, billing_cycle: 'monthly' }
  ]);
  const [apiKeys, setApiKeys] = React.useState<string[]>(['']);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    trigger,
    formState: { errors },
  } = useForm<ProductInput>({
    resolver: zodResolver(productSchema),
  });

  // Open modal for Create
  const handleAddClick = () => {
    setEditingProduct(null);
    setImages([]);
    setScreenshots([]);
    setPluginZip(null);
    setKeepExistingPlugin(true);
    setVariants([
      { name: 'Single Domain single layout', price: 99, domain_count: 1, layout_count: 1, billing_cycle: 'monthly' },
      { name: 'Multiple domain multiple layout', price: 299, domain_count: 5, layout_count: 5, billing_cycle: 'monthly' }
    ]);
    reset({ name: '', description: '', price: 99 });
    setApiKeys(['']);
    setCurrentStep(1);
    setIsModalOpen(true);
  };

  // Open modal for Edit
  const handleEditClick = (product: Product) => {
    setEditingProduct(product);
    setImages([]);
    setScreenshots([]);
    setPluginZip(null);
    setKeepExistingPlugin(true);

    if (product.product_variants && product.product_variants.length > 0) {
      setVariants(
        product.product_variants.map(v => ({
          id: v.id,
          name: v.name,
          price: Number(v.price),
          domain_count: Number(v.domain_count) || 1,
          layout_count: Number((v as any).layout_count) || 1,
          billing_cycle: (v as any).billing_cycle || 'monthly'
        }))
      );
    } else {
      setVariants([
        { name: 'Single Domain single layout', price: Number(product.price) || 99, domain_count: 1, layout_count: 1, billing_cycle: 'monthly' }
      ]);
    }

    const firstPrice = product.product_variants && product.product_variants.length > 0
      ? Number(product.product_variants[0].price)
      : Number(product.price) || 99;

    if (product.api_key && Array.isArray(product.api_key)) {
      setApiKeys(product.api_key.length > 0 ? product.api_key : ['']);
    } else if (product.api_key) {
      setApiKeys([product.api_key as any]);
    } else {
      setApiKeys(['']);
    }
    reset({
      name: product.name,
      description: product.description,
      price: firstPrice,
    });
    setCurrentStep(1);
    setIsModalOpen(true);
  };

  const handleNext = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const isValid = await trigger(['name', 'description']);
    if (!isValid) return;

    if (currentStep === 1) {
      setCurrentStep(2);
    } else if (currentStep === 2) {
      const firstPrice = variants.length > 0 ? Number(variants[0].price) : 99;
      setValue('price', firstPrice);
      setCurrentStep(3);
    } else if (currentStep === 3) {
      setCurrentStep(4);
    }
  };

  const handleBack = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleTabClick = async (targetStep: number) => {
    if (currentStep === 1 && targetStep > 1) {
      const isValid = await trigger(['name', 'description']);
      if (!isValid) return;
    }
    setCurrentStep(targetStep);
  };

  const renderStepIndicators = () => {
    const stepsData = [
      { step: 1, title: 'Details', icon: FileText, subtitle: 'Basic info' },
      { step: 2, title: 'Pricing', icon: Layers, subtitle: 'Pricing tiers' },
      { step: 3, title: 'Assets', icon: ImageIcon, subtitle: 'Media & covers' },
      { step: 4, title: 'Plugin Zip', icon: Upload, subtitle: 'Plugin archive' }
    ];

    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6 select-none">
        {stepsData.map((item) => {
          const Icon = item.icon;
          const isActive = currentStep === item.step;
          const isCompleted = currentStep > item.step;

          return (
            <button
              key={item.step}
              type="button"
              onClick={() => handleTabClick(item.step)}
              className={`group w-full flex items-center gap-3 py-2.5 px-3.5 rounded-xl text-xs font-bold transition-all duration-200 border cursor-pointer focus:outline-none ${isActive
                ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/15 scale-[1.01]'
                : isCompleted
                  ? 'bg-indigo-50/50 border-indigo-200/80 text-slate-600'
                  : 'border-slate-200 text-slate-500 hover:bg-indigo-50/30'
                }`}
            >
              {/* Icon Container */}
              <div className={`p-1.5 rounded-lg shrink-0 transition-colors duration-200 ${isActive
                ? 'bg-white/20 text-white'
                : isCompleted
                  ? 'bg-slate-200 text-slate-400'
                  : 'border-2 border-dashed'
                }`}>
                <Icon className="h-4 w-4 stroke-[2.2]" />
              </div>

              {/* Title & Step Text */}
              <div className="flex flex-col items-start text-left leading-none">
                <span className={`text-[9px] font-bold tracking-wide capitalize transition-colors duration-200 ${isActive
                  ? 'text-white/80'
                  : isCompleted
                    ? 'text-slate-400'
                    : 'text-slate-400 group-hover:text-indigo-450/80'
                  }`}>
                  Step {item.step}
                </span>
                <span className="text-xs font-semibold mt-0.5 tracking-tight">
                  {item.title}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  // Delete product action
  const executeDeleteProduct = async (id: string) => {
    setIsDeletingProduct(true);
    try {
      const res = await deleteProductAction(id);
      if (res.success) {
        showToast('Product Deleted', 'success', 'Product has been removed.');
        setProducts(products.filter((p) => p.id !== id));
      } else {
        showToast('Delete Failed', 'error', res.error);
      }
    } catch (err) {
      showToast('Error', 'error', 'Failed to delete product.');
    } finally {
      setIsDeletingProduct(false);
    }
  };

  // Delete existing database product image (e.g. from Supabase Storage)
  const executeDeleteImage = async (imageId: string) => {
    setIsDeletingImage(true);
    try {
      const res = await deleteProductImageAction(imageId);
      if (res.success) {
        showToast('Image Removed', 'success', 'Image removed from product details.');
        // Update product images state locally
        if (editingProduct) {
          const updatedImages = editingProduct.product_images?.filter((img) => img.id !== imageId) || [];
          const updatedProd = { ...editingProduct, product_images: updatedImages };
          setEditingProduct(updatedProd);
          setProducts(products.map((p) => (p.id === editingProduct.id ? updatedProd : p)));
        }
      } else {
        showToast('Remove Failed', 'error', res.error);
      }
    } catch (err) {
      showToast('Error', 'error', 'Could not delete image.');
    } finally {
      setIsDeletingImage(false);
    }
  };

  const handleDeleteProduct = (id: string) => {
    setProductToDeleteId(id);
  };

  const handleDeleteImage = (imageId: string) => {
    setImageToDeleteId(imageId);
  };

  // File drop helpers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'images' | 'screenshots') => {
    const selected = Array.from(e.target.files || []);
    // Simple validation: check size (< 5MB)
    const validFiles = selected.filter((file) => file.size <= 5 * 1024 * 1024);
    if (validFiles.length !== selected.length) {
      showToast('Size warning', 'info', 'Some files exceeded the 5MB size limit.');
    }

    if (type === 'images') {
      setImages((prev) => [...prev, ...validFiles]);
    } else {
      setScreenshots((prev) => [...prev, ...validFiles]);
    }
  };

  const removeSelectedFile = (idx: number, type: 'images' | 'screenshots') => {
    if (type === 'images') {
      setImages((prev) => prev.filter((_, i) => i !== idx));
    } else {
      setScreenshots((prev) => prev.filter((_, i) => i !== idx));
    }
  };

  const onFormError = (formErrors: any) => {
    if (formErrors.name || formErrors.description) {
      setCurrentStep(1);
      showToast('Validation Error', 'error', 'Please verify product name and details on Step 1.');
    }
  };

  const onFormSubmit = async (data: ProductInput) => {
    const hasExistingMainImage = editingProduct?.product_images?.some((img) => !img.is_screenshot);
    if (!hasExistingMainImage && images.length === 0) {
      showToast('Validation Error', 'error', 'At least one main image (Media) is required.');
      return;
    }

    setIsSubmitting(true);

    const formData = new FormData();
    formData.append('name', data.name);
    formData.append('description', data.description || '');
    const basePrice = variants.length > 0 ? Number(variants[0].price) : 99;
    formData.append('price', String(basePrice));
    formData.append('is_active', 'true'); // defaults to true on saves

    const cleanApiKeys = apiKeys.map(k => k.trim()).filter(Boolean);
    cleanApiKeys.forEach(k => formData.append('apiKeys', k));

    const variantsArr = variants.map(v => ({
      name: v.name || 'Standard Plan',
      price: Number(v.price) || 0,
      domain_count: Number(v.domain_count) || 1,
      layout_count: Number(v.layout_count) || 1,
      billing_cycle: v.billing_cycle || 'monthly'
    }));
    formData.append('variants', JSON.stringify(variantsArr));

    images.forEach((img) => formData.append('images', img));
    screenshots.forEach((scr) => formData.append('screenshots', scr));

    if (pluginZip) {
      formData.append('pluginZip', pluginZip);
    }
    formData.append('keepExistingPlugin', String(keepExistingPlugin));

    try {
      if (editingProduct) {
        // Edit Action
        const res = await updateProductAction(editingProduct.id, formData);
        if (res.success) {
          showToast('Product Updated', 'success', 'Product record saved successfully.');
          setIsModalOpen(false);
          window.location.reload();
        } else {
          showToast('Update Failed', 'error', res.error);
        }
      } else {
        // Create Action
        const res = await createProductAction(formData);
        if (res.success) {
          showToast('Product Created', 'success', 'Product added to store catalog.');
          setIsModalOpen(false);
          window.location.reload();
        } else {
          showToast('Creation Failed', 'error', res.error);
        }
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Saving failed.';
      showToast('Error', 'error', errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-4 border-b border-slate-200/40">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Catalog Manager</h1>
          <p className="text-xs text-slate-500">Add, configure, and manage active software licenses or digital products</p>
        </div>
        <Button onClick={handleAddClick} className="inline-flex items-center gap-2 h-10 px-5 rounded-xl cursor-pointer shrink-0">
          <Plus className="h-4.5 w-4.5" />
          Add Product
        </Button>
      </div>

      {/* Table list */}
      <div className="overflow-hidden border border-slate-100 rounded-2xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.015)]">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/70 border-b border-slate-100 hover:bg-slate-50/70">
              <TableHead className="font-bold text-slate-500 text-xs py-3.5 pl-4">Product Details</TableHead>
              <TableHead className="font-bold text-slate-500 text-xs py-3.5">Price (AUD)</TableHead>
              <TableHead className="font-bold text-slate-500 text-xs py-3.5">Status</TableHead>
              <TableHead className="font-bold text-slate-500 text-xs py-3.5">Uploaded Assets</TableHead>
              <TableHead className="font-bold text-slate-500 text-xs py-3.5 text-right pr-4">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-slate-100">
            {products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center p-12 text-slate-400 text-xs font-semibold">
                  No active products in catalog. Click &quot;Add Product&quot; to list your first item.
                </TableCell>
              </TableRow>
            ) : (
              products.map((p) => {
                const imageCount = p.product_images?.length || 0;
                return (
                  <TableRow key={p.id} className="hover:bg-slate-50/20 transition-colors">
                    <TableCell className="py-4 pl-4">
                      <div className="flex flex-col max-w-sm">
                        <span className="font-bold text-slate-900 text-xs">{p.name}</span>
                        <span className="text-[10px] text-slate-400 font-semibold line-clamp-1 mt-0.5">{p.description}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-bold text-slate-800 text-xs py-4">${Number(p.price).toFixed(2)}</TableCell>
                    <TableCell className="py-4">
                      <Badge variant={p.is_active ? 'success' : 'destructive'} className="capitalize text-[9px] tracking-wider font-bold px-2 py-0.5 rounded-md">
                        {p.is_active ? 'active' : 'inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[10px] text-slate-400 font-bold py-4">
                      {imageCount} {imageCount === 1 ? 'file' : 'files'}
                    </TableCell>
                    <TableCell className="text-right py-4 pr-4 space-x-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditClick(p)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 border border-indigo-200/80 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-900 rounded-lg text-[11px] font-bold transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
                        title="Edit Product"
                      >
                        <Edit2 className="h-3 w-3" />
                        <span>Edit</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteProduct(p.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-200/80 text-red-650 hover:bg-red-100 hover:text-red-800 rounded-lg text-[11px] font-bold transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
                        title="Delete Product"
                      >
                        <Trash2 className="h-3 w-3" />
                        <span>Delete</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => !isSubmitting && setIsModalOpen(false)}
        title={editingProduct ? 'Edit Product Details' : 'Create New Product'}
        size="xl"
        footer={
          <div className="flex justify-between w-full">
            <div>
              {currentStep > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  disabled={isSubmitting}
                  className="h-10 px-4 rounded-xl border-slate-200 text-slate-650 font-bold cursor-pointer"
                >
                  Back
                </Button>
              )}
            </div>
            <div className="space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsModalOpen(false);
                }}
                disabled={isSubmitting}
                className="h-10 px-4 rounded-xl border-slate-200 text-slate-650 font-bold cursor-pointer"
              >
                Cancel
              </Button>

              {editingProduct && (
                <Button
                  type="submit"
                  form="product-form"
                  isLoading={isSubmitting}
                  className="h-10 px-4.5 rounded-xl font-bold cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white border-0 shadow-[0_4px_12px_rgba(16,185,129,0.15)] hover:scale-102 active:scale-98 transition-all"
                >
                  Save Changes
                </Button>
              )}

              {currentStep < 4 && (
                <Button
                  type="button"
                  onClick={handleNext}
                  className="h-10 px-5 rounded-xl font-bold cursor-pointer"
                >
                  Next
                </Button>
              )}

              {!editingProduct && currentStep === 4 && (
                <Button
                  type="submit"
                  form="product-form"
                  isLoading={isSubmitting}
                  className="h-10 px-5 rounded-xl font-bold cursor-pointer"
                >
                  Create Product
                </Button>
              )}
            </div>
          </div>
        }
      >
        <form
          id="product-form"
          onSubmit={handleSubmit(onFormSubmit, onFormError)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              // Only prevent default if target is an input/textarea (not a button)
              const target = e.target as HTMLElement;
              if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
                e.preventDefault();
              }
            }
          }}
          className="space-y-5 text-left p-2"
        >
          {renderStepIndicators()}

          {currentStep === 1 && (
            <div className="space-y-5 animate-fade-in">
              <div className="flex gap-2.5 bg-indigo-50/50 border border-indigo-100/50 p-4 rounded-xl text-indigo-900 text-xs font-semibold">
                <Sparkles className="h-4.5 w-4.5 text-indigo-650 shrink-0 animate-pulse" />
                <p>
                  Enter the base product name and details. Click Next to configure variant layout prices.
                </p>
              </div>

              <Input
                label="Product Name"
                placeholder="Apex Pro SaaS License"
                error={errors.name?.message}
                {...register('name')}
              />

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-700 capitalize">Product Description (Optional)</label>
                <textarea
                  rows={4}
                  placeholder="Provide a detailed specifications summary of the product..."
                  className={`
                    flex w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-inner disabled:opacity-50
                    ${errors.description ? 'border-destructive focus-visible:ring-destructive' : 'hover:border-foreground/20'}
                  `}
                  {...register('description')}
                />
                {errors.description && <span className="text-xs text-destructive font-medium">{errors.description.message}</span>}
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-5 animate-fade-in">
              <div className="flex gap-2.5 bg-indigo-50/50 border border-indigo-100/50 p-4 rounded-xl text-indigo-900 text-xs font-semibold">
                <Sparkles className="h-4.5 w-4.5 text-indigo-650 shrink-0 animate-pulse" />
                <p>
                  Configure variant-specific pricing and domain limits. These options will be presented on the product detail page.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 capitalize tracking-wider">Pricing Plans & Variants</h4>
                  <Button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setVariants([
                        ...variants,
                        { name: `Variant ${variants.length + 1}`, price: 99, domain_count: 1, layout_count: 1, billing_cycle: 'monthly' }
                      ]);
                    }}
                    className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs cursor-pointer bg-primary hover:bg-primary/80 text-white font-bold"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Plan
                  </Button>
                </div>

                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {variants.map((variant, idx) => (
                    <div
                      key={idx}
                      className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.01)] relative space-y-4"
                    >
                      <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                        <span className="text-xs font-bold text-slate-700">Plan #{idx + 1}</span>
                        {variants.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setVariants(variants.filter((_, i) => i !== idx));
                            }}
                            className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded transition-colors cursor-pointer"
                            title="Remove Plan"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-slate-400 capitalize tracking-wider">Plan Name</label>
                          <Input
                            type="text"
                            placeholder="e.g. Single Domain single layout"
                            value={variant.name}
                            onChange={(e) => {
                              const newVariants = [...variants];
                              newVariants[idx].name = e.target.value;
                              setVariants(newVariants);
                            }}
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-slate-400 capitalize tracking-wider">Domains Allowed</label>
                          <Input
                            type="number"
                            min="1"
                            placeholder="1"
                            value={variant.domain_count}
                            onChange={(e) => {
                              const newVariants = [...variants];
                              newVariants[idx].domain_count = parseInt(e.target.value) || 1;
                              setVariants(newVariants);
                            }}
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-slate-400 capitalize tracking-wider">Layouts Allowed</label>
                          <Input
                            type="number"
                            min="1"
                            placeholder="1"
                            value={variant.layout_count}
                            onChange={(e) => {
                              const newVariants = [...variants];
                              newVariants[idx].layout_count = parseInt(e.target.value) || 1;
                              setVariants(newVariants);
                            }}
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-slate-400 capitalize tracking-wider">Price ($ AUD)</label>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="99.00"
                            value={variant.price}
                            onChange={(e) => {
                              const newVariants = [...variants];
                              newVariants[idx].price = parseFloat(e.target.value) || 0;
                              setVariants(newVariants);
                            }}
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-slate-400 capitalize tracking-wider">Billing Cycle</label>
                          <select
                            value={variant.billing_cycle || 'monthly'}
                            onChange={(e) => {
                              const newVariants = [...variants];
                              newVariants[idx].billing_cycle = e.target.value as 'monthly' | 'yearly';
                              setVariants(newVariants);
                            }}
                            className="flex h-9 w-full rounded-xl border border-slate-250 bg-white px-3 py-1 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-inner"
                          >
                            <option value="monthly">Monthly</option>
                            <option value="yearly">Yearly</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-5 animate-fade-in">
              <div className="flex gap-2.5 bg-indigo-50 border border-indigo-100/50 p-4 rounded-xl text-indigo-900 text-xs font-semibold">
                <Sparkles className="h-4.5 w-4.5 text-indigo-600 shrink-0" />
                <p>
                  Manage product assets. You must upload at least one main image if there are no existing media files.
                </p>
              </div>

              {/* Existings Uploads list */}
              {editingProduct && editingProduct.product_images && editingProduct.product_images.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold text-slate-400 capitalize tracking-widest">Currently Uploaded Files</h4>
                  <div className="grid grid-cols-4 gap-4">
                    {editingProduct.product_images.map((img) => (
                      <div key={img.id} className="relative h-20 border border-slate-200 rounded-xl overflow-hidden group bg-slate-50/50 shadow-inner">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img.image_url} alt="product asset" className="w-full h-full object-cover" />
                        <span className="absolute top-1.5 left-1.5 px-2 py-0.5 bg-slate-900/80 text-[8px] font-bold text-white rounded-md capitalize tracking-wider">
                          {img.is_screenshot ? 'Screenshot' : 'Main'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteImage(img.id)}
                          className="absolute top-1.5 right-1.5 p-1 bg-red-650 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-sm hover:scale-105"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* DRAG & DROP UPLOAD area */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">

                {/* 1. Main Images Upload */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 capitalize tracking-widest">Upload Main Images</label>
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragOverImages(true); }}
                    onDragLeave={() => setDragOverImages(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOverImages(false);
                      const dropFiles = Array.from(e.dataTransfer.files).filter(f => f.size <= 5 * 1024 * 1024);
                      setImages(prev => [...prev, ...dropFiles]);
                    }}
                    className={`border-2 border-dashed rounded-2xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 ${dragOverImages ? 'border-indigo-500 bg-indigo-50/30' : 'border-slate-200 bg-slate-50 hover:bg-slate-100/30 hover:border-slate-350'
                      }`}
                    onClick={() => document.getElementById('main-images-input')?.click()}
                  >
                    <Upload className="h-6 w-6 text-slate-400 mb-2 transition-transform group-hover:-translate-y-0.5" />
                    <span className="text-xs font-bold text-slate-700">Drag files or click to add</span>
                    <span className="text-[9px] text-slate-400 font-semibold mt-0.5">Maximum size 5MB</span>
                    <input
                      id="main-images-input"
                      type="file"
                      multiple
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileChange(e, 'images')}
                    />
                  </div>

                  {/* Selected main files list */}
                  {images.length > 0 && (
                    <div className="space-y-1.5 pt-2 max-h-32 overflow-y-auto pr-1">
                      {images.map((file, idx) => (
                        <div key={idx} className="flex justify-between items-center text-[10px] font-semibold p-2 bg-slate-50 rounded-lg border border-slate-100 text-slate-650">
                          <span className="truncate pr-4 font-mono">{file.name}</span>
                          <button type="button" onClick={() => removeSelectedFile(idx, 'images')} className="text-red-600 cursor-pointer hover:underline">
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. Screenshots Upload */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 capitalize tracking-widest">Upload Screenshots</label>
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragOverScreenshots(true); }}
                    onDragLeave={() => setDragOverScreenshots(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOverScreenshots(false);
                      const dropFiles = Array.from(e.dataTransfer.files).filter(f => f.size <= 5 * 1024 * 1024);
                      setScreenshots(prev => [...prev, ...dropFiles]);
                    }}
                    className={`border-2 border-dashed rounded-2xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 ${dragOverScreenshots ? 'border-indigo-500 bg-indigo-50/30' : 'border-slate-200 bg-slate-50 hover:bg-slate-100/30 hover:border-slate-350'
                      }`}
                    onClick={() => document.getElementById('screenshots-input')?.click()}
                  >
                    <Upload className="h-6 w-6 text-slate-400 mb-2 transition-transform group-hover:-translate-y-0.5" />
                    <span className="text-xs font-bold text-slate-700">Drag files or click to add</span>
                    <span className="text-[9px] text-slate-400 font-semibold mt-0.5">Maximum size 5MB</span>
                    <input
                      id="screenshots-input"
                      type="file"
                      multiple
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileChange(e, 'screenshots')}
                    />
                  </div>

                  {/* Selected screenshots list */}
                  {screenshots.length > 0 && (
                    <div className="space-y-1.5 pt-2 max-h-32 overflow-y-auto pr-1">
                      {screenshots.map((file, idx) => (
                        <div key={idx} className="flex justify-between items-center text-[10px] font-semibold p-2 bg-slate-50 rounded-lg border border-slate-100 text-slate-650">
                          <span className="truncate pr-4 font-mono">{file.name}</span>
                          <button type="button" onClick={() => removeSelectedFile(idx, 'screenshots')} className="text-red-600 cursor-pointer hover:underline">
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-5 animate-fade-in">
              <div className="flex gap-2.5 bg-indigo-50 border border-indigo-100/50 p-4 rounded-xl text-indigo-900 text-xs font-semibold">
                <Sparkles className="h-4.5 w-4.5 text-indigo-650 shrink-0 animate-pulse" />
                <p>
                  Upload the software product `.zip` file here. When users complete payment, this file will download automatically.
                </p>
              </div>

              {/* API Keys Inputs */}
              <div className="space-y-3.5">
                <label className="text-[10px] font-bold text-slate-400 capitalize tracking-widest">Product API Keys</label>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {apiKeys.map((key, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <div className="flex-1">
                        <Input
                          placeholder="Enter custom product API Key"
                          value={key}
                          onChange={(e) => {
                            const newKeys = [...apiKeys];
                            newKeys[index] = e.target.value;
                            setApiKeys(newKeys);
                          }}
                          className="focus-visible:ring-0 focus-visible:ring-offset-0 focus:ring-0 focus:outline-none"
                        />
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        {apiKeys.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => setApiKeys(apiKeys.filter((_, i) => i !== index))}
                            className="h-9 w-9 shrink-0 text-red-500 border-red-200 hover:bg-red-50"
                            title="Remove Key"
                          >
                            <X className="h-5 w-5" strokeWidth={2.5} />
                          </Button>
                        )}
                        {index === apiKeys.length - 1 && (
                          <Button
                            type="button"
                            size="icon"
                            onClick={() => setApiKeys([...apiKeys, ''])}
                            className="h-9 w-9 shrink-0"
                            title="Add Key"
                          >
                            <Plus className="h-5 w-5" strokeWidth={2.5} />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground font-semibold px-1">
                  Configure one or more API keys to distribute on license verification. If no product keys are added, verification falls back to the system environment key.
                </p>
              </div>

              {/* Show existing plugin if editing */}
              {editingProduct && (editingProduct as any).plugin_file_url && keepExistingPlugin && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex justify-between items-center">
                  <div className="flex items-center gap-2.5">
                    <FileText className="h-6 w-6 text-indigo-650 shrink-0" />
                    <div className="text-left">
                      <span className="text-xs font-bold text-slate-800 block">Existing Plugin Archive</span>
                      <a
                        href={(editingProduct as any).plugin_file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-indigo-650 hover:underline font-mono truncate max-w-xs block"
                      >
                        {(editingProduct as any).plugin_file_url.split('/').pop()}
                      </a>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setKeepExistingPlugin(false)}
                    className="h-8 px-2.5 text-[10px] text-red-650 border-red-200 hover:bg-red-50 hover:text-red-750"
                  >
                    Replace
                  </Button>
                </div>
              )}

              {/* Dropzone for zip file */}
              {(!editingProduct || !(editingProduct as any).plugin_file_url || !keepExistingPlugin) && (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 capitalize tracking-widest">Select Plugin Archive (.zip)</label>
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const file = e.dataTransfer.files[0];
                      if (file && file.name.endsWith('.zip')) {
                        setPluginZip(file);
                      } else {
                        showToast('Invalid file', 'error', 'Please drop a valid .zip file.');
                      }
                    }}
                    className="border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 border-slate-200 bg-slate-50 hover:bg-slate-100/30 hover:border-slate-350"
                    onClick={() => document.getElementById('plugin-zip-input')?.click()}
                  >
                    <Upload className="h-8 w-8 text-slate-400 mb-2" />
                    <span className="text-xs font-bold text-slate-700">Drag plugin .zip file here or click to browse</span>
                    <span className="text-[9px] text-slate-400 font-semibold mt-1">Accepts only .zip extension (max 50MB)</span>
                    <input
                      id="plugin-zip-input"
                      type="file"
                      accept=".zip"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.name.endsWith('.zip')) {
                            setPluginZip(file);
                          } else {
                            showToast('Invalid file', 'error', 'Only .zip files are allowed.');
                          }
                        }
                      }}
                    />
                  </div>

                  {/* Selected zip file display */}
                  {pluginZip && (
                    <div className="flex justify-between items-center text-[10px] font-semibold p-3 bg-indigo-50 border border-indigo-150 rounded-xl text-slate-650">
                      <div className="flex items-center gap-2 truncate">
                        <FileText className="h-4.5 w-4.5 text-indigo-650 shrink-0" />
                        <span className="truncate font-mono">{pluginZip.name} ({(pluginZip.size / (1024 * 1024)).toFixed(2)} MB)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPluginZip(null)}
                        className="text-red-650 hover:underline font-bold shrink-0 cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  )}

                  {/* Show cancel replace button if we was keeping existing plugin */}
                  {editingProduct && (editingProduct as any).plugin_file_url && !keepExistingPlugin && (
                    <div className="pt-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setKeepExistingPlugin(true);
                          setPluginZip(null);
                        }}
                        className="text-[10px] text-slate-500 hover:text-slate-700 font-semibold cursor-pointer underline"
                      >
                        Keep existing file instead
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </form>
      </Modal>

      <ConfirmationModal
        isOpen={productToDeleteId !== null}
        onClose={() => setProductToDeleteId(null)}
        onConfirm={async () => {
          if (productToDeleteId) {
            await executeDeleteProduct(productToDeleteId);
            setProductToDeleteId(null);
          }
        }}
        title="Delete Product?"
        message="Are you sure you want to delete this product? All image files and catalog records will be permanently removed."
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
        isLoading={isDeletingProduct}
      />

      <ConfirmationModal
        isOpen={imageToDeleteId !== null}
        onClose={() => setImageToDeleteId(null)}
        onConfirm={async () => {
          if (imageToDeleteId) {
            await executeDeleteImage(imageToDeleteId);
            setImageToDeleteId(null);
          }
        }}
        title="Remove Product Image?"
        message="Are you sure you want to permanently remove this image from storage?"
        confirmText="Remove"
        cancelText="Cancel"
        variant="destructive"
        isLoading={isDeletingImage}
      />
    </div>
  );
}
