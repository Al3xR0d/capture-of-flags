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
  // Вычисляем угол и длину стрелки
  const deltaX = toX - fromX;
  const deltaY = toY - fromY;
//   const length = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);

  // Параметры стрелки
  const strokeWidth = 3;
  const headLength = 15;
  const headWidth = 8;
  
  // Смещение для отображения количества флагов
  const offsetY = flagCount > 1 ? (flagCount - 1) * 8 : 0;

  return (
    <g className={`arrow ${isAnimated ? 'animated' : ''}`}>
      {/* Основная линия стрелки */}
      <line
        x1={fromX}
        y1={fromY + offsetY}
        x2={toX - (headLength + stopBeforePx) * Math.cos(angle * Math.PI / 180)}
        y2={toY - (headLength + stopBeforePx) * Math.sin(angle * Math.PI / 180) + offsetY}
        stroke="red"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        className="arrow-line"
      />
      
      {/* Наконечник стрелки */}
      <polygon
        points={`${toX - stopBeforePx * Math.cos(angle * Math.PI / 180)},${toY - stopBeforePx * Math.sin(angle * Math.PI / 180) + offsetY} ${toX - (headLength + stopBeforePx) * Math.cos(angle * Math.PI / 180) - headWidth * Math.sin(angle * Math.PI / 180)},${toY - (headLength + stopBeforePx) * Math.sin(angle * Math.PI / 180) + headWidth * Math.cos(angle * Math.PI / 180) + offsetY} ${toX - (headLength + stopBeforePx) * Math.cos(angle * Math.PI / 180) + headWidth * Math.sin(angle * Math.PI / 180)},${toY - (headLength + stopBeforePx) * Math.sin(angle * Math.PI / 180) - headWidth * Math.cos(angle * Math.PI / 180) + offsetY}`}
        fill="red"
        className="arrow-head"
      />
      
      {/* Счетчик флагов */}
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
