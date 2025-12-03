import JSZip from 'jszip';
import { TextSegment, SegmentMode } from '../types';

// Helper to sanitize folder names (remove illegal chars)
const sanitize = (name: string) => name.replace(/[/\\?%*:|"<>]/g, '-').trim() || 'unknown';

export const generateAndDownloadZip = async (
  segments: TextSegment[],
  mode: SegmentMode
) => {
  const zip = new JSZip();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const folderName = `processed_${mode}_${timestamp}`;
  const rootFolder = zip.folder(folderName);

  if (!rootFolder) return;

  // Prepare metadata for training dataset
  const dataset: any[] = [];

  // Group by text content (e.g., all 'A's go to folder 'A')
  segments.forEach((seg, index) => {
    if (!seg.imageData) return;

    // Clean the text to be a valid folder name
    const safeName = sanitize(seg.text);
    
    // Create folder for the character/word
    const charFolder = rootFolder.folder(safeName);

    if (charFolder) {
      // Remove data URL header to get raw base64
      const base64Data = seg.imageData.split(',')[1];
      const fileName = `${safeName}_${index + 1}.png`;
      
      // Add image to zip
      charFolder.file(fileName, base64Data, { base64: true });

      // Add to dataset metadata
      dataset.push({
        label: seg.text,
        file_path: `${safeName}/${fileName}`,
        original_box: seg.box, // Keep original normalized coordinates
        id: seg.id
      });
    }
  });

  // Add the training dataset JSON to the root of the zip
  // This is the file you can use later to train a model
  rootFolder.file("dataset.json", JSON.stringify(dataset, null, 2));

  // Add a README to explain the structure
  rootFolder.file("README.txt", `נתוני אימון - ${new Date().toLocaleString()}
  
מבנה התיקייה:
1. תיקיות לפי שמות האותיות/מילים.
2. קובץ dataset.json המכיל את המידע המלא לאימון מודלים (Labeling).
  
שימוש: גרור את התיקייה ל-Google Drive לשמירה.`);

  const content = await zip.generateAsync({ type: "blob" });
  
  // Use native anchor tag for download to avoid external dependency issues
  const url = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${folderName}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};