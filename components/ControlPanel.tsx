import React from 'react';
import { SegmentMode } from '../types';
import { Scan, Type, AlignJustify, Loader2, FolderTree, Cpu, FileText, CheckCircle2 } from 'lucide-react';

interface ControlPanelProps {
  mode: SegmentMode;
  setMode: (mode: SegmentMode) => void;
  selectedModel: string;
  setModel: (model: string) => void;
  onProcess: () => void;
  isProcessing: boolean;
  hasResults: boolean;
  onDownload: () => void;
  onDownloadText: () => void;
  disabled: boolean;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  mode,
  setMode,
  selectedModel,
  setModel,
  onProcess,
  isProcessing,
  hasResults,
  onDownload,
  onDownloadText,
  disabled
}) => {
  return (
    <div className="flex flex-col gap-6">
      
      {/* Configuration Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Model Selection */}
        <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
          <label className="text-xs font-semibold text-gray-500 mb-2 block flex items-center gap-1">
            <Cpu size={14} />
            בחר מודל עיבוד
          </label>
          <div className="relative">
            <select 
              value={selectedModel}
              onChange={(e) => setModel(e.target.value)}
              className="w-full appearance-none bg-white border border-gray-200 text-gray-800 text-sm rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 outline-none font-medium pr-8"
            >
              <option value="gemini-2.5-flash">Gemini 2.5 Flash (מהיר ⚡)</option>
              <option value="gemini-3-pro-preview">Gemini 3 Pro (מדויק 🎯)</option>
            </select>
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-500">
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>
        </div>

        {/* Mode Selection */}
        <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
          <label className="text-xs font-semibold text-gray-500 mb-2 block flex items-center gap-1">
             <Scan size={14} />
             סוג חיתוך
          </label>
          <div className="flex bg-white rounded-lg p-1 border border-gray-200 shadow-sm">
            {[
              { id: SegmentMode.CHARACTER, icon: Type, label: 'אותיות' },
              { id: SegmentMode.WORD, icon: Scan, label: 'מילים' },
              { id: SegmentMode.LINE, icon: AlignJustify, label: 'שורות' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setMode(item.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-bold transition-all duration-200 ${
                  mode === item.id
                    ? 'bg-indigo-100 text-indigo-700 shadow-sm'
                    : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                <item.icon size={14} />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center gap-3 w-full pt-2">
        {!hasResults ? (
          <button
            onClick={onProcess}
            disabled={disabled || isProcessing}
            className={`w-full group relative flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-white font-bold text-sm tracking-wide transition-all duration-300 transform active:scale-95 ${
              disabled || isProcessing
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 bg-[length:200%_auto] hover:bg-right shadow-lg shadow-indigo-200'
            }`}
          >
            {isProcessing ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                מעבד תמונה...
              </>
            ) : (
              <>
                <Scan size={20} className="group-hover:rotate-12 transition-transform" />
                התחל ניתוח וזיהוי
              </>
            )}
          </button>
        ) : (
          <>
            <button
              onClick={onDownloadText}
              className="w-full sm:w-1/2 flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-indigo-700 bg-white border-2 border-indigo-100 hover:border-indigo-200 hover:bg-indigo-50 transition-all font-bold text-sm shadow-sm"
            >
              <FileText size={18} />
              הורד כטקסט (.txt)
            </button>
            <button
              onClick={onDownload}
              className="w-full sm:w-1/2 flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-white font-bold text-sm bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-lg shadow-emerald-100 transition-all active:scale-95"
            >
              <FolderTree size={18} />
              הורד ZIP (תמונות + JSON)
            </button>
          </>
        )}
      </div>
    </div>
  );
};