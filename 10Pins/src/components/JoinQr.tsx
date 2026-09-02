import { QRCodeSVG } from 'qrcode.react';

/**
 * A QR code someone can point a phone at, for the two places the design asks
 * for one: a group invite and a live session’s join panel. At the lane,
 * holding up a phone beats reading a six-character code out loud twice.
 *
 * Deliberately dark-on-light inside a white plate. A QR in phosphor on ink
 * looks beautifully on-brand and scans badly — readers need real contrast and
 * a quiet margin. This is the one place where breaking the dark aesthetic is
 * the correct answer, so the plate is kept small and deliberate rather than
 * apologetic.
 */
export default function JoinQr({ url, label, size = 132 }: { url: string; label?: string; size?: number }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="rounded-chip bg-white p-2.5">
        <QRCodeSVG
          value={url}
          size={size}
          level="M"
          bgColor="#ffffff"
          fgColor="#0a0e14"
          aria-label={label ?? 'Scan to join'}
        />
      </div>
      {label && <span className="label-caps">{label}</span>}
    </div>
  );
}
