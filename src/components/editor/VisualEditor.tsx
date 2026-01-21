import { useEffect, useRef, useState, useCallback } from "react";
import { Canvas as FabricCanvas, FabricImage, IText, Rect, Circle, Shadow } from "fabric";
import { Button } from "@/components/ui/button";
import { 
  Type, 
  Image as ImageIcon, 
  Square, 
  Circle as CircleIcon, 
  Download, 
  Undo, 
  Redo,
  Trash2, 
  X,
  Save,
  Move,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ChevronDown,
  AlertCircle,
  ScanText,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAITextExtraction, ExtractedTextBlock } from "@/hooks/useAITextExtraction";
import { Progress } from "@/components/ui/progress";

interface VisualEditorProps {
  imageUrl: string;
  onClose: () => void;
  onSave: (editedImageUrl: string) => void;
}

type Tool = "select" | "text" | "rectangle" | "circle" | "image";

const COLORS = [
  "#000000", "#FFFFFF", "#FF0000", "#00FF00", "#0000FF",
  "#FFFF00", "#FF00FF", "#00FFFF", "#D4AF37", "#F97316",
  "#8B5CF6", "#EC4899", "#10B981", "#3B82F6", "#EF4444",
  "#1a1a2e", "#16213e", "#0f3460", "#533483", "#e94560"
];

const FONTS = [
  { name: "Sans-serif", value: "Inter, sans-serif" },
  { name: "Serif", value: "Georgia, serif" },
  { name: "Monospace", value: "monospace" },
  { name: "Impact", value: "Impact, sans-serif" },
  { name: "Comic Sans", value: "Comic Sans MS, cursive" },
  { name: "Arial Black", value: "Arial Black, sans-serif" },
  { name: "Verdana", value: "Verdana, sans-serif" },
  { name: "Trebuchet", value: "Trebuchet MS, sans-serif" },
  { name: "Courier", value: "Courier New, monospace" },
  { name: "Brush Script", value: "Brush Script MT, cursive" },
];

// Simple image loader with timeout
async function loadImage(src: string, timeout = 10000): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    
    const timer = setTimeout(() => {
      reject(new Error("Image load timeout"));
    }, timeout);
    
    img.onload = () => {
      clearTimeout(timer);
      resolve(img);
    };
    
    img.onerror = () => {
      clearTimeout(timer);
      // Try without CORS
      const img2 = new Image();
      img2.onload = () => resolve(img2);
      img2.onerror = () => reject(new Error("Failed to load image"));
      img2.src = src;
    };
    
    img.src = src;
  });
}

