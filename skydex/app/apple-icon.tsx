import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
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
        <svg width="120" height="120" viewBox="-20 -20 40 40">
          <path
            d="M 0,-12 L 2,-2 L 15,5 L 15,8 L 2,5 L 1.5,11 L 4.5,14 L 4.5,16 L 0,14.5 L -4.5,16 L -4.5,14 L -1.5,11 L -2,5 L -15,8 L -15,5 L -2,-2 Z"
            fill="#F2EBDC"
            transform="rotate(20)"
          />
        </svg>
      </div>
    ),
    { ...size },
  );
}
