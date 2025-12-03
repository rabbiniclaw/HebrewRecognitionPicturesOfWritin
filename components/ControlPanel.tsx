import React from 'react';
import { SegmentMode } from '../types';
import { Scan, Type, AlignJustify, Loader2, FolderTree, Cpu, FileText } from 'lucide-react';

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
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-6">
      
      {/* Top Row: Model & Mode */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        
        {/* Model Selection */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Cpu className="text-gray-400" size={20} />
          <select 
            value={selectedModel}
            onChange={(e) => setModel(e.target.value)}
            className="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5 outline-none"
          >
            <option value="gemini-2.5-flash">Gemini 2.5 Flash (מהיר - לדפוס)</option>
            <option value="gemini-3-pro-preview">Gemini 3 Pro (מדויק - לכתב יד)</option>
          </select>
        </div>

        {/* Mode Selection */}
        <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-lg self-center md:self-auto">
          <button
            onClick={() => setMode(SegmentMode.CHARACTER)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              mode === SegmentMode.CHARACTER
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Type size={16} />
            <span>אותיות</span>
          </button>
          <button
            onClick={() => setMode(SegmentMode.WORD)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              mode === SegmentMode.WORD
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Scan size={16} />
            <span>מילים</span>
          </button>
          <button
            onClick={() => setMode(SegmentMode.LINE)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              mode === SegmentMode.LINE
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <AlignJustify size={16} />
            <span>שורות</span>
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
        {!hasResults ? (
          <button
            onClick={onProcess}
            disabled={disabled || isProcessing}
            className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-white font-medium transition-all ${
              disabled || isProcessing
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700 shadow-md hover:shadow-lg'
            }`}
          >
            {isProcessing ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                מעבד תמונה...
              </>
            ) : (
              <>
                <Scan size={18} />
                בצע ניתוח וזיהוי
              </>
            )}
          </button>
        ) : (
          <>
            <button
              onClick={onDownloadText}
              className="w-full sm:w-1/2 flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-all font-medium"
            >
              <FileText size={18} />
              הורד כטקסט (.txt)
            </button>
            <button
              onClick={onDownload}
              className="w-full sm:w-1/2 flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-white font-medium bg-green-600 hover:bg-green-700 shadow-md hover:shadow-lg transition-all"
            >
              <FolderTree size={18} />
              הורד תמונות (ZIP)
            </button>
          </>
        )}
      </div>
    </div>
  );
};