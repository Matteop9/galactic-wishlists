/**
 * Wordmark: boxed numeral 10 (phosphor, 2px border, glow) + PINS in glass caps.
 * Pure type — only the letters change if the product is renamed (README).
 */
export default function Wordmark({ size = 'lg' }: { size?: 'sm' | 'lg' }) {
  const numeral =
    size === 'lg' ? 'rounded-cell px-2.5 py-1 text-[26px]' : 'rounded-cell px-1.5 py-0.5 text-[15px]';
  const word = size === 'lg' ? 'text-[26px]' : 'text-[15px]';

  return (
    <div className="flex items-center gap-2.5 font-display font-extrabold">
      <span
        className={`${numeral} score-text border-2 border-phosphor font-display font-extrabold text-phosphor shadow-glow-amber`}
      >
        10
      </span>
      <span className={`${word} tracking-[.14em] text-glass`}>PINS</span>
    </div>
  );
}
