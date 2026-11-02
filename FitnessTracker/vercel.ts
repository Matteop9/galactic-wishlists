import type { VercelConfig } from "@vercel/config/v1";

// Scheduled coach runs. Cron times are UTC (London is UTC+0 in winter, +1 in summer).
export const config: VercelConfig = {
  framework: "nextjs",
  crons: [
    { path: "/api/cron/morning-brief", schedule: "0 6 * * *" },
    { path: "/api/cron/weekly-review", schedule: "0 18 * * 0" },
  ],
};
