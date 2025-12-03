import { GoogleGenAI, Type } from "@google/genai";
import { SegmentMode, TextSegment } from "../types";

// We no longer initialize the client globally to prevent crashes if env var is missing.
// instead, we initialize it inside the function using the user-provided key.

export const analyzeImage = async (
  apiKey: string,
  base64Image: string,
  mode: SegmentMode,
  modelName: string = "gemini-2.5-flash"
): Promise<TextSegment[]> => {
  if (!apiKey) {
    throw new Error("נא להזין מפתח API בראש הדף.");
  }

  // Initialize client with the specific key provided by user
  const ai = new GoogleGenAI({ apiKey: apiKey });

  // Remove header if present (e.g., "data:image/jpeg;base64,")
  const cleanBase64 = base64Image.split(",")[1] || base64Image;

  let prompt = "";
  // Instructions emphasizing accuracy and bounding box completeness
  const commonInstructions = "חשוב מאוד: אל תחתוך את האותיות או המילים באמצע. תן מסגרת (Bounding Box) נדיבה מעט שתכיל את כל האות/המילה כולל ניקוד אם יש. אל תערבב שורות שונות בתוך אותה מסגרת.";

  switch (mode) {
    case SegmentMode.CHARACTER:
      prompt = `נתח את התמונה הזו. המטרה: זיהוי אותיות בודדות בעברית. עבור כל אות בתמונה, החזר את המסגרת המדויקת שלה ואת האות עצמה. ${commonInstructions}`;
      break;
    case SegmentMode.WORD:
      prompt = `נתח את התמונה הזו. המטרה: זיהוי מילים שלמות. עבור כל מילה, החזר את המסגרת המדויקת ואת הטקסט. הקפד להפריד מילים צמודות. ${commonInstructions}`;
      break;
    case SegmentMode.LINE:
      prompt = `נתח את התמונה הזו. המטרה: זיהוי שורות טקסט. עבור כל שורה, החזר מסגרת שתופסת את כל השורה מימין לשמאל, אך לא גולשת לשורה מתחתיה או מעליה. ${commonInstructions}`;
      break;
  }

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: cleanBase64,
            },
          },
          {
            text: `${prompt} החזר את התוצאה בפורמט JSON בלבד. נקה את הטקסט מתווי ירידת שורה (n\\). הקואורדינטות צריכות להיות מנורמלות לסקאלה של 1000x1000.`,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            segments: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  text: {
                    type: Type.STRING,
                    description: "התוכן הטקסטואלי שזוהה (ללא רווחים מיותרים או ירידת שורה).",
                  },
                  ymin: { type: Type.INTEGER },
                  xmin: { type: Type.INTEGER },
                  ymax: { type: Type.INTEGER },
                  xmax: { type: Type.INTEGER },
                },
                required: ["text", "ymin", "xmin", "ymax", "xmax"],
              },
            },
          },
        },
      },
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("לא התקבל מידע מהבינה המלאכותית");

    const parsed = JSON.parse(jsonText);
    
    // Map to our internal type and add IDs
    return parsed.segments.map((seg: any, index: number) => ({
      id: `seg-${index}-${Date.now()}`,
      text: seg.text ? seg.text.trim().replace(/\n/g, '') : '', // Extra cleanup
      box: {
        ymin: seg.ymin,
        xmin: seg.xmin,
        ymax: seg.ymax,
        xmax: seg.xmax,
      },
    }));

  } catch (error) {
    console.error("Gemini analysis failed:", error);
    throw error;
  }
};