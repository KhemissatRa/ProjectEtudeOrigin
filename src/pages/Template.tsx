import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { setLayoutState } from "../store/layoutSlice";
import { setLabelsState } from "../store/labelsSlice"; 
import { setPointsState } from "../store/pointsSlice"; 
import { setMapState } from "../store/mapSlice";
import { setTraceState } from "../store/traceSlice"; 
import { setProfileState } from "../store/profileSlice"; 
import templates from "../templates/templates";
import { RootState } from "../store";

// Types explicites pour les labels
interface LabelStyle {
  fontSize?: number;
  fontFamily?: string;
  [key: string]: any;
}
interface LabelData {
  value: string;
  style: LabelStyle;
}
interface LabelsState {
  title: LabelData;
  description: LabelData;
  stats: any[];
}

const TemplatePage: React.FC = () => {
  const dispatch = useDispatch();
  const currentLabels = useSelector((state: RootState) => state.labels) as LabelsState;
  const currentTrace = useSelector((state: RootState) => state.trace);
  const currentPoints = useSelector((state: RootState) => state.points);

  const handleApplyTemplate = (template: any) => {
    dispatch(setLayoutState(template.layout));
    // Correction de la structure pour LabelsState attendu par le store
    const mergedLabels = {
      title: {
        text: template.labels?.title?.text || '',
        isVisible: template.labels?.title?.isVisible ?? true,
        style: template.labels?.title?.style || {},
      },
      description: {
        text: template.labels?.description?.text || '',
        isVisible: template.labels?.description?.isVisible ?? true,
        style: template.labels?.description?.style || {},
      },
      stats: Array.isArray(template.labels?.stats) ? template.labels.stats.map(stat => ({
        label: stat.label || '',
        value: stat.value || '',
        style: stat.style || {},
      })) : [],
    };
    dispatch(setLabelsState(mergedLabels)); 

    // 1. Changer la couleur et le style du trace
    dispatch(setTraceState({ ...currentTrace, ...template.trace }));

    // 2. Appliquer tout le style des marqueurs/points (par index)
    const newPoints = {
      ...currentPoints,
      points: currentPoints.points.map((pt: any, idx: number) => {
        const templatePt = template.points?.points?.[idx];
        if (templatePt && templatePt.style) {
          return {
            ...pt,
            style: {
              ...pt.style,
              ...templatePt.style, // Copie toutes les propriétés de style du marker
            },
          };
        }
        return pt;
      }),
    };
    dispatch(setPointsState(newPoints)); 

    dispatch(setMapState(template.map));
    dispatch(setProfileState(template.profile)); 
  };

  return (
    <div className="w-full h-full">
      <div className="space-y-1 px-2 pt-6 pb-4">
        <h1 className="text-lg font-semibold font-sans text-white">
          Modèles
        </h1>
        <p className="text-gray-400 font-light text-sm">
          Choisissez un modèle pour appliquer une mise en page et des styles prédéfinis à votre affiche.
        </p>
      </div>
      <div className="w-full mt-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 w-full">
          {templates.map((template, idx) => (
            <button
              key={idx}
              type="button"
              className="group flex flex-col items-center transition-none scale-100 cursor-pointer overflow-hidden relative border-0 w-full h-[221px] bg-transparent p-0 m-0 template-hover"
              style={{height:221, background:'none', padding:0, margin:0}}
              onClick={() => handleApplyTemplate(template)}
            >
              <img
                src={template.preview}
                alt="Aperçu du modèle"
                title="Aperçu du modèle"
                width={156}
                height={156}
                loading="lazy"
                decoding="async"
                className="object-cover rounded"
                style={{ color: "transparent" }}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TemplatePage;