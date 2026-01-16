import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "@/lib/utils";

interface CLTVSliderProps {
  value: number;
  onChange: (value: number[]) => void;
  className?: string;
}

// CLTV color helper: green < 75%, yellow 75-79.9%, red >= 80%
const getCLTVColorClass = (cltv: number) => {
  if (cltv >= 80) {
    return 'bg-destructive text-destructive-foreground';
  } else if (cltv >= 75) {
    return 'bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))]';
  }
  return 'bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]';
};

const CLTVSlider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  CLTVSliderProps
>(({ value, onChange, className }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    value={[value]}
    onValueChange={onChange}
    max={100}
    min={0}
    step={0.5}
    className={cn("relative flex w-full touch-none select-none items-center", className)}
  >
    <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-background border border-border">
      <SliderPrimitive.Range className="absolute h-full bg-accent" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="block cursor-grab active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background disabled:pointer-events-none disabled:opacity-50">
      <span 
        className={cn(
          "flex items-center justify-center rounded-full px-2 py-1 text-sm font-bold shadow-md transition-colors",
          getCLTVColorClass(value)
        )}
      >
        {value.toFixed(1)}%
      </span>
    </SliderPrimitive.Thumb>
  </SliderPrimitive.Root>
));
CLTVSlider.displayName = "CLTVSlider";

export { CLTVSlider };
