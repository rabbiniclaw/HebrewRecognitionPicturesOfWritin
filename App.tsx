import React, { useState, useRef, useEffect } from 'react';
import { Upload, Image as ImageIcon, X, AlertCircle, FolderTree, Scan, Key, ExternalLink, Sparkles } from 'lucide-react';
import { SegmentMode, TextSegment } from './types';
import { analyzeImage } from './services/geminiService';
import { cropSegments } from './utils/imageProcessing';
import { generateAndDownloadZip } from './utils/zipUtils';
import { ControlPanel } from './components/ControlPanel';

const App: React.FC = () => {
  const [apiKey, setApiKey] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [mode, setMode] = useState<SegmentMode>(SegmentMode.CHARACTER);
  const [selectedModel, setSelectedModel] = useState<string>("gemini-2.5-flash");
  const [isProcessing, setIsProcessing] = useState(false);
  const [segments, setSegments] = useState<TextSegment[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load API Key from local storage on mount
  useEffect(() => {
    const savedKey = localStorage.getItem("gemini_api_key");
    if (savedKey) {
      setApiKey(savedKey);
    }
  }, []);

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newKey = e.target.value;
    setApiKey(newKey);
    localStorage.setItem("gemini_api_key", newKey);
  };

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
    const lineThreshold = 30; 
    const lines: TextSegment[][] = [];
    
    const sortedByY = [...items].sort((a, b) => a.box.ymin - b.box.ymin);
    
    sortedByY.forEach(item => {
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
    
    lines.forEach(line => {
      line.sort((a, b) => b.box.xmax - a.box.xmax);
    });
    
    lines.sort((a, b) => a[0].box.ymin - b[0].box.ymin);
    
    return lines.flat();
  };

  const handleProcess = async () => {
    if (!apiKey) {
      setError("נא להזין מפתח API בראש הדף כדי להמשיך.");
      return;
    }
    if (!selectedImage) return;

    setIsProcessing(true);
    setError(null);

    try {
      // Pass the API Key explicitly to the service
      const rawSegments = await analyzeImage(apiKey, selectedImage, mode, selectedModel);
      
      if (rawSegments.length === 0) {
        setError("לא זוהו טקסטים בתמונה. נסה תמונה ברורה יותר או מודל חזק יותר.");
        setIsProcessing(false);
        return;
      }

      const croppedSegments = await cropSegments(selectedImage, rawSegments);
      const sortedSegments = sortSegmentsRTL(croppedSegments);
      
      setSegments(sortedSegments);
    } catch (err: any) {
      setError(err.message || "אירעה שגיאה בעיבוד התמונה. וודא שהמפתח תקין.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (segments.length === 0) return;
    generateAndDownloadZip(segments, mode);
  };

  const handleDownloadText = () => {
    if (segments.length === 0) return;
    
    let fullText = "";
    let lastY = -1;
    const lineThreshold = 30; 

    segments.forEach((seg, index) => {
      if (lastY !== -1 && Math.abs(seg.box.ymin - lastY) > lineThreshold) {
        fullText += "\n";
      }
      
      const isNewLine = lastY !== -1 && Math.abs(seg.box.ymin - lastY) > lineThreshold;
      const isFirst = index === 0;
      
      if (!isFirst && !isNewLine && mode !== SegmentMode.CHARACTER) {
         fullText += " ";
      }
      
      fullText += seg.text;
      
      if (isNewLine || lastY === -1) {
          lastY = seg.box.ymin;
      }
    });

    const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `extracted_text_${new Date().toISOString().slice(0,10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
    <div className="min-h-screen pb-12 font-sans bg-gradient-to-br from-gray-50 to-gray-100" dir="rtl">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200/60 sticky top-0 z-40 shadow-sm transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col md:flex-row items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-indigo-500 to-violet-600 p-2 rounded-xl shadow-lg shadow-indigo-200">
              <Sparkles className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight leading-none">מנתח טקסט AI</h1>
              <p className="text-xs text-gray-500 mt-0.5 font-medium">חיתוך וזיהוי חכם לדרייב</p>
            </div>
          </div>

          {/* API Key Input Section */}
          <div className="flex flex-col items-end w-full md:w-auto">
            <div className="flex items-center gap-2 w-full md:w-auto bg-white border border-gray-300 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 shadow-sm transition-shadow hover:shadow-md">
              <Key size={18} className="text-indigo-500 min-w-[18px]" />
              <input 
                type="password"
                value={apiKey}
                onChange={handleApiKeyChange}
                placeholder="הכנס מפתח Gemini API כאן..."
                className="bg-transparent border-none outline-none text-sm text-gray-700 w-full md:w-80 placeholder-gray-400"
              />
            </div>
            <div className="flex items-center gap-4 mt-1.5 text-[10px] text-gray-500 px-1">
              <span>תומך במפתח חינמי ובתשלום</span>
              <a 
                href="https://aistudio.google.com/app/apikey" 
                target="_blank" 
                rel="noreferrer"
                className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-medium hover:underline"
              >
                השג מפתח כאן <ExternalLink size={10} />
              </a>
            </div>
          </div>

        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        
        {/* Error Banner */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 text-red-700 animate-fadeIn shadow-sm">
            <AlertCircle size={20} className="shrink-0" />
            <p className="font-medium">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Right Column: Input Area */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Upload Area */}
            {!selectedImage ? (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 hover:border-indigo-400 rounded-3xl h-[28rem] flex flex-col items-center justify-center bg-white hover:bg-gray-50 transition-all cursor-pointer group shadow-sm hover:shadow-md"
              >
                <div className="bg-indigo-50 p-6 rounded-full group-hover:scale-110 group-hover:bg-indigo-100 transition-all duration-300 mb-6">
                  <Upload className="w-10 h-10 text-indigo-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">העלה תמונה לניתוח</h3>
                <p className="text-gray-500 text-center max-w-xs leading-relaxed">
                  תומך בכתב יד ודפוס.
                  <br/>
                  JPG, PNG פורמטים נתמכים
                </p>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*"
                  onChange={handleFileChange}
                />
              </div>
            ) : (
              <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-white overflow-hidden relative ring-1 ring-gray-100">
                {/* Image Header */}
                <div className="absolute top-4 left-4 z-10">
                   <button 
                    onClick={handleReset}
                    className="bg-white/80 backdrop-blur-md hover:bg-red-50 hover:text-red-600 text-gray-700 p-2.5 rounded-full shadow-lg transition-all border border-gray-200"
                    title="נקה תמונה"
                  >
                    <X size={20} />
                  </button>
                </div>
                
                <div className="relative p-8 bg-gray-50/50 flex justify-center min-h-[350px] pattern-grid">
                  <img 
                    src={selectedImage} 
                    alt="Original" 
                    className="max-h-[500px] object-contain rounded-lg shadow-lg border border-gray-200 bg-white" 
                  />
                </div>

                <div className="p-6 border-t border-gray-100 bg-white">
                  <ControlPanel
                    mode={mode}
                    setMode={setMode}
                    selectedModel={selectedModel}
                    setModel={setSelectedModel}
                    onProcess={handleProcess}
                    isProcessing={isProcessing}
                    hasResults={segments.length > 0}
                    onDownload={handleDownload}
                    onDownloadText={handleDownloadText}
                    disabled={!apiKey}
                  />
                  {!apiKey && (
                    <div className="mt-4 bg-amber-50 text-amber-800 px-4 py-2 rounded-lg text-sm text-center border border-amber-100 flex items-center justify-center gap-2">
                       <Key size={14} />
                       נא להזין מפתח API בראש הדף כדי להפעיל את הכפתורים
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Left Column: Results Area */}
          <div className="lg:col-span-1">
             <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl shadow-gray-200/50 border border-white flex flex-col h-[calc(100vh-140px)] sticky top-24 ring-1 ring-gray-100">
                <div className="p-5 border-b border-gray-100 bg-white/50 rounded-t-3xl">
                  <h2 className="font-bold text-gray-900 flex items-center gap-2 text-lg">
                    <FolderTree size={20} className="text-indigo-600"/>
                    תוצאות זיהוי
                  </h2>
                  <div className="flex items-center justify-between mt-2">
                     <p className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
                       מיון: ימין לשמאל
                     </p>
                     <p className="text-xs text-indigo-600 font-medium">
                       {segments.length} פריטים
                     </p>
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar bg-gray-50/30">
                  {segments.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 p-8 space-y-4">
                       <div className="bg-gray-100 p-4 rounded-full">
                          <Scan className="w-8 h-8 opacity-40" />
                       </div>
                       <p className="text-sm font-medium">התוצאות יופיעו כאן לאחר הניתוח</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 pb-4">
                      {segments.map((seg) => (
                        <div key={seg.id} className="group relative bg-white rounded-xl p-2.5 border border-gray-100 hover:border-indigo-300 hover:shadow-md transition-all duration-200">
                          <button 
                            onClick={() => handleDeleteSegment(seg.id)}
                            className="absolute -top-2 -right-2 bg-white text-red-500 hover:bg-red-500 hover:text-white border border-gray-200 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all shadow-sm z-10 scale-90 hover:scale-105"
                            title="מחק חיתוך זה"
                          >
                            <X size={14} />
                          </button>
                          
                          <div className="aspect-square bg-gray-50 rounded-lg border border-gray-100 mb-2 overflow-hidden flex items-center justify-center relative p-1">
                            {seg.imageData ? (
                              <img src={seg.imageData} alt={seg.text} className="w-full h-full object-contain" />
                            ) : (
                              <div className="w-full h-full bg-gray-100 animate-pulse" />
                            )}
                          </div>
                          <div className="text-center">
                            <span className="inline-block w-full bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-sm font-bold border border-indigo-100 truncate">
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