import { Nav } from "@/components/nav";

/**
 * Fixed-height shell (see globals.css .app-shell): the page never scrolls as a
 * whole; each screen scrolls inside .app-main and the tab bar stays put.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <div className="app-main flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">{children}</div>
      <Nav />
    </div>
  );
}
