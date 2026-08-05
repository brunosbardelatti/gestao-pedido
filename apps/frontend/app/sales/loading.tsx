import * as React from 'react';

export default function Loading(): React.JSX.Element {
  return (
    <div className="min-h-screen min-h-svh bg-background text-foreground">
      <div className="h-16 border-b border-border" />
      <section className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
        <div className="h-8 w-32 animate-pulse rounded bg-muted" />
        <div className="mt-4 h-6 w-48 animate-pulse rounded bg-muted" />
        <div className="mt-6 space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      </section>
    </div>
  );
}
