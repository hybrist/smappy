import mascotImage from "@assets/generated_images/Flat_vector_crocodile_mascot_for_dev_tool_9d63dcf4.png";
import { cn } from "@/lib/utils";

interface MascotProps {
  className?: string;
  animate?: boolean;
}

export function Mascot({ className, animate = true }: MascotProps) {
  return (
    <div className={cn("relative select-none", className)}>
      <img
        src={mascotImage}
        alt="Smappy the Crocodile"
        className={cn(
          "w-full h-full object-contain drop-shadow-xl",
          animate && "animate-float" // We'll need to add this keyframe if not in tw-animate-css
        )}
      />
    </div>
  );
}
