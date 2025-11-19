import { cn } from "@/lib/utils";

interface MascotProps {
  className?: string;
  animate?: boolean;
}

export function Mascot({ className, animate = true }: MascotProps) {
  return (
    <div className={cn("relative select-none", className)}>
      <img
        src="/crocodile-mascot.png"
        alt="Smappy the Crocodile"
        className={cn(
          "w-full h-full object-contain drop-shadow-xl",
          animate && "animate-float",
        )}
      />
    </div>
  );
}
