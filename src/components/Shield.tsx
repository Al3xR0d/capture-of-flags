import React from "react";

interface ShieldProps {
  cx: number;
  cy: number;
  radius?: number;
}

export const Shield: React.FC<ShieldProps> = ({ cx, cy, radius = 46 }) => {
  return (
    <g className="shield">
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill="rgba(0, 150, 255, 0.12)"
        stroke="#00b7ff"
        strokeWidth={3}
        className="shield-ring"
      />
      <circle
        cx={cx}
        cy={cy}
        r={radius - 6}
        fill="transparent"
        stroke="#00b7ff"
        strokeOpacity={0.8}
        strokeWidth={2}
        className="shield-pulse"
      />
    </g>
  );
};
