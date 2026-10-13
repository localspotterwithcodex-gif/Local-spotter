"use client";

import React from "react";
import { AppHeader } from "@/components/navigation/AppHeader";
import { TopNav } from "@/components/navigation/TopNav";
import { BottomNav } from "@/components/navigation/BottomNav";

export const ConsumerLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-[#F9F9F9]">
      <div className="md:hidden">
        <AppHeader />
      </div>
      <TopNav />
      
      <main className="flex-1 max-w-7xl w-full mx-auto pb-28 md:pb-12 px-4 md:px-6 pt-4">
        {children}
      </main>

      <BottomNav />
    </div>
  );
};
