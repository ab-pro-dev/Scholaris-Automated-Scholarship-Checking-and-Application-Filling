'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface FaqItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    question: 'Does Scholaris ever submit a scholarship application automatically?',
    answer:
      'No. Scholaris can inspect portal forms, map your verified profile fields, and prepare drafts, but final submission is strictly blocked until you inspect every answer, check the consent box, and sign your authorization on the review screen.',
  },
  {
    question: 'How does scholarship link verification protect against scams?',
    answer:
      'Every submitted URL passes through SSRF network protection first, then domain and institutional verification checks for mismatched domains, suspicious fee requests, or missing official contact trails before scoring the scholarship.',
  },
  {
    question: 'Where do AI essay drafts pull information from?',
    answer:
      'Essay drafts are grounded strictly in your saved student profile—education history, research, leadership, achievements—and OCR-extracted text from documents you uploaded to your private vault.',
  },
  {
    question: 'What happens when a scholarship portal has a CAPTCHA or login gate?',
    answer:
      'Automated workers never bypass security challenges. When a portal requires login, 2FA, or CAPTCHA verification, the session pauses safely and notifies you so you can complete the check yourself.',
  },
];

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl sm:text-3xl font-bold text-ink tracking-tight">
          Frequently asked questions
        </h2>
        <p className="text-sm sm:text-base text-ink-muted">
          Clear answers on verification, privacy, and how you stay in control.
        </p>
      </div>

      <div className="space-y-3">
        {FAQ_ITEMS.map((item, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div
              key={item.question}
              className="bg-surface border border-line rounded-2xl shadow-card overflow-hidden"
            >
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpenIndex(isOpen ? null : idx)}
                className="w-full px-6 py-4 text-left flex items-center justify-between gap-4 hover:bg-pebble/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action"
              >
                <span className="text-sm sm:text-base font-semibold text-ink">
                  {item.question}
                </span>
                {isOpen ? (
                  <ChevronUp className="w-4 h-4 text-ink-muted shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-ink-muted shrink-0" />
                )}
              </button>
              {isOpen && (
                <div className="px-6 pb-5 pt-1 text-sm text-ink-muted leading-relaxed border-t border-line/60">
                  {item.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
