import { avatarSvg } from "@/lib/avatar";

/** Deterministic user avatar minted from a seed (the handle). Admins show the captain badge. */
export default function Avatar({
  seed,
  size = 28,
  admin = false,
}: {
  seed: string | null | undefined;
  size?: number;
  admin?: boolean;
}) {
  if (admin) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src="/admin-avatar.svg"
        alt="admin"
        width={size}
        height={size}
        className="inline-block shrink-0 rounded-full align-middle"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className="inline-block shrink-0 overflow-hidden rounded-full align-middle"
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: avatarSvg(seed ?? "skydex", size) }}
    />
  );
}
