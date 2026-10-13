import React from "react";
import { PackageOpen } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = <PackageOpen className="w-12 h-12 text-[#B7B7B7]" />,
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 bg-white rounded-2xl border border-dashed border-[#DADADA] my-6">
      <div className="p-4 bg-[#FAE2F0]/50 rounded-full mb-3">{icon}</div>
      <h3 className="text-lg font-bold text-[#111111] mb-1 font-rubik">{title}</h3>
      {description && <p className="text-sm text-[#B7B7B7] max-w-sm mb-4">{description}</p>}
      {actionLabel && onAction && (
        <Button variant="secondary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
