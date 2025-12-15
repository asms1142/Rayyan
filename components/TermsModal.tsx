// components/TermsModal.tsx
"use client";

import React from "react";
import ReactMarkdown from "react-markdown";

interface TermsModalProps {
  terms: {
    title: string;
    content: string;
  };
  onAccept: () => void;
  onClose?: () => void;
}

export default function TermsModal({ terms, onAccept, onClose }: TermsModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
      <div className="bg-white max-w-3xl w-full p-6 rounded-lg shadow-lg relative">
        {/* Close button */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 font-bold text-xl"
          >
            ×
          </button>
        )}

        {/* Title */}
        <h2 className="text-2xl font-bold mb-4 text-center">{terms.title}</h2>

        {/* Scrollable content */}
        <div className="max-h-96 overflow-y-auto mb-4 border p-4 rounded prose prose-sm sm:prose base">
          <ReactMarkdown>{terms.content}</ReactMarkdown>
        </div>

        {/* Accept button */}
        <button
          onClick={onAccept}
          className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition-colors"
        >
          I Agree
        </button>
      </div>
    </div>
  );
}
