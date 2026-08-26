"use client";

import { useEffect } from "react";
import { reportClientError } from "@/lib/reportClientError";

// Last-resort boundary: replaces the root layout when IT crashes, so no
// globals.css / Tailwind here — inline styles with the brand tokens baked in.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportClientError(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f2ebdc",
          color: "#20262b",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          textAlign: "center",
          padding: "24px",
        }}
      >
        <div
          style={{
            maxWidth: 420,
            width: "100%",
            border: "2px dashed #d8c9a8",
            borderRadius: 12,
            background: "#e7dcc6",
            padding: 32,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              color: "#b5402e",
            }}
          >
            Turbulence
          </div>
          <h1
            style={{
              margin: "8px 0 0",
              fontSize: 22,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Something went wrong
          </h1>
          <p style={{ marginTop: 8, fontSize: 14, color: "#4a5560" }}>
            SkyDex hit a pocket of rough air. Your logbook is safe — try again in a moment.
          </p>
          {error.digest && (
            <p
              style={{
                marginTop: 12,
                fontSize: 11,
                textTransform: "uppercase",
                color: "#8a9396",
                fontFamily: "ui-monospace, monospace",
              }}
            >
              ref {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              marginTop: 24,
              padding: "10px 22px",
              borderRadius: 8,
              border: "2px solid #20262b",
              background: "#0e7c86",
              color: "#f2ebdc",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
