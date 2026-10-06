import { StarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { FIT_LABELS, type FitScore } from "@/lib/types";

export const FIT_COLORS = {
  hot: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200",
  warm: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200",
  cold: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
} as const;

export function FitBadge({ fit, className }: { fit: FitScore; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium tabular-nums",
        FIT_COLORS[fit.badge],
        className,
      )}
      title={fit.reasoning.join("\n")}
    >
      {fit.badge === "hot" && <StarIcon className="size-3 fill-current" aria-hidden />}
      {FIT_LABELS[fit.badge]} · {fit.score}
    </span>
  );
}
