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
  Palette,
  X,
  Save,
  Layers,
  Move,
  ZoomIn,
  ZoomOut,
  RotateCw
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface VisualEditorProps {
  imageUrl: string;
  onClose: () => void;
  onSave: (editedImageUrl: string) => void;
}

type Tool = "select" | "text" | "rectangle" | "circle" | "image";

const COLORS = [
  "#000000", "#FFFFFF", "#FF0000", "#00FF00", "#0000FF",
  "#FFFF00", "#FF00FF", "#00FFFF", "#D4AF37", "#F97316",
  "#8B5CF6", "#EC4899", "#10B981", "#3B82F6", "#EF4444"
];

export function VisualEditor({ imageUrl, onClose, onSave }: VisualEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [activeTool, setActiveTool] = useState<Tool>("select");
  const [activeColor, setActiveColor] = useState("#000000");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(true);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize canvas with background image
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const maxWidth = Math.min(container.clientWidth - 40, 800);
    const maxHeight = Math.min(container.clientHeight - 100, 600);

    // Load image to get dimensions
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const aspectRatio = img.width / img.height;
      let width = maxWidth;
      let height = width / aspectRatio;
      
      if (height > maxHeight) {
        height = maxHeight;
        width = height * aspectRatio;
      }

      setCanvasSize({ width, height });

      const canvas = new FabricCanvas(canvasRef.current!, {
        width,
        height,
        backgroundColor: "#1a1a2e",
        selection: true,
        preserveObjectStacking: true,
      });

      // Load background image
      FabricImage.fromURL(imageUrl, { crossOrigin: "anonymous" }).then((fabricImg) => {
        fabricImg.scaleToWidth(width);
        fabricImg.scaleToHeight(height);
        canvas.backgroundImage = fabricImg;
        canvas.renderAll();
        setIsLoading(false);
        saveToHistory(canvas);
      }).catch((err) => {
        console.error("Error loading image:", err);
        toast.error("Erreur lors du chargement de l'image");
        setIsLoading(false);
      });

      setFabricCanvas(canvas);

      return () => {
        canvas.dispose();
      };
    };
    img.onerror = () => {
      toast.error("Impossible de charger l'image");
      setIsLoading(false);
    };
    img.src = imageUrl;
  }, [imageUrl]);

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
      fontFamily: "Inter, sans-serif",
      fontWeight: "bold",
      shadow: new Shadow({ color: "rgba(0,0,0,0.5)", blur: 4, offsetX: 2, offsetY: 2 }),
    });
    fabricCanvas.add(text);
    fabricCanvas.setActiveObject(text);
    fabricCanvas.renderAll();
    saveToHistory(fabricCanvas);
    setActiveTool("select");
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
  };

  // Handle logo upload
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!fabricCanvas || !e.target.files?.[0]) return;
    
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      FabricImage.fromURL(dataUrl).then((img) => {
        img.scaleToWidth(100);
        img.set({
          left: 20,
          top: 20,
        });
        fabricCanvas.add(img);
        fabricCanvas.setActiveObject(img);
        fabricCanvas.renderAll();
        saveToHistory(fabricCanvas);
        setActiveTool("select");
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

  // Export canvas
  const handleSave = () => {
    if (!fabricCanvas) return;
    
    // Create high-resolution export
    const multiplier = 2;
    const dataUrl = fabricCanvas.toDataURL({
      format: "png",
      quality: 1,
      multiplier,
    });
    
    onSave(dataUrl);
    toast.success("Image sauvegardée avec succès!");
  };

  // Download canvas
  const handleDownload = () => {
    if (!fabricCanvas) return;
    
    const multiplier = 2;
    const dataUrl = fabricCanvas.toDataURL({
      format: "png",
      quality: 1,
      multiplier,
    });
    
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
    fabricCanvas.on("object:added", handleObjectModified);
    
    return () => {
      fabricCanvas.off("object:modified", handleObjectModified);
      fabricCanvas.off("object:added", handleObjectModified);
    };
  }, [fabricCanvas, saveToHistory]);

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/30 bg-card/50">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-display font-semibold gradient-text">
            Éditeur visuel
          </h2>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className="hover:bg-muted/50"
            >
              <Undo className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              className="hover:bg-muted/50"
            >
              <Redo className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            className="border-border/50"
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
        <div className="w-16 border-r border-border/30 bg-card/30 p-2 flex flex-col gap-2">
          <Button
            variant={activeTool === "select" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setActiveTool("select")}
            className="w-full"
            title="Sélectionner"
          >
            <Move className="w-4 h-4" />
          </Button>
          <Button
            variant={activeTool === "text" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => {
              setActiveTool("text");
              addText();
            }}
            className="w-full"
            title="Ajouter du texte"
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
            className="w-full"
            title="Ajouter un rectangle"
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
            className="w-full"
            title="Ajouter un cercle"
          >
            <CircleIcon className="w-4 h-4" />
          </Button>
          <Button
            variant={activeTool === "image" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            className="w-full"
            title="Ajouter un logo/image"
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
          
          <div className="flex-1" />
          
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="w-full"
              title="Couleurs"
            >
              <div 
                className="w-6 h-6 rounded-full border-2 border-border"
                style={{ backgroundColor: activeColor }}
              />
            </Button>
            
            {showColorPicker && (
              <div className="absolute left-full ml-2 bottom-0 bg-card border border-border rounded-lg p-2 shadow-xl z-50">
                <div className="grid grid-cols-5 gap-1">
                  {COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => {
                        applyColorToSelected(color);
                        setShowColorPicker(false);
                      }}
                      className={cn(
                        "w-8 h-8 rounded-md border-2 transition-all",
                        activeColor === color ? "border-primary scale-110" : "border-transparent hover:scale-105"
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={deleteSelected}
            className="w-full hover:bg-destructive/10 hover:text-destructive"
            title="Supprimer l'élément sélectionné"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>

        {/* Canvas area */}
        <div 
          ref={containerRef}
          className="flex-1 flex items-center justify-center p-4 bg-background/50 overflow-auto"
        >
          {isLoading ? (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-muted-foreground">Chargement de l'éditeur...</p>
            </div>
          ) : (
            <div className="relative shadow-2xl rounded-lg overflow-hidden">
              <canvas ref={canvasRef} />
            </div>
          )}
        </div>
      </div>

      {/* Footer tips */}
      <div className="p-3 border-t border-border/30 bg-card/30 text-center text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-4">
          <span>Double-cliquez sur le texte pour l'éditer</span>
          <span>•</span>
          <span>Suppr pour effacer</span>
          <span>•</span>
          <span>Ctrl+Z pour annuler</span>
          <span>•</span>
          <span>Glissez pour déplacer</span>
        </span>
      </div>
    </div>
  );
}
