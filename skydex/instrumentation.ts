import type { Instrumentation } from "next";
import { captureServerError } from "@/lib/monitor";

// Fires for every uncaught server error — RSC renders, route handlers, server
// actions and the proxy. The client-side counterpart is app/error.tsx /
// app/global-error.tsx reporting through /api/client-error.
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  await captureServerError(err, {
    path: request.path,
    method: request.method,
    routeType: context.routeType,
    routePath: context.routePath,
  });
};
