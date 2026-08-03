import { Game } from "./types";

/** "Sat 29 Aug 2026" from YYYY-MM-DD */
export function formatKickoff(date: string): string {
  return new Date(`${date}T12:00`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** "29 Aug" — used in the application email */
export function formatEmailDate(date: string): string {
  return new Date(`${date}T12:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

/** "Fri 17 Jul, 10:00" from YYYY-MM-DDTHH:mm */
export function formatWindowPoint(dt: string): string {
  const d = new Date(dt);
  return `${d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  })}, ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
}

export type OrderStatusKey = "upcoming" | "open" | "closing" | "closed";

export interface OrderStatus {
  key: OrderStatusKey;
  label: string;
}

/**
 * The date the GROUP must act by: away requests must reach the secretary
 * before the window opens; home applications just need to beat the close.
 */
export function groupDeadline(game: Game): string {
  return game.homeAway === "A" ? game.orderOpen : game.orderClose;
}

export function orderStatus(game: Game, now: Date = new Date()): OrderStatus {
  const open = new Date(game.orderOpen);
  const close = new Date(game.orderClose);

  // Away games: requests must be with the club secretary BEFORE the order
  // window opens, so the group's deadline is the open time, not the close.
  if (game.homeAway === "A") {
    if (now >= open) return { key: "closed", label: "Closed — window opened" };
    const hoursLeft = (open.getTime() - now.getTime()) / 3_600_000;
    if (hoursLeft <= 48) {
      const label =
        hoursLeft <= 1.5
          ? `Send to Neil — ${Math.max(1, Math.round(hoursLeft * 60))} min left`
          : `Send to Neil — ${Math.round(hoursLeft)} hrs left`;
      return { key: "closing", label };
    }
    return {
      key: "open",
      label: `Send to Neil by ${formatWindowPoint(game.orderOpen)}`,
    };
  }

  if (now < open) return { key: "upcoming", label: `Opens ${formatWindowPoint(game.orderOpen)}` };
  if (now > close) return { key: "closed", label: "Window closed" };
  const hoursLeft = (close.getTime() - now.getTime()) / 3_600_000;
  if (hoursLeft <= 48) {
    const label =
      hoursLeft <= 1.5
        ? `Closes in ${Math.max(1, Math.round(hoursLeft * 60))} min`
        : `Closes in ${Math.round(hoursLeft)} hrs`;
    return { key: "closing", label };
  }
  return { key: "open", label: `Open — closes ${formatWindowPoint(game.orderClose)}` };
}

export const STATUS_STYLES: Record<OrderStatusKey, string> = {
  upcoming: "bg-slate-100 text-slate-600 border border-slate-200",
  open: "bg-emerald-100 text-emerald-800 border border-emerald-200",
  closing: "bg-amber-100 text-amber-800 border border-amber-300",
  closed: "bg-slate-200 text-slate-500 border border-slate-200 line-through-none",
};
