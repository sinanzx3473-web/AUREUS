/**
 * SkeletonCard - Loading placeholder for card components
 * Provides visual feedback during data fetching with Aureus styling
 */
export const SkeletonCard = () => {
  return (
    <div className="bg-white/5 border border-white/10 rounded-lg h-[200px] w-full animate-pulse">
      <div className="p-6 space-y-4">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="h-6 bg-white/10 rounded w-1/3" />
          <div className="h-5 bg-white/10 rounded-full w-16" />
        </div>
        
        {/* Content skeleton */}
        <div className="space-y-3">
          <div className="h-4 bg-white/10 rounded w-full" />
          <div className="h-4 bg-white/10 rounded w-5/6" />
          <div className="h-4 bg-white/10 rounded w-4/6" />
        </div>
        
        {/* Footer skeleton */}
        <div className="flex items-center gap-2 pt-2">
          <div className="h-8 bg-white/10 rounded w-20" />
          <div className="h-8 bg-white/10 rounded w-24" />
        </div>
      </div>
    </div>
  );
};
