export enum SegmentMode {
  CHARACTER = 'character',
  WORD = 'word',
  LINE = 'line',
}

export interface BoundingBox {
  ymin: number;
  xmin: number;
  ymax: number;
  xmax: number;
}

export interface TextSegment {
  id: string;
  text: string;
  box: BoundingBox;
  imageData?: string; // Base64 of the cropped segment
}

export interface ProcessedResult {
  segments: TextSegment[];
  originalImage: string; // Base64
}
