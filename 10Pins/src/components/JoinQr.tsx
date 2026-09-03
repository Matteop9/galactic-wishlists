import { QRCodeSVG } from 'qrcode.react';

/**
 * A QR code someone can point a phone at: a group invite, a live session's
 * join panel. At the lane, holding up a phone beats reading a code out loud.
 *
 * Always ink on light sheet, whatever the theme: readers need real contrast,
 * and a dark-on-dark code scans badly.
 */
export default function JoinQr({ url, label, size = 132 }: { url: string; label?: string; size?: number }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="border border-hairline bg-[#fbf8f1] p-2.5">
        <QRCodeSVG value={url} size={size} level="M" bgColor="#fbf8f1" fgColor="#201e1a" aria-label={label ?? 'Scan to join'} />
      </div>
      {label && <span className="text-[13px] text-ink-faded">{label}</span>}
    </div>
  );
}
