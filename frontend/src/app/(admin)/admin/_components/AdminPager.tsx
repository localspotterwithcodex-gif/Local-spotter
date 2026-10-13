"use client";

import React from "react";
import { Button } from "@/components/ui/Button";
import type { PageMeta } from "@/lib/api/admin";

interface AdminPagerProps {
  meta: PageMeta;
  onOffsetChange: (offset: number) => void;
}

export const AdminPager: React.FC<AdminPagerProps> = ({ meta, onOffsetChange }) => {
  const lastPage = Math.max(1, Math.ceil(meta.total / meta.limit));
  if (lastPage <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-3 p-4 border-t border-[#EAEAEA] text-xs text-[#555555]">
      <span>
        {meta.page} / {lastPage} ({meta.total})
      </span>
      <div className="flex gap-2">
        <Button
          variant="ghost"
          size="sm"
          disabled={meta.page <= 1}
          onClick={() => onOffsetChange((meta.page - 2) * meta.limit)}
          className="h-7 text-[11px]"
        >
          Vorige
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={meta.page >= lastPage}
          onClick={() => onOffsetChange(meta.page * meta.limit)}
          className="h-7 text-[11px]"
        >
          Volgende
        </Button>
      </div>
    </div>
  );
};
