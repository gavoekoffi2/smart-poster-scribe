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

export function useOCR() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [textBlocks, setTextBlocks] = useState<OCRTextBlock[]>([]);

  const extractTextFromImage = useCallback(async (imageUrl: string): Promise<OCRTextBlock[]> => {
    setIsProcessing(true);
    setProgress(0);
    setTextBlocks([]);

    try {
      console.log("Starting OCR process...");

      // Create worker with French and English languages
      const worker = await createWorker("fra+eng", OEM.LSTM_ONLY, {
        logger: (m) => {
          if (m.status === "recognizing text") {
            setProgress(Math.round(m.progress * 100));
          }
        },
      });

      // Set PSM to auto for best text detection
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.AUTO,
      });

      console.log("Worker created, processing image...");

      // Recognize text from image with blocks enabled
      const result = await worker.recognize(imageUrl, {}, { blocks: true });

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
        toast.success(`${blocks.length} bloc(s) de texte détecté(s)`);
      } else {
        toast.info("Aucun texte détecté sur l'image");
      }

      return blocks;
    } catch (error) {
      console.error("OCR Error:", error);
      setIsProcessing(false);
      setProgress(0);
      toast.error("Erreur lors de la reconnaissance de texte");
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
