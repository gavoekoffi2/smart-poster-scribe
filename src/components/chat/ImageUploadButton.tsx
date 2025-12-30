import { useRef, forwardRef } from "react";
import { Button } from "@/components/ui/button";
import { ImagePlus } from "lucide-react";

interface ImageUploadButtonProps {
  onImageSelect: (imageDataUrl: string) => void;
  disabled?: boolean;
  label?: string;
}

export const ImageUploadButton = forwardRef<HTMLButtonElement, ImageUploadButtonProps>(
  function ImageUploadButton({ onImageSelect, disabled, label = "Envoyer une image" }, ref) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      onImageSelect(result);
    };
    reader.readAsDataURL(file);

    // Reset input
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled}
      />
      <Button
        ref={ref}
        variant="outline"
        size="sm"
        onClick={handleClick}
        disabled={disabled}
        className="gap-2"
      >
        <ImagePlus className="w-4 h-4" />
        {label}
      </Button>
    </>
  );
});
