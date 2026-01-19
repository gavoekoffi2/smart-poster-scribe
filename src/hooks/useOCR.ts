import { useState, useCallback } from "react";
import { createWorker, OEM, PSM } from "tesseract.js";
import { toast } from "sonner";

export interface OCRTextBlock {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  fontSize?: number;
}

// Helper to convert image URL to blob for OCR processing
async function fetchImageAsBlob(url: string): Promise<Blob> {
  // If it's already a data URL, convert directly
  if (url.startsWith("data:")) {
    const response = await fetch(url);
    return response.blob();
  }

  // For regular URLs, try to fetch with CORS
  try {
    const response = await fetch(url, {
      mode: "cors",
      credentials: "omit",
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.blob();
  } catch (error) {
    console.warn("CORS fetch failed, trying no-cors proxy approach");
    
    // Create an image element and draw to canvas to bypass CORS
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Could not convert canvas to blob"));
          }
        }, "image/png");
      };
      
      img.onerror = () => {
        // Last resort: try loading without crossOrigin
        const img2 = new Image();
        img2.onload = () => {
          try {
            const canvas = document.createElement("canvas");
            canvas.width = img2.naturalWidth;
            canvas.height = img2.naturalHeight;
            const ctx = canvas.getContext("2d");
            if (!ctx) {
              reject(new Error("Could not get canvas context"));
              return;
            }
            ctx.drawImage(img2, 0, 0);
            canvas.toBlob((blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error("Could not convert canvas to blob"));
              }
            }, "image/png");
          } catch (e) {
            reject(new Error("Canvas tainted by cross-origin data"));
          }
        };
        img2.onerror = () => reject(new Error("Failed to load image"));
        img2.src = url;
      };
      
      img.src = url;
    });
  }
}

export function useOCR() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [textBlocks, setTextBlocks] = useState<OCRTextBlock[]>([]);

  const extractTextFromImage = useCallback(async (imageUrl: string): Promise<OCRTextBlock[]> => {
    setIsProcessing(true);
    setProgress(0);
    setTextBlocks([]);

    try {
      console.log("Starting OCR process with URL:", imageUrl);

      // First, fetch the image as a blob to avoid CORS issues with Tesseract
      let imageBlob: Blob;
      try {
        imageBlob = await fetchImageAsBlob(imageUrl);
        console.log("Image fetched as blob, size:", imageBlob.size);
      } catch (fetchError) {
        console.error("Failed to fetch image:", fetchError);
        toast.error("Impossible de charger l'image pour l'OCR");
        setIsProcessing(false);
        return [];
      }

      // Create worker with French and English languages
      console.log("Creating Tesseract worker...");
      const worker = await createWorker("fra+eng", OEM.LSTM_ONLY, {
        logger: (m) => {
          console.log("Tesseract progress:", m.status, m.progress);
          if (m.status === "recognizing text") {
            setProgress(Math.round(m.progress * 100));
          }
        },
      });

      // Set PSM to auto for best text detection
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.AUTO,
      });

      console.log("Worker created, processing image blob...");

      // Recognize text from image blob with blocks enabled
      const result = await worker.recognize(imageBlob, {}, { blocks: true });

      console.log("OCR Result:", result);

      // Extract text blocks with positions from the nested structure
      const blocks: OCRTextBlock[] = [];

      if (result.data.blocks && result.data.blocks.length > 0) {
        // Iterate through blocks -> paragraphs -> lines
        for (const block of result.data.blocks) {
          if (block.paragraphs) {
            for (const paragraph of block.paragraphs) {
              if (paragraph.lines) {
                for (const line of paragraph.lines) {
                  if (line.confidence > 30 && line.text.trim().length > 0) {
                    const { x0, y0, x1, y1 } = line.bbox;
                    const height = y1 - y0;
                    const estimatedFontSize = Math.max(12, Math.min(72, Math.round(height * 0.8)));

                    blocks.push({
                      text: line.text.trim(),
                      x: x0,
                      y: y0,
                      width: x1 - x0,
                      height: height,
                      confidence: line.confidence,
                      fontSize: estimatedFontSize,
                    });
                  }
                }
              }
            }
          }
        }
      }

      // Terminate worker
      await worker.terminate();

      console.log("Extracted text blocks:", blocks);
      setTextBlocks(blocks);
      setIsProcessing(false);
      setProgress(100);

      if (blocks.length > 0) {
        toast.success(`${blocks.length} bloc(s) de texte détecté(s) !`);
      } else {
        toast.info("Aucun texte détecté sur l'image. Essayez avec une image contenant du texte plus lisible.");
      }

      return blocks;
    } catch (error) {
      console.error("OCR Error:", error);
      setIsProcessing(false);
      setProgress(0);
      toast.error("Erreur lors de la reconnaissance de texte. Veuillez réessayer.");
      return [];
    }
  }, []);

  const clearTextBlocks = useCallback(() => {
    setTextBlocks([]);
  }, []);

  return {
    isProcessing,
    progress,
    textBlocks,
    extractTextFromImage,
    clearTextBlocks,
  };
}
