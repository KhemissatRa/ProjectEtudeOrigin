import React from "react";
import { FaPlay } from "react-icons/fa";

interface CustomMarkerContentProps {
  type: string;
  text: string;
  description?: string;
  shape: string;
  backgroundColor?: string;
  textColor?: string;
}

const CustomMarkerContent: React.FC<CustomMarkerContentProps> = ({
  type,
  text,  
  description,
  shape,
  backgroundColor,
  textColor,
}) => {

  // Taille différente pour Start/Finish vs Min/Max ?
  const pointSizeClass =
    type === "startPoint" || type === "finishPoint" ? "w-2.5 h-2.5" : "w-2 h-2";

  return (
    <div className="relative flex items-center flex-col cursor-default">
      {/* Point ou Triangle, positionné absolument au début (gauche) */}
      {shape === "triangle" ? (
        <FaPlay
          className={`absolute left-1/2 -translate-x-1/2 transform -mt-1 ${pointSizeClass}`}
          style={{
            color: backgroundColor,
            transform: "rotate(210deg)",
          }}
          aria-hidden="true"
        />
      ) : (
        <div
          style={{ backgroundColor: backgroundColor, color: textColor }}
          className={`absolute left-1/2 -translate-x-1/2 transform -mt-1 ${pointSizeClass} bg-black rounded-full`}
          aria-hidden="true"
        />
      )}
      {/* Label rectangulaire, avec marge à gauche pour décaler par rapport au point */}
      <div
        style={{ backgroundColor: backgroundColor, color: textColor }}
        className={`ml-3 ${description ? '-mt-10' : '-mt-6'} bg-black text-white font-sans font-bold text-[10px] px-2 py-[2px] whitespace-nowrap leading-none`}
      >
        {/* Ajustez font/padding si besoin */}
        {text}
      </div>
      {/* Description (si elle existe) */}
      {description &&
        <div
          style={{ backgroundColor: backgroundColor, color: textColor }}
          className="ml-3 bg-black text-white font-sans text-[10px] px-1 py-[1px] whitespace-nowrap leading-none mt-1"
        >
          {description}
        </div>
      }
    </div>
  );
};

export default CustomMarkerContent;