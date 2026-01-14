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
  ChevronDown
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

export function VisualEditor({ imageUrl, onClose, onSave }: VisualEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [activeTool, setActiveTool] = useState<Tool>("select");
  const [activeColor, setActiveColor] = useState("#FFFFFF");
  const [activeFont, setActiveFont] = useState(FONTS[0]);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [zoom, setZoom] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initAttemptRef = useRef(0);
  const isInitializedRef = useRef(false);

  // Resolve image URL to handle different formats
  const resolveImageUrl = useCallback((url: string): string => {
    if (!url) return "";
    
    // If it's already a data URL, return as is
    if (url.startsWith("data:")) return url;
    
    // If it's a blob URL, return as is
    if (url.startsWith("blob:")) return url;
    
    // If it's an absolute URL, return as is
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return url;
    }
    
    // Handle relative paths
    return url;
  }, []);

  // Load image with multiple fallback strategies for CORS issues
  const loadImageWithFallback = useCallback(async (url: string): Promise<HTMLImageElement> => {
    const resolvedUrl = resolveImageUrl(url);
    
    // Strategy 1: Try direct load with crossOrigin
    const tryLoadWithCors = (): Promise<HTMLImageElement> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("CORS failed"));
        img.src = resolvedUrl;
      });
    };
    
    // Strategy 2: Try without crossOrigin
    const tryLoadWithoutCors = (): Promise<HTMLImageElement> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Direct load failed"));
        img.src = resolvedUrl;
      });
    };
    
    // Strategy 3: Fetch and convert to blob URL (bypasses some CORS issues)
    const tryFetchAsBlob = async (): Promise<HTMLImageElement> => {
      const response = await fetch(resolvedUrl, { mode: 'cors' });
      if (!response.ok) throw new Error("Fetch failed");
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          // Clean up blob URL after image is loaded
          setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
          resolve(img);
        };
        img.onerror = () => {
          URL.revokeObjectURL(blobUrl);
          reject(new Error("Blob load failed"));
        };
        img.src = blobUrl;
      });
    };
    
    // Strategy 4: Fetch without CORS mode (for same-origin)
    const tryFetchNoCors = async (): Promise<HTMLImageElement> => {
      const response = await fetch(resolvedUrl);
      if (!response.ok) throw new Error("No-cors fetch failed");
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
          resolve(img);
        };
        img.onerror = () => {
          URL.revokeObjectURL(blobUrl);
          reject(new Error("No-cors blob load failed"));
        };
        img.src = blobUrl;
      });
    };
    
    // Try all strategies in sequence with timeout
    const strategies = [
      { name: "CORS", fn: tryLoadWithCors },
      { name: "Direct", fn: tryLoadWithoutCors },
      { name: "Fetch Blob", fn: tryFetchAsBlob },
      { name: "No-CORS Fetch", fn: tryFetchNoCors },
    ];
    
    for (const strategy of strategies) {
      try {
        console.log(`Trying image load strategy: ${strategy.name}`);
        const result = await Promise.race([
          strategy.fn(),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error(`${strategy.name} timeout`)), 5000)
          ),
        ]);
        console.log(`Image loaded successfully with: ${strategy.name}`);
        return result;
      } catch (err) {
        console.warn(`Strategy ${strategy.name} failed:`, err);
        continue;
      }
    }
    
    throw new Error("All image loading strategies failed");
  }, [resolveImageUrl]);

  // Initialize canvas with background image
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;
    
    // Prevent multiple simultaneous init attempts
    initAttemptRef.current += 1;
    const currentAttempt = initAttemptRef.current;
    
    const container = containerRef.current;
    let canvas: FabricCanvas | null = null;
    
    // Wait for container to have dimensions
    const initCanvas = async () => {
      try {
        // Check if this attempt is still valid
        if (currentAttempt !== initAttemptRef.current) return;
        
        // Get container dimensions
        const containerRect = container.getBoundingClientRect();
        const maxWidth = Math.min(containerRect.width - 40, 1200);
        const maxHeight = Math.min(containerRect.height - 40, 800);
        
        if (maxWidth <= 0 || maxHeight <= 0) {
          // Container not ready yet, retry up to 20 times
          if (currentAttempt < 20) {
            setTimeout(initCanvas, 100);
          } else {
            setLoadError("Le conteneur n'a pas pu être initialisé");
            setIsLoading(false);
          }
          return;
        }

        console.log("Loading image for editor:", imageUrl);
        
        // Load the image with all fallback strategies
        const img = await loadImageWithFallback(imageUrl);
        
        // Check if this attempt is still valid
        if (currentAttempt !== initAttemptRef.current) return;
        
        console.log("Image loaded, dimensions:", img.width, "x", img.height);
        
        const aspectRatio = img.width / img.height;
        let width = maxWidth;
        let height = width / aspectRatio;
        
        if (height > maxHeight) {
          height = maxHeight;
          width = height * aspectRatio;
        }
        
        // Ensure minimum size
        width = Math.max(width, 400);
        height = Math.max(height, 300);

        setCanvasSize({ width, height });

        // Create canvas
        canvas = new FabricCanvas(canvasRef.current!, {
          width,
          height,
          backgroundColor: "#1a1a2e",
          selection: true,
          preserveObjectStacking: true,
        });

        // Set background from loaded image
        try {
          const fabricImg = new FabricImage(img);
          fabricImg.scaleToWidth(width);
          fabricImg.scaleToHeight(height);
          canvas.backgroundImage = fabricImg;
          canvas.renderAll();
          console.log("Background image set successfully");
        } catch (bgError) {
          console.error("Failed to set background:", bgError);
          toast.info("Image chargée sans arrière-plan - vous pouvez ajouter des éléments");
        }

        setFabricCanvas(canvas);
        setIsLoading(false);
        
        // Save initial state
        const json = JSON.stringify(canvas.toJSON());
        setHistory([json]);
        setHistoryIndex(0);
        
        toast.success("Éditeur prêt !");
        
      } catch (err) {
        console.error("Error initializing editor:", err);
        if (currentAttempt === initAttemptRef.current) {
          setLoadError("Impossible de charger l'image. L'URL est peut-être inaccessible ou expirée.");
          setIsLoading(false);
          toast.error("Erreur de chargement de l'image");
        }
      }
    };
    
    initCanvas();
    
    return () => {
      if (canvas) {
        canvas.dispose();
      }
    };
  }, [imageUrl, loadImageWithFallback]);

  // Save to history
  const saveToHistory = useCallback((canvas: FabricCanvas) => {
    const json = JSON.stringify(canvas.toJSON());
    setHistory(prev => {
      const newHistory = [...prev.slice(0, historyIndex + 1), json];
      setHistoryIndex(newHistory.length - 1);
      return newHistory;
    });
  }, [historyIndex]);

  // Undo
  const handleUndo = useCallback(() => {
    if (!fabricCanvas || historyIndex <= 0) return;
    const newIndex = historyIndex - 1;
    fabricCanvas.loadFromJSON(JSON.parse(history[newIndex])).then(() => {
      fabricCanvas.renderAll();
      setHistoryIndex(newIndex);
    });
  }, [fabricCanvas, history, historyIndex]);

  // Redo
  const handleRedo = useCallback(() => {
    if (!fabricCanvas || historyIndex >= history.length - 1) return;
    const newIndex = historyIndex + 1;
    fabricCanvas.loadFromJSON(JSON.parse(history[newIndex])).then(() => {
      fabricCanvas.renderAll();
      setHistoryIndex(newIndex);
    });
  }, [fabricCanvas, history, historyIndex]);

  // Add text
  const addText = () => {
    if (!fabricCanvas) return;
    const text = new IText("Votre texte ici", {
      left: canvasSize.width / 2 - 80,
      top: canvasSize.height / 2 - 20,
      fontSize: 32,
      fill: activeColor,
      fontFamily: activeFont.value,
      fontWeight: "bold",
      shadow: new Shadow({ color: "rgba(0,0,0,0.5)", blur: 4, offsetX: 2, offsetY: 2 }),
    });
    fabricCanvas.add(text);
    fabricCanvas.setActiveObject(text);
    fabricCanvas.renderAll();
    saveToHistory(fabricCanvas);
    setActiveTool("select");
    toast.success("Texte ajouté - Double-cliquez pour éditer");
  };

  // Apply font to selected text
  const applyFontToSelected = (font: typeof FONTS[0]) => {
    if (!fabricCanvas) return;
    const activeObject = fabricCanvas.getActiveObject();
    if (activeObject && activeObject instanceof IText) {
      activeObject.set("fontFamily", font.value);
      fabricCanvas.renderAll();
      saveToHistory(fabricCanvas);
    }
    setActiveFont(font);
  };

  // Add rectangle
  const addRectangle = () => {
    if (!fabricCanvas) return;
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
    fabricCanvas.add(rect);
    fabricCanvas.setActiveObject(rect);
    fabricCanvas.renderAll();
    saveToHistory(fabricCanvas);
    setActiveTool("select");
    toast.success("Rectangle ajouté");
  };

  // Add circle
  const addCircle = () => {
    if (!fabricCanvas) return;
    const circle = new Circle({
      left: canvasSize.width / 2 - 50,
      top: canvasSize.height / 2 - 50,
      radius: 50,
      fill: activeColor,
      opacity: 0.8,
    });
    fabricCanvas.add(circle);
    fabricCanvas.setActiveObject(circle);
    fabricCanvas.renderAll();
    saveToHistory(fabricCanvas);
    setActiveTool("select");
    toast.success("Cercle ajouté");
  };

  // Handle logo upload
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!fabricCanvas || !e.target.files?.[0]) return;
    
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      FabricImage.fromURL(dataUrl).then((img) => {
        // Scale to reasonable size
        const maxSize = Math.min(canvasSize.width, canvasSize.height) * 0.3;
        const scale = Math.min(maxSize / img.width!, maxSize / img.height!);
        img.scale(scale);
        img.set({
          left: 20,
          top: 20,
        });
        fabricCanvas.add(img);
        fabricCanvas.setActiveObject(img);
        fabricCanvas.renderAll();
        saveToHistory(fabricCanvas);
        setActiveTool("select");
        toast.success("Image ajoutée");
      }).catch(() => {
        toast.error("Erreur lors du chargement de l'image");
      });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Delete selected object
  const deleteSelected = () => {
    if (!fabricCanvas) return;
    const activeObjects = fabricCanvas.getActiveObjects();
    if (activeObjects.length > 0) {
      activeObjects.forEach((obj) => fabricCanvas.remove(obj));
      fabricCanvas.discardActiveObject();
      fabricCanvas.renderAll();
      saveToHistory(fabricCanvas);
      toast.success("Élément(s) supprimé(s)");
    } else {
      toast.info("Sélectionnez un élément à supprimer");
    }
  };

  // Apply color to selected object
  const applyColorToSelected = (color: string) => {
    if (!fabricCanvas) return;
    const activeObject = fabricCanvas.getActiveObject();
    if (activeObject) {
      activeObject.set("fill", color);
      fabricCanvas.renderAll();
      saveToHistory(fabricCanvas);
    }
    setActiveColor(color);
  };

  // Zoom controls
  const handleZoomIn = () => {
    if (!fabricCanvas) return;
    const newZoom = Math.min(zoom * 1.2, 3);
    fabricCanvas.setZoom(newZoom);
    setZoom(newZoom);
  };

  const handleZoomOut = () => {
    if (!fabricCanvas) return;
    const newZoom = Math.max(zoom / 1.2, 0.5);
    fabricCanvas.setZoom(newZoom);
    setZoom(newZoom);
  };

  const handleResetZoom = () => {
    if (!fabricCanvas) return;
    fabricCanvas.setZoom(1);
    setZoom(1);
  };

  // Export canvas
  const handleSave = () => {
    if (!fabricCanvas) return;
    
    // Reset zoom for export
    const currentZoom = fabricCanvas.getZoom();
    fabricCanvas.setZoom(1);
    
    // Create high-resolution export
    const multiplier = 2;
    const dataUrl = fabricCanvas.toDataURL({
      format: "png",
      quality: 1,
      multiplier,
    });
    
    // Restore zoom
    fabricCanvas.setZoom(currentZoom);
    
    onSave(dataUrl);
    toast.success("Image sauvegardée avec succès!");
  };

  // Download canvas
  const handleDownload = () => {
    if (!fabricCanvas) return;
    
    // Reset zoom for export
    const currentZoom = fabricCanvas.getZoom();
    fabricCanvas.setZoom(1);
    
    const multiplier = 2;
    const dataUrl = fabricCanvas.toDataURL({
      format: "png",
      quality: 1,
      multiplier,
    });
    
    // Restore zoom
    fabricCanvas.setZoom(currentZoom);
    
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `affiche-editee-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("Image téléchargée!");
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        // Only delete if not editing text
        const activeObject = fabricCanvas?.getActiveObject();
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
  }, [fabricCanvas, handleUndo, handleRedo]);

  // Save history on object modification
  useEffect(() => {
    if (!fabricCanvas) return;

    const handleObjectModified = () => {
      saveToHistory(fabricCanvas);
    };

    fabricCanvas.on("object:modified", handleObjectModified);
    
    return () => {
      fabricCanvas.off("object:modified", handleObjectModified);
    };
  }, [fabricCanvas, saveToHistory]);

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
              disabled={historyIndex <= 0}
              className="h-8 w-8 p-0 hover:bg-muted/50"
              title="Annuler (Ctrl+Z)"
            >
              <Undo className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
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
              disabled={zoom <= 0.5}
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
              disabled={zoom >= 3}
              className="h-8 w-8 p-0 hover:bg-muted/50"
              title="Zoom avant"
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetZoom}
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
            className="border-border/50 hover:bg-accent/10"
          >
            <Download className="w-4 h-4 mr-2" />
            Télécharger
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
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

      {/* Main editor area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Toolbar */}
        <div className="w-16 border-r border-border/30 bg-card/50 p-2 flex flex-col gap-1.5">
          <Button
            variant={activeTool === "select" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setActiveTool("select")}
            className="w-12 h-10"
            title="Sélectionner (V)"
          >
            <Move className="w-4 h-4" />
          </Button>
          
          <div className="h-px bg-border/30 my-1" />
          
          <Button
            variant={activeTool === "text" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => {
              setActiveTool("text");
              addText();
            }}
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
            className="w-12 h-10"
            title="Ajouter un cercle (C)"
          >
            <CircleIcon className="w-4 h-4" />
          </Button>
          <Button
            variant={activeTool === "image" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => fileInputRef.current?.click()}
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
          {isLoading ? (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-muted-foreground">Chargement de l'éditeur...</p>
              <p className="text-xs text-muted-foreground/60">Préparation de votre image...</p>
            </div>
          ) : loadError ? (
            <div className="text-center space-y-4 max-w-md">
              <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
                <X className="w-8 h-8 text-destructive" />
              </div>
              <p className="text-destructive font-medium">{loadError}</p>
              <p className="text-xs text-muted-foreground">
                Vérifiez votre connexion internet et réessayez.
              </p>
              <div className="flex gap-2 justify-center">
                <Button 
                  onClick={() => {
                    setLoadError(null);
                    setIsLoading(true);
                    initAttemptRef.current = 0;
                  }}
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
          ) : (
            <div 
              className="relative shadow-2xl rounded-lg overflow-hidden ring-1 ring-border/20"
              style={{ 
                transform: `scale(${zoom})`,
                transformOrigin: "center center"
              }}
            >
              <canvas ref={canvasRef} />
            </div>
          )}
        </div>
      </div>

      {/* Footer tips */}
      <div className="p-2.5 border-t border-border/30 bg-card/50 text-center text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-3 flex-wrap justify-center">
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
