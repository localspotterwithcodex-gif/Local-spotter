import React from "react";

export const Skeleton: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={`animate-pulse bg-[#EAEAEA] rounded-lg ${className}`} />
);

export const ProductCardSkeleton: React.FC = () => (
  <div className="bg-white rounded-xl overflow-hidden p-3 border border-[#EAEAEA] flex flex-col gap-2">
    <Skeleton className="w-full aspect-square rounded-lg" />
    <Skeleton className="h-4 w-3/4 mt-1" />
    <Skeleton className="h-4 w-1/2" />
    <div className="flex justify-between items-center mt-2">
      <Skeleton className="h-5 w-16" />
      <Skeleton className="h-4 w-10" />
    </div>
  </div>
);

export const LoadingState: React.FC<{ label?: string }> = ({ label = "Laden..." }) => (
  <div className="flex flex-col items-center justify-center p-12 text-center">
    <div className="w-10 h-10 border-4 border-[#FAE2F0] border-t-[#FA1EFF] rounded-full animate-spin mb-3"></div>
    <span className="text-sm font-medium text-[#B7B7B7]">{label}</span>
  </div>
);
