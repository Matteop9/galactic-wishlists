export default function SectionShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-10">
      <h1 className="border-b border-paper-edge pb-2 font-display text-3xl font-bold tracking-tight text-ink">
        {title}
      </h1>
      {subtitle && <p className="mt-3 text-ink-soft">{subtitle}</p>}
      <div className="mt-8">{children}</div>
    </main>
  );
}
