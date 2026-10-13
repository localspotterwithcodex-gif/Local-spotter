import React from "react";

export const ActionError: React.FC<{ message?: string }> = ({ message }) =>
  message ? (
    <div role="alert" className="bg-[#F2D9DE] text-[#ED4C5C] text-xs font-bold rounded-2xl px-4 py-3">
      {message}
    </div>
  ) : null;
