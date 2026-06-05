'use server';

import { createActionClient } from '../../lib/supabase/action';
import { productSchema } from '../../lib/validations/schemas';
import { revalidatePath } from 'next/cache';

/**
 * Uploads a file to Supabase Storage 'products' bucket.
 */
async function uploadToStorage(file: File, isScreenshot: boolean = false) {
  const { createClient } = await import('@supabase/supabase-js');
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  const supabase = (serviceRoleKey && !serviceRoleKey.includes('placeholder'))
    ? createClient(supabaseUrl!, serviceRoleKey)
    : await createActionClient();
  
  const fileExt = file.name.split('.').pop() || 'jpg';
  const folder = isScreenshot ? 'screenshots' : 'main';
  const fileName = `${folder}/${Math.random().toString(36).substring(2, 9)}_${Date.now()}.${fileExt}`;

  // Convert File to ArrayBuffer and then to Buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error } = await supabase.storage
    .from('products')
    .upload(fileName, buffer, {
      contentType: file.type,
      cacheControl: '14400', // Cache for 4 hours
      upsert: true
    });

  if (error) {
    console.error('Storage upload error:', error);
    throw new Error(`Failed to upload file: ${error.message}`);
  }

  // Get Public URL
  const { data: { publicUrl } } = supabase.storage
    .from('products')
    .getPublicUrl(fileName);

  return publicUrl;
}

/**
 * Create a new product with multiple screenshots and main images.
 */
export async function createProductAction(formData: FormData) {
  const supabase = await createActionClient();

  // Verify Admin Permissions
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Unauthorized.' };

  const { data: dbUser } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!dbUser || dbUser.role !== 'admin') {
    return { success: false, error: 'Unauthorized. Admin role required.' };
  }

  // Parse fields
  const name = formData.get('name') as string;
  const description = formData.get('description') as string;
  const price = parseFloat(formData.get('price') as string);
  const isActive = formData.get('is_active') === 'true';

  // Validate fields via Zod
  const validation = productSchema.safeParse({ name, description, price });
  if (!validation.success) {
    return { success: false, error: validation.error.issues[0].message };
  }

  // Insert product record
  const { data: product, error: insertError } = await supabase
    .from('products')
    .insert({
      name,
      description,
      price,
      is_active: isActive,
    })
    .select()
    .single();

  if (insertError || !product) {
    return { success: false, error: insertError?.message || 'Database insert failed.' };
  }

  // Retrieve files from FormData
  const images = formData.getAll('images') as File[];
  const screenshots = formData.getAll('screenshots') as File[];

  try {
    // Upload main images
    for (const image of images) {
      if (image.size > 0) {
        const url = await uploadToStorage(image, false);
        await supabase.from('product_images').insert({
          product_id: product.id,
          image_url: url,
          is_screenshot: false,
        });
      }
    }

    // Upload screenshots
    for (const screenshot of screenshots) {
      if (screenshot.size > 0) {
        const url = await uploadToStorage(screenshot, true);
        await supabase.from('product_images').insert({
          product_id: product.id,
          image_url: url,
          is_screenshot: true,
        });
      }
    }
  } catch (uploadError) {
    const errMsg = uploadError instanceof Error ? uploadError.message : 'Upload failed.';
    return { success: false, error: `Product created, but some images failed to upload: ${errMsg}` };
  }

  revalidatePath('/products', 'layout');
  return { success: true, productId: product.id };
}

/**
 * Updates an existing product details.
 */
export async function updateProductAction(productId: string, formData: FormData) {
  const supabase = await createActionClient();

  // Verify Admin
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Unauthorized.' };

  const { data: dbUser } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!dbUser || dbUser.role !== 'admin') {
    return { success: false, error: 'Unauthorized. Admin role required.' };
  }

  const name = formData.get('name') as string;
  const description = formData.get('description') as string;
  const price = parseFloat(formData.get('price') as string);
  const isActive = formData.get('is_active') === 'true';

  const validation = productSchema.safeParse({ name, description, price });
  if (!validation.success) {
    return { success: false, error: validation.error.issues[0].message };
  }

  const { error: updateError } = await supabase
    .from('products')
    .update({
      name,
      description,
      price,
      is_active: isActive,
      updated_at: new Date().toISOString()
    })
    .eq('id', productId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  // Handle adding new files
  const images = formData.getAll('images') as File[];
  const screenshots = formData.getAll('screenshots') as File[];

  try {
    for (const image of images) {
      if (image.size > 0) {
        const url = await uploadToStorage(image, false);
        await supabase.from('product_images').insert({
          product_id: productId,
          image_url: url,
          is_screenshot: false,
        });
      }
    }

    for (const screenshot of screenshots) {
      if (screenshot.size > 0) {
        const url = await uploadToStorage(screenshot, true);
        await supabase.from('product_images').insert({
          product_id: productId,
          image_url: url,
          is_screenshot: true,
        });
      }
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Upload failed.';
    return { success: false, error: `Product info updated, but some files failed to upload: ${errMsg}` };
  }

  revalidatePath('/products', 'layout');
  return { success: true };
}

/**
 * Deletes a product image record from the database.
 */
export async function deleteProductImageAction(imageId: string) {
  const supabase = await createActionClient();

  // Verify Admin
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Unauthorized.' };

  const { data: dbUser } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!dbUser || dbUser.role !== 'admin') {
    return { success: false, error: 'Unauthorized. Admin role required.' };
  }

  const { error } = await supabase
    .from('product_images')
    .delete()
    .eq('id', imageId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Deletes a product and all of its images.
 */
export async function deleteProductAction(productId: string) {
  const supabase = await createActionClient();

  // Verify Admin
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Unauthorized.' };

  const { data: dbUser } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!dbUser || dbUser.role !== 'admin') {
    return { success: false, error: 'Unauthorized. Admin role required.' };
  }

  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', productId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/products', 'layout');
  return { success: true };
}

/**
 * Retrieves a list of active products (or all products if admin is requested).
 */
export async function getProductsAction(options?: { includeInactive?: boolean }) {
  const supabase = await createActionClient();
  
  let query = supabase
    .from('products')
    .select(`
      *,
      product_images (*)
    `)
    .order('created_at', { ascending: false });

  if (!options?.includeInactive) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Get products error:', error);
    return [];
  }

  return data || [];
}

/**
 * Retrieves a single product by ID with all of its images.
 */
export async function getProductAction(productId: string) {
  const supabase = await createActionClient();

  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      product_images (*)
    `)
    .eq('id', productId)
    .single();

  if (error) {
    console.error('Get product error:', error);
    return null;
  }

  return data;
}
