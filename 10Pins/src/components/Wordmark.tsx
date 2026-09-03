/**
 * Wordmark: "10 PINS" in Oswald 600, ink. Pure type, the one place the name is
 * set in capitals (it is a wordmark, not a label), so it swaps in a minute if
 * the product is renamed.
 */
export default function Wordmark({ size = 'lg' }: { size?: 'sm' | 'lg' }) {
  return (
    <span
      className={`font-display font-semibold leading-none tracking-[.01em] text-ink ${
        size === 'lg' ? 'text-[32px]' : 'text-[24px]'
      }`}
    >
      10 PINS
    </span>
  );
}
