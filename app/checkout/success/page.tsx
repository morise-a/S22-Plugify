import * as React from 'react';
import { SuccessPageClient } from '../../../components/payment/success-page-client';

interface SuccessPageProps {
  searchParams: Promise<{ orderNumber?: string; status?: string }>;
}

export default async function CheckoutSuccessPage(props: SuccessPageProps) {
  // AWAIT searchParams in compliance with Next.js 16
  const { orderNumber } = await props.searchParams;

  return (
    <div className="flex-1 flex flex-col justify-center items-center">
      <SuccessPageClient orderNumber={orderNumber} />
    </div>
  );
}
