import React from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = "Er is een fout opgetreden",
  message = "Gegevens konden niet worden geladen. Probeer het opnieuw.",
  onRetry,
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 bg-[#F2D9DE]/50 rounded-2xl border border-[#ED4C5C]/30 my-6">
      <AlertTriangle className="w-10 h-10 text-[#ED4C5C] mb-2" />
      <h3 className="text-base font-bold text-[#111111] mb-1 font-rubik">{title}</h3>
      <p className="text-sm text-[#555555] max-w-sm mb-4">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Opnieuw proberen
        </Button>
      )}
    </div>
  );
};
