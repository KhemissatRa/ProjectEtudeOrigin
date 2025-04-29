import React from "react";

interface ModernNumberInputProps {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  onChange: (value: number) => void;
  className?: string;
  style?: React.CSSProperties;
  label?: string;
}

const ChevronUp = () => (
  <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M18 15l-6-6-6 6"/></svg>
);
const ChevronDown = () => (
  <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6"/></svg>
);

const ModernNumberInput: React.FC<ModernNumberInputProps> = ({
  value,
  min,
  max,
  step = 1,
  disabled,
  onChange,
  className = '',
  style = {},
  label,
}) => {
  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    if (!isNaN(v)) onChange(v);
  };
  const handleUp = () => {
    let v = value + step;
    if (typeof max === 'number') v = Math.min(v, max);
    onChange(v);
  };
  const handleDown = () => {
    let v = value - step;
    if (typeof min === 'number') v = Math.max(v, min);
    onChange(v);
  };

  return (
    <div className={`modern-number-input ${className}`} style={style}>
      {label && <label className="modern-number-label">{label}</label>}
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={handleInput}
        className="modern-number-input-field"
      />
      <div className="custom-spin-buttons">
        <button type="button" aria-label="Augmenter" onClick={handleUp} disabled={disabled}>
          <ChevronUp />
        </button>
        <button type="button" aria-label="Diminuer" onClick={handleDown} disabled={disabled}>
          <ChevronDown />
        </button>
      </div>
    </div>
  );
};

export default ModernNumberInput;
