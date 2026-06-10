'use client';

import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const FAQ_LIST = [
  {
    question: 'How does the Stripe checkout integration work?',
    answer: 'We generate a secure Payment Intent on the server, which passes a client secret to Stripe Elements on the front-end. Once payment is confirmed, Stripe dispatches a webhook event. Our system updates the order state to "paid" only after receiving this webhook confirmation.',
  },
  {
    question: 'Are card processing fees calculated transparently?',
    answer: 'Yes. At checkout, we compute Stripe transaction fees dynamically (2.9% + $0.30) and list them under "Processing Fee" alongside any applicable regional taxes (8% flat tax rate). This ensures full checkout transparency.',
  },
  {
    question: 'Can I customize transactional mail templates?',
    answer: 'Yes! The Admin Portal features a rich-text Mail Template Builder. You can define subject lines, customize HTML markup, and leverage placeholder variables (like {{customer_name}}, {{order_number}}, {{product_name}}, and {{payment_amount}}) that resolve dynamically.',
  },
  {
    question: 'How do role protections work inside the app?',
    answer: 'We use Supabase Auth and Row Level Security (RLS) policies. User accounts are partitioned. Admin routes (/admin/*) are protected at both the Next.js proxy routing level and inside DB query execution checks via security definer roles.',
  },
  {
    question: 'Is the shopping cart state persisted across refreshes?',
    answer: 'Yes, shopping cart items are managed via a Zustand store, which persists the selected product listings and quantities inside browser local storage automatically.',
  },
];

export function FAQ() {
  const [openIdx, setOpenIdx] = React.useState<number | null>(null);

  const toggleIdx = (idx: number) => {
    setOpenIdx(openIdx === idx ? null : idx);
  };

  return (
    <section className="py-12 bg-secondary/10 border-b border-border/40">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            Frequently Asked Questions
          </h2>
          <p className="text-sm text-muted-foreground">
            Have questions about the checkout flow, mail templates, or integrations? We have answers.
          </p>
        </div>

        <div className="mt-16 space-y-4">
          {FAQ_LIST.map((faq, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div
                key={idx}
                className="border border-border/60 rounded-xl bg-card overflow-hidden transition-colors hover:border-border"
              >
                <button
                  type="button"
                  onClick={() => toggleIdx(idx)}
                  className="w-full flex items-center justify-between p-5 text-left font-medium text-foreground cursor-pointer focus:outline-none"
                >
                  <span className="text-sm sm:text-base pr-4">{faq.question}</span>
                  <ChevronDown
                    className={`h-4.5 w-4.5 text-muted-foreground transition-transform duration-300 ${
                      isOpen ? 'rotate-180 text-primary' : ''
                    }`}
                  />
                </button>
                
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0 }}
                      transition={{ duration: 0.25, ease: 'easeInOut' }}
                    >
                      <div className="px-5 pb-5 border-t border-border/40 pt-3 text-sm text-muted-foreground leading-relaxed bg-secondary/10">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
