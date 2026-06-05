'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Edit2, Trash2, Upload, X, Eye, EyeOff, Loader2, Sparkles, Image as ImageIcon } from 'lucide-react';
import { productSchema, ProductInput } from '../../lib/validations/schemas';
import { createProductAction, updateProductAction, deleteProductAction, deleteProductImageAction } from '../../app/actions/products';
import { useToast } from '../ui/toast';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../ui/table';
import { Badge } from '../ui/badge';
import { Modal } from '../ui/modal';

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

export function ProductCrudClient({ initialProducts }: { initialProducts: Product[] }) {
  const { showToast } = useToast();
  const [products, setProducts] = React.useState<Product[]>(initialProducts);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingProduct, setEditingProduct] = React.useState<Product | null>(null);
  
  const [images, setImages] = React.useState<File[]>([]);
  const [screenshots, setScreenshots] = React.useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const [dragOverImages, setDragOverImages] = React.useState(false);
  const [dragOverScreenshots, setDragOverScreenshots] = React.useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<ProductInput>({
    resolver: zodResolver(productSchema),
  });

  // Open modal for Create
  const handleAddClick = () => {
    setEditingProduct(null);
    setImages([]);
    setScreenshots([]);
    reset({ name: '', description: '', price: 0 });
    setIsModalOpen(true);
  };

  // Open modal for Edit
  const handleEditClick = (product: Product) => {
    setEditingProduct(product);
    setImages([]);
    setScreenshots([]);
    reset({
      name: product.name,
      description: product.description,
      price: Number(product.price),
    });
    setIsModalOpen(true);
  };

  // Delete product action
  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product? All image files will be purged.')) return;
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
    }
  };

  // Delete existing database product image (e.g. from Supabase Storage)
  const handleDeleteImage = async (imageId: string) => {
    if (!confirm('Remove this image from storage permanently?')) return;
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
    }
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
    formData.append('price', String(data.price));
    formData.append('is_active', 'true'); // defaults to true on saves

    images.forEach((img) => formData.append('images', img));
    screenshots.forEach((scr) => formData.append('screenshots', scr));

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
              <TableHead className="font-bold text-slate-500 text-xs py-3.5">Price (USD)</TableHead>
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
                    <TableCell className="font-extrabold text-slate-800 text-xs py-4">${Number(p.price).toFixed(2)}</TableCell>
                    <TableCell className="py-4">
                      <Badge variant={p.is_active ? 'success' : 'destructive'} className="uppercase text-[9px] tracking-wider font-extrabold px-2 py-0.5 rounded-md">
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
                        className="h-8 w-8 p-0 inline-flex items-center justify-center rounded-xl border border-slate-200/80 bg-slate-50/50 text-slate-500 transition-all duration-200 hover:border-indigo-200 hover:bg-indigo-50/50 hover:text-indigo-600 hover:scale-105 active:scale-95 cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
                        title="Edit Product"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleDeleteProduct(p.id)}
                        className="h-8 w-8 p-0 inline-flex items-center justify-center rounded-xl border border-slate-200/80 bg-slate-50/50 text-slate-500 transition-all duration-200 hover:border-red-200 hover:bg-red-50/50 hover:text-red-600 hover:scale-105 active:scale-95 cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
                        title="Delete Product"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* 2. CRUD Modal containing drag & drop files upload */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !isSubmitting && setIsModalOpen(false)}
        title={editingProduct ? 'Edit Product Details' : 'Create New Product'}
        size="lg"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              disabled={isSubmitting}
              className="h-10 px-4 rounded-xl border-slate-200 text-slate-650 font-bold cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="product-form"
              isLoading={isSubmitting}
              className="h-10 px-5 rounded-xl font-bold cursor-pointer"
            >
              {editingProduct ? 'Save Changes' : 'Create Product'}
            </Button>
          </>
        }
      >
        <form id="product-form" onSubmit={handleSubmit(onFormSubmit)} className="space-y-5 text-left p-2">
          
          <div className="flex gap-2.5 bg-indigo-50 border border-indigo-100/50 p-4 rounded-xl text-indigo-900 text-xs font-semibold">
            <Sparkles className="h-4.5 w-4.5 text-indigo-600 shrink-0" />
            <p>
              Fill out the details below to define your catalog listing. Uploading main images and gallery screenshots helps elevate buyer experience.
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

          <Input
            label="Price ($ USD)"
            type="number"
            step="0.01"
            placeholder="49.99"
            error={errors.price?.message}
            {...register('price', { valueAsNumber: true })}
          />

          <hr className="border-slate-100" />

          {/* Existings Uploads list */}
          {editingProduct && editingProduct.product_images && editingProduct.product_images.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Currently Uploaded Files</h4>
              <div className="grid grid-cols-4 gap-4">
                {editingProduct.product_images.map((img) => (
                  <div key={img.id} className="relative h-20 border border-slate-200 rounded-xl overflow-hidden group bg-slate-50/50 shadow-inner">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.image_url} alt="product asset" className="w-full h-full object-cover" />
                    <span className="absolute top-1.5 left-1.5 px-2 py-0.5 bg-slate-900/80 text-[8px] font-extrabold text-white rounded-md uppercase tracking-wider">
                      {img.is_screenshot ? 'Screenshot' : 'Main'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteImage(img.id)}
                      className="absolute top-1.5 right-1.5 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-sm hover:scale-105"
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
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Upload Main Images</label>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOverImages(true); }}
                onDragLeave={() => setDragOverImages(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverImages(false);
                  const dropFiles = Array.from(e.dataTransfer.files).filter(f => f.size <= 5*1024*1024);
                  setImages(prev => [...prev, ...dropFiles]);
                }}
                className={`border-2 border-dashed rounded-2xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 ${
                  dragOverImages ? 'border-indigo-500 bg-indigo-50/30' : 'border-slate-200 bg-slate-50 hover:bg-slate-100/30 hover:border-slate-350'
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
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Upload Screenshots</label>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOverScreenshots(true); }}
                onDragLeave={() => setDragOverScreenshots(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverScreenshots(false);
                  const dropFiles = Array.from(e.dataTransfer.files).filter(f => f.size <= 5*1024*1024);
                  setScreenshots(prev => [...prev, ...dropFiles]);
                }}
                className={`border-2 border-dashed rounded-2xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 ${
                  dragOverScreenshots ? 'border-indigo-500 bg-indigo-50/30' : 'border-slate-200 bg-slate-50 hover:bg-slate-100/30 hover:border-slate-350'
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
        </form>
      </Modal>
    </div>
  );
}
