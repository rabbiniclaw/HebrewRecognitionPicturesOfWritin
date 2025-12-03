import React, { useState, useRef } from 'react';
import { Upload, Image as ImageIcon, X, AlertCircle, FolderTree, Scan, Trash2 } from 'lucide-react';
import { SegmentMode, TextSegment } from './types';
import { analyzeImage } from './services/geminiService';
import { cropSegments } from './utils/imageProcessing';
import { generateAndDownloadZip } from './utils/zipUtils';
import { ControlPanel } from './components/ControlPanel';

const App: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [mode, setMode] = useState<SegmentMode>(SegmentMode.CHARACTER);
  const [selectedModel, setSelectedModel] = useState<string>("gemini-2.5-flash");
  const [isProcessing, setIsProcessing] = useState(false);
  const [segments, setSegments] = useState<TextSegment[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setSelectedImage(reader.result as string);
          setSegments([]); // Reset previous results
          setError(null);
        };
        reader.readAsDataURL(file);
      } else {
        setError("אנא בחר קובץ תמונה תקין.");
      }
    }
  };

  // Helper to sort segments Right-to-Left, Top-to-Bottom
  const sortSegmentsRTL = (items: TextSegment[]): TextSegment[] => {
    if (items.length === 0) return [];
    
    // 1. Group by rough Y position (lines)
    // We use a threshold relative to the coordinate system (0-1000)
    const lineThreshold = 30; 
    const lines: TextSegment[][] = [];
    
    // Sort by Ymin first to process top-down
    const sortedByY = [...items].sort((a, b) => a.box.ymin - b.box.ymin);
    
    sortedByY.forEach(item => {
      // Try to find an existing line this item belongs to
      const matchingLine = lines.find(line => {
        const avgY = line.reduce((sum, i) => sum + i.box.ymin, 0) / line.length;
        return Math.abs(item.box.ymin - avgY) < lineThreshold;
      });
      
      if (matchingLine) {
        matchingLine.push(item);
      } else {
        lines.push([item]);
      }
    });
    
    // 2. Sort within each line by Xmax descending (Right to Left)
    lines.forEach(line => {
      line.sort((a, b) => b.box.xmax - a.box.xmax);
    });
    
    // 3. Ensure lines themselves are sorted top-to-bottom
    lines.sort((a, b) => a[0].box.ymin - b[0].box.ymin);
    
    return lines.flat();
  };

  const handleProcess = async () => {
    if (!selectedImage) return;

    setIsProcessing(true);
    setError(null);

    try {
      // 1. Get coordinates from Gemini
      const rawSegments = await analyzeImage(selectedImage, mode, selectedModel);
      
      if (rawSegments.length === 0) {
        setError("לא זוהו טקסטים בתמונה. נסה תמונה ברורה יותר או מודל חזק יותר.");
        setIsProcessing(false);
        return;
      }

      // 2. Crop images locally
      const croppedSegments = await cropSegments(selectedImage, rawSegments);
      
      // 3. Sort them RTL for Hebrew
      const sortedSegments = sortSegmentsRTL(croppedSegments);
      
      setSegments(sortedSegments);
    } catch (err: any) {
      setError(err.message || "אירעה שגיאה בעיבוד התמונה.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (segments.length === 0) return;
    generateAndDownloadZip(segments, mode);
  };

  const handleReset = () => {
    setSelectedImage(null);
    setSegments([]);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDeleteSegment = (id: string) => {
    setSegments(prev => prev.filter(seg => seg.id !== id));
  };

  return (
    <div className="min-h-screen pb-12 font-sans" dir="rtl">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <ImageIcon className="text-white w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">מנתח טקסט חכם</h1>
          </div>
          <div className="text-sm text-gray-500 hidden sm:block">
            מופעל ע"י ג'מיני AI
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        
        {/* Error Banner */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3 text-red-700 animate-fadeIn">
            <AlertCircle size={20} />
            <p>{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Right Column: Input Area */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Upload Area */}
            {!selectedImage ? (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-2xl h-96 flex flex-col items-center justify-center bg-white hover:bg-gray-50 transition-colors cursor-pointer group shadow-sm"
              >
                <div className="bg-indigo-50 p-4 rounded-full group-hover:scale-110 transition-transform duration-300">
                  <Upload className="w-8 h-8 text-indigo-600" />
                </div>
                <h3 className="mt-4 text-lg font-medium text-gray-900">העלה תמונה</h3>
                <p className="mt-1 text-sm text-gray-500">תומך ב-JPG, PNG (כתב יד או דפוס)</p>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*"
                  onChange={handleFileChange}
                />
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden relative">
                {/* Image Header */}
                <div className="absolute top-4 left-4 z-10">
                   <button 
                    onClick={handleReset}
                    className="bg-white/90 backdrop-blur-sm hover:bg-red-50 hover:text-red-600 text-gray-700 p-2 rounded-full shadow-lg transition-all border border-gray-200"
                    title="נקה תמונה"
                  >
                    <X size={20} />
                  </button>
                </div>
                
                <div className="relative p-6 bg-gray-50/50 flex justify-center min-h-[300px]">
                  <img 
                    src={selectedImage} 
                    alt="Original" 
                    className="max-h-[500px] object-contain rounded-lg shadow-sm border border-gray-200" 
                  />
                </div>

                <div className="p-4 border-t border-gray-100 bg-white">
                  <ControlPanel
                    mode={mode}
                    setMode={setMode}
                    selectedModel={selectedModel}
                    setModel={setSelectedModel}
                    onProcess={handleProcess}
                    isProcessing={isProcessing}
                    hasResults={segments.length > 0}
                    onDownload={handleDownload}
                    disabled={false}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Left Column: Results Area */}
          <div className="lg:col-span-1">
             <div className="bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col h-[calc(100vh-140px)] sticky top-24">
                <div className="p-4 border-b border-gray-100 bg-gray-50/50 rounded-t-2xl">
                  <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                    <FolderTree size={18} className="text-indigo-600"/>
                    תוצאות זיהוי (מימין לשמאל)
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">
                    {segments.length} פריטים זוהו. לחץ על X למחיקת שגיאות.
                  </p>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                  {segments.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 p-8">
                       <Scan className="w-12 h-12 mb-3 opacity-20" />
                       <p className="text-sm">העלה תמונה ולחץ על "בצע ניתוח" כדי לראות את החיתוכים כאן.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-3">
                      {segments.map((seg) => (
                        <div key={seg.id} className="group relative bg-gray-50 rounded-lg p-2 border border-gray-100 hover:border-indigo-200 hover:shadow-sm transition-all">
                          <button 
                            onClick={() => handleDeleteSegment(seg.id)}
                            className="absolute -top-2 -right-2 bg-white text-red-500 hover:bg-red-50 border border-gray-200 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-10 scale-90 hover:scale-100"
                            title="מחק חיתוך זה"
                          >
                            <X size={14} />
                          </button>
                          
                          <div className="aspect-square bg-white rounded-md border border-gray-200 mb-2 overflow-hidden flex items-center justify-center relative">
                            {seg.imageData ? (
                              <img src={seg.imageData} alt={seg.text} className="w-full h-full object-contain p-1" />
                            ) : (
                              <div className="w-full h-full bg-gray-100 animate-pulse" />
                            )}
                          </div>
                          <div className="text-center">
                            <span className="inline-block bg-white px-2 py-0.5 rounded text-sm font-bold text-gray-800 border border-gray-200 shadow-sm truncate max-w-full">
                              {seg.text}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
             </div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default App;