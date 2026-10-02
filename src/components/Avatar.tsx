import type { Avatar as AvatarData } from "../game/view";

interface Props {
  data: AvatarData;
  size: number;
  fontSize: number;
  radius?: number;
}

export function Avatar({ data, size, fontSize, radius = 5 }: Props) {
  return (
    <div
      className="avatar"
      aria-hidden
      style={{ width: size, height: size, fontSize, borderRadius: radius, background: data.avBg, color: data.avFg }}
    >
      {data.ini}
    </div>
  );
}
