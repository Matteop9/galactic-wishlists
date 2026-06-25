import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SkyDex — the authentic plane-spotting logbook",
    short_name: "SkyDex",
    description: "Photograph real aircraft and build a verified logbook of the sky.",
    start_url: "/",
    display: "standalone",
    background_color: "#F2EBDC",
    theme_color: "#0E7C86",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
