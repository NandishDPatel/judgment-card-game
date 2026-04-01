import React from 'react';

export default function Timer({ seconds }) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-white/15 bg-black/40 px-4 py-2 text-sm">
      <span className="h-2 w-2 rounded-full bg-amber-300" />
      <span className="font-semibold">Turn</span>
      <span className="text-amber-200">{seconds}s</span>
    </div>
  );
}
