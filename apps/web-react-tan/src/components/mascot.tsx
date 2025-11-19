import { cn } from "@/lib/utils"

interface MascotProps {
  className?: string
  animate?: boolean
}

export function Mascot({ className, animate = true }: MascotProps) {
  return (
    <div className={cn("relative select-none", className)}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 200 200"
        className={cn(
          "w-full h-full object-contain drop-shadow-xl",
          animate && "animate-float"
        )}
      >
        <circle cx="100" cy="100" r="80" fill="hsl(var(--primary))" opacity="0.2" />
        <ellipse cx="100" cy="120" rx="60" ry="50" fill="hsl(var(--primary))" />
        <circle cx="80" cy="110" r="8" fill="white" />
        <circle cx="120" cy="110" r="8" fill="white" />
        <circle cx="82" cy="108" r="4" fill="black" />
        <circle cx="122" cy="108" r="4" fill="black" />
        <path d="M 80 130 Q 100 145 120 130" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" />
      </svg>
    </div>
  )
}

