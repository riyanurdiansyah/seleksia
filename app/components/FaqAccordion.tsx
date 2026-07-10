"use client";

import React, { useState } from 'react';

type FaqItem = {
  question: string;
  answer: string;
};

export default function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  if (!items || items.length === 0) {
    return <div className="text-center text-gray-500">Belum ada pertanyaan FAQ.</div>;
  }

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      {items.map((item, index) => {
        const isOpen = openIndex === index;
        return (
          <div 
            key={index} 
            className={`border rounded-2xl overflow-hidden transition-all duration-300 ${isOpen ? 'border-primary shadow-md bg-white' : 'border-gray-100 bg-gray-50 hover:bg-white hover:border-gray-200'}`}
          >
            <button
              onClick={() => toggle(index)}
              className="w-full px-6 py-5 flex items-center justify-between text-left focus:outline-none"
            >
              <span className={`font-bold text-lg pr-4 ${isOpen ? 'text-primary' : 'text-gray-900'}`}>
                {item.question}
              </span>
              <span className={`material-symbols-outlined transition-transform duration-300 shrink-0 ${isOpen ? 'rotate-180 text-primary' : 'text-gray-400'}`}>
                expand_more
              </span>
            </button>
            <div 
              className={`transition-all duration-300 ease-in-out px-6 overflow-hidden ${isOpen ? 'max-h-96 pb-6 opacity-100' : 'max-h-0 opacity-0 pb-0'}`}
            >
              <div className="text-gray-600 leading-relaxed border-t border-gray-100 pt-4 mt-1">
                {item.answer}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
