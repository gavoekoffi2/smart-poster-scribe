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
      // Fetch the image as blob
      const response = await fetch(image.imageUrl);
      if (!response.ok) throw new Error("Échec du téléchargement de l'image");
      
      const blob = await response.blob();

      if (format === "pdf") {
        // Create PDF with the image
        await downloadAsPdf(blob, image.id);
      } else {
        // Convert to desired format and download
        await downloadAsImage(blob, format, image.id);
      }

      toast.success(`Image téléchargée en ${format.toUpperCase()}`);
    } catch (error) {
      console.error("Download failed:", error);
      
      // Fallback: try with canvas for CORS issues
      try {
        await downloadWithCanvasFallback(image.imageUrl, format, image.id);
        toast.success(`Image téléchargée en ${format.toUpperCase()}`);
      } catch (fallbackError) {
        console.error("Fallback download failed:", fallbackError);
        toast.error("Échec du téléchargement. Réessayez.");
      }
    } finally {
      setIsDownloading(false);
    }
  };

  const downloadAsImage = async (blob: Blob, format: "png" | "jpeg", imageId: string) => {
    // Create an image from the blob to convert format if needed
    const img = new Image();
    const blobUrl = URL.createObjectURL(blob);
    
    return new Promise<void>((resolve, reject) => {
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas context not available"));
          return;
        }
        
        // For JPEG, fill with white background (no transparency)
        if (format === "jpeg") {
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        
        ctx.drawImage(img, 0, 0);
        
        const mimeType = format === "jpeg" ? "image/jpeg" : "image/png";
        const quality = format === "jpeg" ? 0.95 : undefined;
        
        canvas.toBlob(
          (outputBlob) => {
            if (!outputBlob) {
              reject(new Error("Failed to create blob"));
              return;
            }
            
            triggerDownload(outputBlob, `prographiste-${imageId}.${format}`);
            URL.revokeObjectURL(blobUrl);
            resolve();
          },
          mimeType,
          quality
        );
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(blobUrl);
        reject(new Error("Failed to load image"));
      };
      
      img.crossOrigin = "anonymous";
      img.src = blobUrl;
    });
  };

  const downloadAsPdf = async (blob: Blob, imageId: string) => {
    // Create image from blob
    const img = new Image();
    const blobUrl = URL.createObjectURL(blob);
    
    return new Promise<void>((resolve, reject) => {
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas context not available"));
          return;
        }
        
        ctx.drawImage(img, 0, 0);
        
        // Create PDF using print-to-PDF approach with iframe
        const dataUrl = canvas.toDataURL("image/png");
        
        // Create a hidden iframe for PDF generation
        const iframe = document.createElement("iframe");
        iframe.style.position = "fixed";
        iframe.style.right = "0";
        iframe.style.bottom = "0";
        iframe.style.width = "0";
        iframe.style.height = "0";
        iframe.style.border = "none";
        document.body.appendChild(iframe);
        
        const iframeDoc = iframe.contentWindow?.document;
        if (!iframeDoc) {
          document.body.removeChild(iframe);
          // Fallback: create simple PDF blob
          createSimplePdfAndDownload(dataUrl, imageId)
            .then(resolve)
            .catch(reject);
          return;
        }
        
        // Write HTML content with the image
        iframeDoc.open();
        iframeDoc.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>ProGraphiste - ${imageId}</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              @page { size: auto; margin: 0; }
              @media print {
                body { margin: 0; }
                img { max-width: 100%; max-height: 100vh; object-fit: contain; }
              }
              body {
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                background: white;
              }
              img {
                max-width: 100%;
                max-height: 100vh;
                object-fit: contain;
              }
            </style>
          </head>
          <body>
            <img src="${dataUrl}" alt="ProGraphiste Image" />
          </body>
          </html>
        `);
        iframeDoc.close();
        
        // Wait for image to load in iframe then print
        setTimeout(() => {
          try {
            iframe.contentWindow?.print();
          } catch (e) {
            console.error("Print failed:", e);
          }
          
          // Clean up after a delay
          setTimeout(() => {
            document.body.removeChild(iframe);
            URL.revokeObjectURL(blobUrl);
            resolve();
          }, 1000);
        }, 500);
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(blobUrl);
        reject(new Error("Failed to load image for PDF"));
      };
      
      img.crossOrigin = "anonymous";
      img.src = blobUrl;
    });
  };

  const createSimplePdfAndDownload = async (dataUrl: string, imageId: string): Promise<void> => {
    // Simple fallback: create a basic PDF with embedded image
    // This creates a minimal PDF structure
    const img = new Image();
    
    return new Promise((resolve, reject) => {
      img.onload = () => {
        const width = img.naturalWidth;
        const height = img.naturalHeight;
        
        // Create a simple HTML page and use print dialog
        const printWindow = window.open("", "_blank", "width=1,height=1");
        if (!printWindow) {
          reject(new Error("Popup blocked"));
          return;
        }
        
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>ProGraphiste - ${imageId}</title>
            <style>
              @page { size: ${width}px ${height}px; margin: 0; }
              body { margin: 0; display: flex; justify-content: center; align-items: center; }
              img { width: 100%; height: auto; }
            </style>
          </head>
          <body>
            <img src="${dataUrl}" />
            <script>
              window.onload = function() {
                setTimeout(function() {
                  window.print();
                  window.close();
                }, 100);
              };
            </script>
          </body>
          </html>
        `);
        printWindow.document.close();
        resolve();
      };
      
      img.onerror = () => reject(new Error("Image load failed"));
      img.src = dataUrl;
    });
  };

  const downloadWithCanvasFallback = async (
    imageUrl: string,
    format: "png" | "jpeg" | "pdf",
    imageId: string
  ) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    
    return new Promise<void>((resolve, reject) => {
      img.onload = async () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas not supported"));
          return;
        }
        
        if (format === "jpeg") {
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        
        ctx.drawImage(img, 0, 0);
        
        if (format === "pdf") {
          const dataUrl = canvas.toDataURL("image/png");
          await createSimplePdfAndDownload(dataUrl, imageId);
          resolve();
        } else {
          const mimeType = format === "jpeg" ? "image/jpeg" : "image/png";
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
            0.95
          );
        }
      };
      
      img.onerror = () => reject(new Error("Image load failed"));
      img.src = imageUrl;
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
