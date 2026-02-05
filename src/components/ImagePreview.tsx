import { GeneratedImage } from "@/types/generation";
import { Download, Maximize2, ImageIcon, FileImage, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useState } from "react";

interface ImagePreviewProps {
  image: GeneratedImage | null;
  isGenerating: boolean;
}

export function ImagePreview({ image, isGenerating }: ImagePreviewProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const downloadImage = async (format: "png" | "jpeg" | "pdf") => {
    if (!image || isDownloading) return;

    setIsDownloading(true);
    toast.info(`Préparation du téléchargement ${format.toUpperCase()}...`);

    try {
      await downloadWithCanvas(image.imageUrl, format, image.id);
      toast.success(`Image téléchargée en ${format.toUpperCase()}`);
    } catch (error) {
      console.error("Download failed:", error);
      toast.error("Échec du téléchargement. Réessayez.");
    } finally {
      setIsDownloading(false);
    }
  };

  const downloadWithCanvas = async (
    imageUrl: string,
    format: "png" | "jpeg" | "pdf",
    imageId: string
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas not supported"));
          return;
        }
        
        // For JPEG and PDF, fill with white background
        if (format === "jpeg" || format === "pdf") {
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        
        ctx.drawImage(img, 0, 0);
        
        if (format === "pdf") {
          createPdfFromCanvas(canvas, imageId)
            .then(resolve)
            .catch(reject);
        } else {
          const mimeType = format === "jpeg" ? "image/jpeg" : "image/png";
          const quality = format === "jpeg" ? 0.95 : undefined;
          
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error("Blob creation failed"));
                return;
              }
              triggerDownload(blob, `prographiste-${imageId}.${format}`);
              resolve();
            },
            mimeType,
            quality
          );
        }
      };
      
      img.onerror = () => {
        reject(new Error("Image load failed"));
      };
      
      img.src = imageUrl;
    });
  };

  const createPdfFromCanvas = async (canvas: HTMLCanvasElement, imageId: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("PDF blob creation failed"));
          return;
        }
        
        const width = canvas.width;
        const height = canvas.height;
        
        const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
        const base64Data = dataUrl.split(",")[1];
        
        // Decode base64 to binary
        const binaryString = atob(base64Data);
        const imageBytes: number[] = [];
        for (let i = 0; i < binaryString.length; i++) {
          imageBytes.push(binaryString.charCodeAt(i));
        }
        
        // Build PDF
        const pdfParts: (string | number[])[] = [];
        let offset = 0;
        const xref: number[] = [];
        
        const addString = (s: string) => {
          pdfParts.push(s);
          offset += s.length;
        };
        
        const addBinary = (bytes: number[]) => {
          pdfParts.push(bytes);
          offset += bytes.length;
        };
        
        // PDF sizing
        const maxWidth = 595;
        const maxHeight = 842;
        const scaleX = maxWidth / width;
        const scaleY = maxHeight / height;
        const scale = Math.min(scaleX, scaleY, 1);
        const pdfWidth = Math.round(width * scale);
        const pdfHeight = Math.round(height * scale);
        const offsetX = Math.round((maxWidth - pdfWidth) / 2);
        const offsetY = Math.round((maxHeight - pdfHeight) / 2);
        
        // Header
        addString("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
        
        // Catalog
        xref.push(offset);
        addString("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
        
        // Pages
        xref.push(offset);
        addString("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");
        
        // Page
        xref.push(offset);
        addString(`3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${maxWidth} ${maxHeight}] /Contents 4 0 R /Resources << /XObject << /Im1 5 0 R >> >> >>\nendobj\n`);
        
        // Content stream
        const contentStream = `q ${pdfWidth} 0 0 ${pdfHeight} ${offsetX} ${offsetY} cm /Im1 Do Q`;
        xref.push(offset);
        addString(`4 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}\nendstream\nendobj\n`);
        
        // Image XObject
        xref.push(offset);
        addString(`5 0 obj\n<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imageBytes.length} >>\nstream\n`);
        addBinary(imageBytes);
        addString("\nendstream\nendobj\n");
        
        // Xref table
        const xrefOffset = offset;
        addString("xref\n0 6\n0000000000 65535 f \n");
        for (const pos of xref) {
          addString(`${pos.toString().padStart(10, "0")} 00000 n \n`);
        }
        
        // Trailer
        addString(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);
        
        // Combine to final bytes
        let totalLength = 0;
        for (const part of pdfParts) {
          totalLength += typeof part === "string" ? part.length : part.length;
        }
        
        const result = new Uint8Array(totalLength);
        let pos = 0;
        for (const part of pdfParts) {
          if (typeof part === "string") {
            for (let i = 0; i < part.length; i++) {
              result[pos++] = part.charCodeAt(i);
            }
          } else {
            for (let i = 0; i < part.length; i++) {
              result[pos++] = part[i];
            }
          }
        }
        
        const pdfBlob = new Blob([result], { type: "application/pdf" });
        triggerDownload(pdfBlob, `prographiste-${imageId}.pdf`);
        resolve();
      }, "image/jpeg", 0.95);
    });
  };

  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFullscreen = () => {
    if (!image) return;
    window.open(image.imageUrl, "_blank");
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-xl tracking-wide text-foreground">
          APERÇU
        </h2>
        {image && (
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleFullscreen}
              title="Plein écran"
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Télécharger"
                  disabled={isDownloading}
                >
                  <Download className={cn("w-4 h-4", isDownloading && "animate-pulse")} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => downloadImage("png")} disabled={isDownloading}>
                  <FileImage className="w-4 h-4 mr-2" />
                  Télécharger PNG
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => downloadImage("jpeg")} disabled={isDownloading}>
                  <FileImage className="w-4 h-4 mr-2" />
                  Télécharger JPEG
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => downloadImage("pdf")} disabled={isDownloading}>
                  <FileText className="w-4 h-4 mr-2" />
                  Télécharger PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      <div
        className={cn(
          "flex-1 rounded-lg border border-border/50 overflow-hidden relative",
          "flex items-center justify-center",
          isGenerating && "animate-pulse"
        )}
      >
        {isGenerating ? (
          <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <ImageIcon className="w-6 h-6 text-primary" />
              </div>
            </div>
            <p className="text-sm">Génération en cours...</p>
            <p className="text-xs text-muted-foreground/70">
              Cela peut prendre jusqu'à 2 minutes
            </p>
          </div>
        ) : image ? (
          <img
            src={image.imageUrl}
            alt={image.prompt}
            className="max-w-full max-h-full object-contain"
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground p-8">
            <div className="w-24 h-24 rounded-xl border-2 border-dashed border-border/50 flex items-center justify-center">
              <ImageIcon className="w-10 h-10 text-muted-foreground/50" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">Aucune image générée</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Entrez un prompt et cliquez sur "Générer" pour créer votre
                affiche
              </p>
            </div>
          </div>
        )}
      </div>

      {image && (
        <div className="mt-4 p-3 rounded-lg bg-card/30 border border-border/30">
          <p className="text-xs text-muted-foreground line-clamp-2">
            {image.prompt}
          </p>
          <div className="flex gap-4 mt-2 text-xs text-muted-foreground/70">
            <span>{image.aspectRatio}</span>
            <span>{image.resolution}</span>
            <span>
              {new Date(image.createdAt).toLocaleTimeString("fr-FR")}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
