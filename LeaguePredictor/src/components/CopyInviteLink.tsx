'use client';

import { useState } from 'react';

export default function CopyInviteLink({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const url = `${window.location.origin}/join/${code}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard blocked — show the URL for manual copy
      prompt('Copy this invite link:', url);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <code className="rounded-md border border-border bg-bg px-3 py-1.5 font-num text-lg tracking-[0.3em]">
        {code}
      </code>
      <button
        onClick={copy}
        className="rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-ink hover:brightness-110 transition"
      >
        {copied ? 'Copied ✓' : 'Copy invite link'}
      </button>
    </div>
  );
}
