import { Ghost } from "lucide-react";
import { Button } from "./button";

interface EmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

/**
 * EmptyState - Branded empty state component for lists and grids
 * Provides clear feedback when no data is available with optional action
 */
export const EmptyState = ({ 
  title, 
  description, 
  actionLabel, 
  onAction,
  icon 
}: EmptyStateProps) => {
  return (
    <div className="flex items-center justify-center min-h-[400px] w-full">
      <div className="bg-white/5 border border-dashed border-white/20 rounded-lg p-12 max-w-md w-full">
        <div className="flex flex-col items-center text-center space-y-4">
          {/* Icon */}
          <div className="text-gold-400/40">
            {icon || <Ghost className="h-16 w-16" strokeWidth={1.5} />}
          </div>
          
          {/* Title */}
          <h3 className="text-xl font-mono font-semibold text-white/80 tracking-wide">
            {title}
          </h3>
          
          {/* Description */}
          {description && (
            <p className="text-sm text-white/50 font-mono leading-relaxed">
              {description}
            </p>
          )}
          
          {/* Action Button */}
          {actionLabel && onAction && (
            <Button
              onClick={onAction}
              className="mt-4 bg-gold-400/10 hover:bg-gold-400/20 text-gold-400 border border-gold-400/30"
            >
              {actionLabel}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
