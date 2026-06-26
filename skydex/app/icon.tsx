import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

// Luggage-tag mark on teal — matches the new SkyDex tag identity. Eyelet + the
// plane glyph caught inside the tag. Kept font-free so ImageResponse needs no
// external font fetch.
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          alignItems: "center",
          justifyContent: "center",
          background: "#0E7C86",
        }}
      >
        <svg width="512" height="512" viewBox="0 0 100 100">
          {/* tag body */}
          <rect x="22" y="20" width="56" height="60" rx="11" fill="#F2EBDC" />
          {/* eyelet */}
          <circle cx="50" cy="33" r="6" fill="#0E7C86" stroke="#B98A2E" strokeWidth="3" />
          {/* plane glyph, caught in the tag */}
          <g transform="translate(50,57) rotate(22) scale(1.05) translate(-32,-32)" fill="#0E7C86">
            <path d="M32 8 l3.5 21 l25 10 l0 5 l-25 -6.5 l-2.5 12 l7 5.5 l0 3 l-8 -2.5 l-8 2.5 l0 -3 l7 -5.5 l-2.5 -12 l-25 6.5 l0 -5 l25 -10 z" />
          </g>
        </svg>
      </div>
    ),
    { ...size },
  );
}
