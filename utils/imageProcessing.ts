import { TextSegment, BoundingBox } from "../types";

export const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
};

export const cropSegments = async (
  imageSrc: string,
  segments: TextSegment[]
): Promise<TextSegment[]> => {
  const img = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) throw new Error("Could not get canvas context");

  const results: TextSegment[] = [];

  for (const segment of segments) {
    const { ymin, xmin, ymax, xmax } = segment.box;

    // Convert normalized 1000 coordinates to actual pixels
    const x = (xmin / 1000) * img.width;
    const y = (ymin / 1000) * img.height;
    const w = ((xmax - xmin) / 1000) * img.width;
    const h = ((ymax - ymin) / 1000) * img.height;

    // Add LARGER padding to ensure we don't cut off edges, especially for handwriting
    // Increase from 2 to 8 pixels or approx 1-2% of size
    const padding = 8; 
    
    const safeX = Math.max(0, x - padding);
    const safeY = Math.max(0, y - padding);
    const safeW = Math.min(img.width - safeX, w + (padding * 2));
    const safeH = Math.min(img.height - safeY, h + (padding * 2));

    canvas.width = safeW;
    canvas.height = safeH;

    ctx.clearRect(0, 0, safeW, safeH);
    ctx.drawImage(img, safeX, safeY, safeW, safeH, 0, 0, safeW, safeH);

    const blobUrl = canvas.toDataURL("image/png");
    results.push({
      ...segment,
      imageData: blobUrl,
    });
  }

  return results;
};