// Fetch image as blob and create object URL
async function fetchImageAsBlob(url: string): Promise<string> {
  const response = await fetch(url, { 
    mode: 'cors',
    credentials: 'omit'
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

export function VisualEditor({ imageUrl, onClose, onSave }: VisualEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fabricCanvasRef = useRef<FabricCanvas | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [activeTool, setActiveTool] = useState<Tool>("select");
  const [activeColor, setActiveColor] = useState("#FFFFFF");
  const [activeFont, setActiveFont] = useState(FONTS[0]);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [loadingState, setLoadingState] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [zoom, setZoom] = useState(1);
  const [imageScale, setImageScale] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const blobUrlRef = useRef<string | null>(null);

  // AI Text Extraction hook (replaces OCR)
  const { isProcessing: isTextExtracting, progress: extractProgress, extractTextFromImage } = useAITextExtraction();

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
      }
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
        fabricCanvasRef.current = null;
      }
    };
  }, []);

  // Initialize editor
  const initializeEditor = useCallback(async () => {
    if (!canvasRef.current || !containerRef.current) {
      console.error("Canvas or container ref not available");
      return;
    }

    // Dispose previous canvas if exists
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.dispose();
      fabricCanvasRef.current = null;
    }

    // Clean up previous blob URL
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }

    setLoadingState("loading");
    setErrorMessage("");
    setIsReady(false);

    try {
      console.log("Starting editor initialization with URL:", imageUrl);

      // Get container dimensions
      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      const maxWidth = Math.max(rect.width - 40, 400);
      const maxHeight = Math.max(rect.height - 40, 300);

      console.log("Container dimensions:", maxWidth, "x", maxHeight);

      // Load image - try multiple strategies
      let img: HTMLImageElement | null = null;
      let loadError: Error | null = null;

      // Strategy 1: Direct load
      try {
        console.log("Trying direct image load...");
        img = await loadImage(imageUrl, 8000);
        console.log("Direct load successful");
      } catch (e) {
        console.warn("Direct load failed:", e);
        loadError = e as Error;
      }

      // Strategy 2: Fetch as blob (for CORS issues)
      if (!img) {
        try {
          console.log("Trying fetch as blob...");
          const blobUrl = await fetchImageAsBlob(imageUrl);
          blobUrlRef.current = blobUrl;
          img = await loadImage(blobUrl, 8000);
          console.log("Blob fetch successful");
        } catch (e) {
          console.warn("Blob fetch failed:", e);
          loadError = e as Error;
        }
      }

      // Strategy 3: If it's a data URL, use it directly
      if (!img && imageUrl.startsWith("data:")) {
        try {
          console.log("Trying data URL load...");
          img = await loadImage(imageUrl, 8000);
          console.log("Data URL load successful");
        } catch (e) {
          console.warn("Data URL load failed:", e);
          loadError = e as Error;
        }
      }

      if (!img) {
        throw loadError || new Error("Could not load image");
      }

      console.log("Image loaded:", img.width, "x", img.height);

      // Calculate canvas size
      const aspectRatio = img.width / img.height;
      let width = maxWidth;
      let height = width / aspectRatio;

      if (height > maxHeight) {
        height = maxHeight;
        width = height * aspectRatio;
      }

      width = Math.max(Math.floor(width), 400);
      height = Math.max(Math.floor(height), 300);

      // Calculate scale factor for OCR coordinate conversion
      const scale = width / img.width;
      setImageScale(scale);

      console.log("Canvas size:", width, "x", height, "Scale:", scale);
      setCanvasSize({ width, height });

      // Create Fabric canvas
      const canvas = new FabricCanvas(canvasRef.current, {
        width,
        height,
        backgroundColor: "#1a1a2e",
        selection: true,
        preserveObjectStacking: true,
      });

      fabricCanvasRef.current = canvas;

      // Set background image
      const fabricImg = new FabricImage(img);
      fabricImg.scaleToWidth(width);
      fabricImg.scaleToHeight(height);
      canvas.backgroundImage = fabricImg;
      canvas.renderAll();

      console.log("Canvas created and background set");

      // Save initial state to history
      const json = JSON.stringify(canvas.toJSON());
      setHistory([json]);
      setHistoryIndex(0);

      setIsReady(true);
      setLoadingState("ready");
      toast.success("Éditeur prêt !");

    } catch (error) {
      console.error("Editor initialization error:", error);
      setErrorMessage(error instanceof Error ? error.message : "Erreur inconnue");
      setLoadingState("error");
      toast.error("Impossible de charger l'éditeur");
    }
  }, [imageUrl]);

  // Run initialization when component mounts
  useEffect(() => {
    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      initializeEditor();
    }, 100);

    return () => clearTimeout(timer);
  }, [initializeEditor]);

  // Get current canvas
  const getCanvas = useCallback(() => fabricCanvasRef.current, []);

  // Save to history
  const saveToHistory = useCallback(() => {
    const canvas = getCanvas();
    if (!canvas) return;
    
    const json = JSON.stringify(canvas.toJSON());
    setHistory(prev => {
      const newHistory = [...prev.slice(0, historyIndex + 1), json];
      setHistoryIndex(newHistory.length - 1);
      return newHistory;
    });
  }, [getCanvas, historyIndex]);

  // Undo
  const handleUndo = useCallback(() => {
    const canvas = getCanvas();
    if (!canvas || historyIndex <= 0) return;
    
    const newIndex = historyIndex - 1;
    canvas.loadFromJSON(JSON.parse(history[newIndex])).then(() => {
      canvas.renderAll();
      setHistoryIndex(newIndex);
    });
  }, [getCanvas, history, historyIndex]);

  // Redo
  const handleRedo = useCallback(() => {
    const canvas = getCanvas();
    if (!canvas || historyIndex >= history.length - 1) return;
    
    const newIndex = historyIndex + 1;
    canvas.loadFromJSON(JSON.parse(history[newIndex])).then(() => {
      canvas.renderAll();
      setHistoryIndex(newIndex);
    });
  }, [getCanvas, history, historyIndex]);

  // Add text
  const addText = useCallback(() => {
    const canvas = getCanvas();
    if (!canvas) return;
    
    const text = new IText("Votre texte ici", {
      left: canvasSize.width / 2 - 80,
      top: canvasSize.height / 2 - 20,
      fontSize: 32,
      fill: activeColor,
      fontFamily: activeFont.value,
      fontWeight: "bold",
      shadow: new Shadow({ color: "rgba(0,0,0,0.5)", blur: 4, offsetX: 2, offsetY: 2 }),
    });
    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
    saveToHistory();
    setActiveTool("select");
    toast.success("Texte ajouté - Double-cliquez pour éditer");
  }, [getCanvas, canvasSize, activeColor, activeFont, saveToHistory]);

  // Add extracted text block to canvas
  const addExtractedTextToCanvas = useCallback((block: ExtractedTextBlock) => {
    const canvas = getCanvas();
    if (!canvas) return;

    // The AI returns positions as percentages (0-100)
    // Convert percentage to canvas pixels
    const scaledX = (block.x / 100) * canvasSize.width;
    const scaledY = (block.y / 100) * canvasSize.height;
    
    // Scale font size based on canvas/image ratio
    // The AI estimates font size for the original image, we need to scale it
    const scaledFontSize = Math.max(14, Math.min(80, (block.fontSize || 32) * imageScale));

    console.log(`Adding text block: "${block.text}" at (${scaledX}, ${scaledY}) fontSize: ${scaledFontSize}`);

    const text = new IText(block.text, {
      left: scaledX,
      top: scaledY,
      fontSize: scaledFontSize,
      fill: "#FFFFFF", // Default to white for visibility on most poster backgrounds
      fontFamily: activeFont.value,
      fontWeight: "bold",
      shadow: new Shadow({ color: "rgba(0,0,0,0.8)", blur: 4, offsetX: 2, offsetY: 2 }),
      stroke: "#000000",
      strokeWidth: 0.5,
    });

    canvas.add(text);
    return text;
  }, [getCanvas, canvasSize, activeFont, imageScale]);

  // Run AI text extraction and add detected text as editable layers
  const handleTextExtraction = useCallback(async () => {
    const canvas = getCanvas();
    if (!canvas) return;

    toast.info("Extraction du texte en cours avec l'IA...");

    try {
      const textBlocks = await extractTextFromImage(imageUrl);

      if (textBlocks.length > 0) {
        // Add each text block as an editable layer
        textBlocks.forEach((block) => {
          addExtractedTextToCanvas(block);
        });

        canvas.renderAll();
        saveToHistory();
        setActiveTool("select");
        toast.success(`${textBlocks.length} texte(s) détecté(s) et ajouté(s) comme calques éditables!`);
      }
    } catch (error) {
      console.error("Text Extraction Error:", error);
      toast.error("Erreur lors de l'extraction du texte");
    }
  }, [getCanvas, imageUrl, extractTextFromImage, addExtractedTextToCanvas, saveToHistory]);
  // Apply font to selected text
  const applyFontToSelected = useCallback((font: typeof FONTS[0]) => {
    const canvas = getCanvas();
    if (!canvas) return;
    
    const activeObject = canvas.getActiveObject();
    if (activeObject && activeObject instanceof IText) {
      activeObject.set("fontFamily", font.value);
      canvas.renderAll();
      saveToHistory();
    }
    setActiveFont(font);
  }, [getCanvas, saveToHistory]);

  // Add rectangle
  const addRectangle = useCallback(() => {
    const canvas = getCanvas();
    if (!canvas) return;
    
    const rect = new Rect({
      left: canvasSize.width / 2 - 50,
      top: canvasSize.height / 2 - 50,
      width: 100,
      height: 100,
      fill: activeColor,
      opacity: 0.8,
      rx: 8,
      ry: 8,
    });
    canvas.add(rect);
    canvas.setActiveObject(rect);
    canvas.renderAll();
    saveToHistory();
    setActiveTool("select");
    toast.success("Rectangle ajouté");
  }, [getCanvas, canvasSize, activeColor, saveToHistory]);

  // Add circle
  const addCircle = useCallback(() => {
    const canvas = getCanvas();
    if (!canvas) return;
    
    const circle = new Circle({
      left: canvasSize.width / 2 - 50,
      top: canvasSize.height / 2 - 50,
      radius: 50,
      fill: activeColor,
      opacity: 0.8,
    });
    canvas.add(circle);
    canvas.setActiveObject(circle);
    canvas.renderAll();
    saveToHistory();
    setActiveTool("select");
    toast.success("Cercle ajouté");
  }, [getCanvas, canvasSize, activeColor, saveToHistory]);

  // Handle logo upload
  const handleLogoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const canvas = getCanvas();
    if (!canvas || !e.target.files?.[0]) return;

    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      FabricImage.fromURL(dataUrl).then((img) => {
        const maxSize = Math.min(canvasSize.width, canvasSize.height) * 0.3;
        const scale = Math.min(maxSize / img.width!, maxSize / img.height!);
        img.scale(scale);
        img.set({ left: 20, top: 20 });
        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.renderAll();
        saveToHistory();
        setActiveTool("select");
        toast.success("Image ajoutée");
      }).catch(() => {
        toast.error("Erreur lors du chargement de l'image");
      });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }, [getCanvas, canvasSize, saveToHistory]);

  // Delete selected object
  const deleteSelected = useCallback(() => {
    const canvas = getCanvas();
    if (!canvas) return;
    
    const activeObjects = canvas.getActiveObjects();
    if (activeObjects.length > 0) {
      activeObjects.forEach((obj) => canvas.remove(obj));
      canvas.discardActiveObject();
      canvas.renderAll();
      saveToHistory();
      toast.success("Élément(s) supprimé(s)");
    } else {
      toast.info("Sélectionnez un élément à supprimer");
    }
  }, [getCanvas, saveToHistory]);

  // Apply color to selected object
  const applyColorToSelected = useCallback((color: string) => {
    const canvas = getCanvas();
    if (!canvas) return;
    
    const activeObject = canvas.getActiveObject();
    if (activeObject) {
      activeObject.set("fill", color);
      canvas.renderAll();
      saveToHistory();
    }
    setActiveColor(color);
  }, [getCanvas, saveToHistory]);

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    const canvas = getCanvas();
    if (!canvas) return;
    const newZoom = Math.min(zoom * 1.2, 3);
    canvas.setZoom(newZoom);
    setZoom(newZoom);
  }, [getCanvas, zoom]);

  const handleZoomOut = useCallback(() => {
    const canvas = getCanvas();
    if (!canvas) return;
    const newZoom = Math.max(zoom / 1.2, 0.5);
    canvas.setZoom(newZoom);
    setZoom(newZoom);
  }, [getCanvas, zoom]);

  const handleResetZoom = useCallback(() => {
    const canvas = getCanvas();
    if (!canvas) return;
    canvas.setZoom(1);
    setZoom(1);
  }, [getCanvas]);

  // Export canvas
  const handleSave = useCallback(() => {
    const canvas = getCanvas();
    if (!canvas) return;

    const currentZoom = canvas.getZoom();
    canvas.setZoom(1);

    const dataUrl = canvas.toDataURL({
      format: "png",
      quality: 1,
      multiplier: 2,
    });

    canvas.setZoom(currentZoom);
    onSave(dataUrl);
    toast.success("Image sauvegardée avec succès!");
  }, [getCanvas, onSave]);

  // Download canvas
  const handleDownload = useCallback(() => {
    const canvas = getCanvas();
    if (!canvas) return;

    const currentZoom = canvas.getZoom();
    canvas.setZoom(1);

    const dataUrl = canvas.toDataURL({
      format: "png",
      quality: 1,
      multiplier: 2,
    });

    canvas.setZoom(currentZoom);

    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `affiche-editee-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("Image téléchargée!");
  }, [getCanvas]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const canvas = getCanvas();
      if (!canvas) return;

      if (e.key === "Delete" || e.key === "Backspace") {
        const activeObject = canvas.getActiveObject();
        if (activeObject && !(activeObject instanceof IText && (activeObject as IText).isEditing)) {
          e.preventDefault();
          deleteSelected();
        }
      }
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "z") {
          e.preventDefault();
          if (e.shiftKey) {
            handleRedo();
          } else {
            handleUndo();
          }
        }
        if (e.key === "y") {
          e.preventDefault();
          handleRedo();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [getCanvas, deleteSelected, handleUndo, handleRedo]);

  // Save history on object modification
  useEffect(() => {
    const canvas = getCanvas();
    if (!canvas || !isReady) return;

    const handleObjectModified = () => saveToHistory();
    canvas.on("object:modified", handleObjectModified);

    return () => {
      canvas.off("object:modified", handleObjectModified);
    };
  }, [getCanvas, isReady, saveToHistory]);

  return (
    <div className="fixed inset-0 bg-background/98 backdrop-blur-md z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border/30 bg-card/80 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-display font-semibold gradient-text">
            Éditeur visuel
          </h2>
          <div className="flex items-center gap-1 bg-muted/30 rounded-lg p-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleUndo}
              disabled={historyIndex <= 0 || !isReady}
              className="h-8 w-8 p-0 hover:bg-muted/50"
              title="Annuler (Ctrl+Z)"
            >
              <Undo className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1 || !isReady}
              className="h-8 w-8 p-0 hover:bg-muted/50"
              title="Rétablir (Ctrl+Y)"
            >
              <Redo className="w-4 h-4" />
            </Button>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-muted/30 rounded-lg p-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleZoomOut}
              disabled={zoom <= 0.5 || !isReady}
              className="h-8 w-8 p-0 hover:bg-muted/50"
              title="Zoom arrière"
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-xs text-muted-foreground min-w-[3rem] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleZoomIn}
              disabled={zoom >= 3 || !isReady}
              className="h-8 w-8 p-0 hover:bg-muted/50"
              title="Zoom avant"
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetZoom}
              disabled={!isReady}
              className="h-8 w-8 p-0 hover:bg-muted/50"
              title="Réinitialiser le zoom"
            >
              <RotateCcw className="w-3 h-3" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            disabled={!isReady}
            className="border-border/50 hover:bg-accent/10"
          >
            <Download className="w-4 h-4 mr-2" />
            Télécharger
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!isReady}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Save className="w-4 h-4 mr-2" />
            Sauvegarder
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="hover:bg-destructive/10 hover:text-destructive"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Text Extraction Progress bar */}
      {isTextExtracting && (
        <div className="px-4 py-2 bg-primary/10 border-b border-primary/20">
          <div className="flex items-center gap-3">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span className="text-sm text-primary">Extraction du texte avec l'IA... {extractProgress}%</span>
            <Progress value={extractProgress} className="flex-1 h-2" />
          </div>
        </div>
      )}

      {/* Main editor area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Toolbar */}
        <div className="w-16 border-r border-border/30 bg-card/50 p-2 flex flex-col gap-1.5">
          <Button
            variant={activeTool === "select" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setActiveTool("select")}
            disabled={!isReady}
            className="w-12 h-10"
            title="Sélectionner (V)"
          >
            <Move className="w-4 h-4" />
          </Button>

          <div className="h-px bg-border/30 my-1" />

          {/* AI Text Extraction Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleTextExtraction}
            disabled={!isReady || isTextExtracting}
            className="w-12 h-10 bg-primary/10 hover:bg-primary/20 text-primary"
            title="Scanner le texte avec l'IA"
          >
            {isTextExtracting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ScanText className="w-4 h-4" />
            )}
          </Button>

          <div className="h-px bg-border/30 my-1" />

          <Button
            variant={activeTool === "text" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => {
              setActiveTool("text");
              addText();
            }}
            disabled={!isReady}
            className="w-12 h-10"
            title="Ajouter du texte (T)"
          >
            <Type className="w-4 h-4" />
          </Button>
          <Button
            variant={activeTool === "rectangle" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => {
              setActiveTool("rectangle");
              addRectangle();
            }}
            disabled={!isReady}
            className="w-12 h-10"
            title="Ajouter un rectangle (R)"
          >
            <Square className="w-4 h-4" />
          </Button>
          <Button
            variant={activeTool === "circle" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => {
              setActiveTool("circle");
              addCircle();
            }}
            disabled={!isReady}
            className="w-12 h-10"
            title="Ajouter un cercle (C)"
          >
            <CircleIcon className="w-4 h-4" />
          </Button>
          <Button
            variant={activeTool === "image" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={!isReady}
            className="w-12 h-10"
            title="Ajouter une image/logo (I)"
          >
            <ImageIcon className="w-4 h-4" />
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleLogoUpload}
            className="hidden"
          />

          <div className="h-px bg-border/30 my-1" />

          {/* Font picker */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                disabled={!isReady}
                className="w-12 h-10 px-1 text-[10px]"
                title="Police"
              >
                <span className="truncate">Aa</span>
                <ChevronDown className="w-3 h-3 ml-0.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="start" className="w-48">
              {FONTS.map((font) => (
                <DropdownMenuItem
                  key={font.value}
                  onClick={() => applyFontToSelected(font)}
                  className={cn(
                    "cursor-pointer",
                    activeFont.value === font.value && "bg-primary/10"
                  )}
                  style={{ fontFamily: font.value }}
                >
                  {font.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex-1" />

          {/* Color picker */}
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowColorPicker(!showColorPicker)}
              disabled={!isReady}
              className="w-12 h-10"
              title="Couleurs"
            >
              <div
                className="w-6 h-6 rounded-full border-2 border-border shadow-inner"
                style={{ backgroundColor: activeColor }}
              />
            </Button>

            {showColorPicker && (
              <div className="absolute left-full ml-2 bottom-0 bg-card border border-border rounded-lg p-3 shadow-xl z-50 min-w-[180px]">
                <p className="text-xs text-muted-foreground mb-2 font-medium">Palette de couleurs</p>
                <div className="grid grid-cols-5 gap-1.5">
                  {COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => {
                        applyColorToSelected(color);
                        setShowColorPicker(false);
                      }}
                      className={cn(
                        "w-7 h-7 rounded-md border-2 transition-all hover:scale-110",
                        activeColor === color ? "border-primary ring-2 ring-primary/30" : "border-transparent hover:border-muted"
                      )}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="h-px bg-border/30 my-1" />

          <Button
            variant="ghost"
            size="icon"
            onClick={deleteSelected}
            disabled={!isReady}
            className="w-12 h-10 hover:bg-destructive/10 hover:text-destructive"
            title="Supprimer (Suppr)"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>

        {/* Canvas area */}
        <div
          ref={containerRef}
          className="flex-1 flex items-center justify-center p-4 bg-gradient-to-br from-background/50 to-muted/20 overflow-auto"
        >
          {loadingState === "loading" && (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-muted-foreground">Chargement de l'éditeur...</p>
              <p className="text-xs text-muted-foreground/60">Préparation de votre image...</p>
            </div>
          )}

          {loadingState === "error" && (
            <div className="text-center space-y-4 max-w-md">
              <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="w-8 h-8 text-destructive" />
              </div>
              <p className="text-destructive font-medium">Impossible de charger l'image</p>
              <p className="text-sm text-muted-foreground">{errorMessage}</p>
              <div className="flex gap-2 justify-center">
                <Button
                  onClick={initializeEditor}
                  variant="default"
                  size="sm"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Réessayer
                </Button>
                <Button onClick={onClose} variant="outline" size="sm">
                  Fermer
                </Button>
              </div>
            </div>
          )}

          <div
            className={cn(
              "relative shadow-2xl rounded-lg overflow-hidden ring-1 ring-border/20",
              loadingState !== "ready" && "hidden"
            )}
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: "center center"
            }}
          >
            <canvas ref={canvasRef} />
          </div>
        </div>
      </div>

      {/* Footer tips */}
      <div className="p-2.5 border-t border-border/30 bg-card/50 text-center text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-3 flex-wrap justify-center">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-primary/20 text-primary rounded text-[10px]">OCR</kbd>
            <span>scanner texte</span>
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Double-clic</kbd>
            <span>éditer texte</span>
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Suppr</kbd>
            <span>effacer</span>
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Ctrl+Z</kbd>
            <span>annuler</span>
          </span>
          <span>•</span>
          <span>Glissez pour déplacer/redimensionner</span>
        </span>
      </div>
    </div>
  );
}
