import React, { useCallback, useEffect, useRef } from "react";

interface DualRangeSliderProps {
  min: number;
  max: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  className?: string;
  disabled?: boolean;
}

export const DualRangeSlider: React.FC<DualRangeSliderProps> = ({
  min,
  max,
  value,
  onChange,
  className = "",
  disabled = false,
}) => {
  const [minVal, maxVal] = value;
  const range = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Convert to percentage
  const getPercent = useCallback(
    (val: number) => Math.round(((val - min) / (max - min)) * 100),
    [min, max],
  );

  // Set width of the range to decrease from the left side
  useEffect(() => {
    const minPercent = getPercent(minVal);
    const maxPercent = getPercent(maxVal);

    if (range.current) {
      range.current.style.left = `${minPercent}%`;
      range.current.style.width = `${maxPercent - minPercent}%`;
    }
  }, [minVal, maxVal, getPercent]);

  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const clickVal = Math.round(min + percent * (max - min));

    const distMin = Math.abs(clickVal - minVal);
    const distMax = Math.abs(clickVal - maxVal);

    if (distMin < distMax) {
      const newVal = Math.min(clickVal, maxVal - 1);
      onChange([newVal, maxVal]);
    } else {
      const newVal = Math.max(clickVal, minVal + 1);
      onChange([minVal, newVal]);
    }
  };

  return (
    <div className={`relative w-full h-12 flex items-center ${className}`}>
      {/* Clickable Area Overlay for refined UX */}
      <div
        ref={containerRef}
        className="absolute inset-0 z-20 cursor-pointer"
        onClick={handleTrackClick}
      />

      <input
        type="range"
        min={min}
        max={max}
        value={minVal}
        onChange={(event) => {
          const val = Math.min(Number(event.target.value), maxVal - 1);
          onChange([val, maxVal]);
        }}
        className={`pointer-events-none absolute h-6 w-full outline-none z-30 opacity-0
          cursor-pointer appearance-none bg-transparent
          [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:bg-red-500
          [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:cursor-grab`}
        style={{
          zIndex: minVal > max - 100 && minVal > (max + min) / 2 ? 50 : 30,
        }}
        disabled={disabled}
      />
      <input
        type="range"
        min={min}
        max={max}
        value={maxVal}
        onChange={(event) => {
          const val = Math.max(Number(event.target.value), minVal + 1);
          onChange([minVal, val]);
        }}
        className={`pointer-events-none absolute h-6 w-full outline-none z-40 opacity-0
          cursor-pointer appearance-none bg-transparent
          [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:cursor-grab
          [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:cursor-grab`}
        disabled={disabled}
      />

      <div className="relative w-full h-2 rounded-full pointer-events-none bg-base-200">
        <div
          ref={range}
          className="absolute z-10 h-2 rounded-full bg-primary"
        />
        {/* Visual Thumbs */}
        <div
          className={`absolute h-5 w-5 bg-base-100 border-2 border-primary rounded-full shadow z-30 -mt-1.5 transition-transform duration-75 ease-out
            ${disabled ? "bg-base-200 border-base-300" : "hover:scale-110 active:scale-95"}`}
          style={{ left: `calc(${getPercent(minVal)}% - 10px)` }}
        />
        <div
          className={`absolute h-5 w-5 bg-base-100 border-2 border-primary rounded-full shadow z-30 -mt-1.5 transition-transform duration-75 ease-out
             ${disabled ? "bg-base-200 border-base-300" : "hover:scale-110 active:scale-95"}`}
          style={{ left: `calc(${getPercent(maxVal)}% - 10px)` }}
        />
      </div>
    </div>
  );
};
