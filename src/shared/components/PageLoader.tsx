'use client';

import React from 'react';

interface PageLoaderProps {
  /** Optional label announced to screen readers and shown under the skeleton. */
  label?: string;
  /** Number of skeleton cards to render in the grid. Defaults to 6. */
  cards?: number;
}

/**
 * Full-page skeleton shown while a page fetches its data from the database.
 * Mirrors the animate-pulse skeleton style already used on the Tasks page so
 * the loading experience is consistent across the app.
 */
export default function PageLoader({ label = 'Loading…', cards = 6 }: PageLoaderProps) {
  return (
    <div
      className="mx-auto max-w-7xl space-y-6 p-6"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      {/* Header banner skeleton */}
      <div className="h-24 animate-pulse rounded-2xl bg-[#F1F3F5]" />

      {/* Sub-nav / filter bar skeleton */}
      <div className="h-12 animate-pulse rounded-2xl bg-[#F1F3F5]" />

      {/* Content cards skeleton */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: cards }, (_, index) => (
          <div key={index} className="h-40 animate-pulse rounded-xl bg-[#F1F3F5]" />
        ))}
      </div>

      <span className="sr-only">{label}</span>
    </div>
  );
}
