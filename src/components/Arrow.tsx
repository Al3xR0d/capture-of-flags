import React from 'react';

interface ArrowProps {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  flagCount: number;
  isAnimated?: boolean;
  stopBeforePx?: number;
}

export const Arrow: React.FC<ArrowProps> = ({ 
  fromX, 
  fromY, 
  toX, 
  toY, 
  flagCount, 
  isAnimated = true,
  stopBeforePx = 10
}) => {
  // угол и длина стрелки
  const deltaX = toX - fromX;
  const deltaY = toY - fromY;

  const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);

  // Параметры стрелки
  const strokeWidth = 7;
  const headLength = 28;
  const headWidth = 14;
  
  // Смещение для отображения количества флагов
  const offsetY = flagCount > 1 ? (flagCount - 1) * 8 : 0;

  // вычисления координат для конца линии и точек наконечника
  const angleRad = angle * Math.PI / 180;
  const lineEndX = toX - (headLength + stopBeforePx) * Math.cos(angleRad);
  const lineEndY = toY - (headLength + stopBeforePx) * Math.sin(angleRad) + offsetY;

  const headTipX = toX - stopBeforePx * Math.cos(angleRad);
  const headTipY = toY - stopBeforePx * Math.sin(angleRad) + offsetY;
  const headBaseLeftX = toX - (headLength + stopBeforePx) * Math.cos(angleRad) - headWidth * Math.sin(angleRad);
  const headBaseLeftY = toY - (headLength + stopBeforePx) * Math.sin(angleRad) + headWidth * Math.cos(angleRad) + offsetY;
  const headBaseRightX = toX - (headLength + stopBeforePx) * Math.cos(angleRad) + headWidth * Math.sin(angleRad);
  const headBaseRightY = toY - (headLength + stopBeforePx) * Math.sin(angleRad) - headWidth * Math.cos(angleRad) + offsetY;

  return (
    <g className={`arrow ${isAnimated ? 'animated' : ''}`}>
      <line
        x1={fromX}
        y1={fromY + offsetY}
        x2={lineEndX}
        y2={lineEndY}
        stroke="#000"
        strokeWidth={strokeWidth + 4}
        strokeLinecap="round"
        className="arrow-line-outline"
      />
      <line
        x1={fromX}
        y1={fromY + offsetY}
        x2={lineEndX}
        y2={lineEndY}
        stroke="red"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        className="arrow-line"
      />
      
      <polygon
        points={`${headTipX},${headTipY} ${headBaseLeftX},${headBaseLeftY} ${headBaseRightX},${headBaseRightY}`}
        fill="#000"
        className="arrow-head-outline"
      />
      <polygon
        points={`${headTipX},${headTipY} ${headBaseLeftX},${headBaseLeftY} ${headBaseRightX},${headBaseRightY}`}
        fill="red"
        className="arrow-head"
      />
      
      {flagCount > 1 && (
        <>
          <circle
            cx={fromX + deltaX * 0.1}
            cy={fromY + offsetY}
            r="12"
            fill="rgba(8, 188, 8, 0.2)"
            stroke="#08BC08"
            strokeWidth="2"
            className="flag-counter"
          />
          <text
            x={fromX + deltaX * 0.1}
            y={fromY + offsetY + 4}
            textAnchor="middle"
            fill="#08BC08"
            fontSize="12"
            fontWeight="bold"
            fontFamily="SB Sans Display, sans-serif"
            className="flag-count-text"
          >
            {flagCount}
          </text>
        </>
      )}
    </g>
  );
};
