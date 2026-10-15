"use client";

import React from "react";
import { useAuth } from "@/features/auth/AuthContext";
import { ConsumerLayout } from "@/layouts/ConsumerLayout";
import { OwnerLayout } from "@/layouts/OwnerLayout";

/** For pages shared by every role (chat, notifications, help): picks the shell that matches who is signed in. */
export const RoleLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { role } = useAuth();
  const Layout = role === "BUSINESS_OWNER" ? OwnerLayout : ConsumerLayout;
  return <Layout>{children}</Layout>;
};
