export default function Crest({ src, alt, size = 20 }: { src?: string; alt: string; size?: number }) {
  if (!src) {
    return (
      <span
        className="inline-block shrink-0 rounded-full bg-surface-2"
        style={{ width: size, height: size }}
        aria-hidden
      />
    );
  }
  return (
    // plain img: crests come from an external CDN (various domains/SVGs)
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      loading="lazy"
      className="shrink-0 object-contain"
      style={{ width: size, height: size }}
    />
  );
}
