"use client";

import React from "react";
import Link from "next/link";
import {
  User,
  MapPin,
  ShoppingBag,
  Heart,
  Star,
  Bell,
  Globe,
  FileText,
  HelpCircle,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { ConsumerLayout } from "@/layouts/ConsumerLayout";
import { useAuth } from "@/features/auth/AuthContext";

export default function AccountPage() {
  const { user, logout } = useAuth();

  const menuSections = [
    {
      title: "Mijn Account",
      items: [
        { label: "Account Information", href: "/account/profile", icon: User },
        { label: "Delivery Address", href: "/account/addresses", icon: MapPin },
        { label: "Mijn Bestellingen", href: "/account/orders", icon: ShoppingBag },
        { label: "Gevolgde Winkels", href: "/account/following", icon: Heart },
        { label: "Mijn Beoordelingen", href: "/account/reviews", icon: Star },
      ],
    },
    {
      title: "Voorkeuren & Support",
      items: [
        { label: "Notifications", href: "#", icon: Bell },
        { label: "Language (Nederlands)", href: "#", icon: Globe },
        { label: "Terms & Policy", href: "#", icon: FileText },
        { label: "Help & Support", href: "#", icon: HelpCircle },
      ],
    },
  ];

  return (
    <ConsumerLayout>
      <div className="max-w-xl mx-auto space-y-6">
        {/* User Header Card */}
        <div className="bg-white p-5 rounded-3xl border border-[#EAEAEA] shadow-2xs flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-[#121F3E] text-white flex items-center justify-center font-bold text-xl shadow-xs">
            {user?.name?.charAt(0) || "U"}
          </div>
          <div>
            <h1 className="text-lg font-bold font-rubik text-[#111111]">{user?.name || "Consument"}</h1>
            <p className="text-xs text-[#B7B7B7]">{user?.email || "consument@example.nl"}</p>
          </div>
        </div>

        {/* Settings Menu List from Figma 193:691 */}
        <div className="space-y-4">
          {menuSections.map((section, idx) => (
            <div key={idx} className="bg-white rounded-3xl p-4 border border-[#EAEAEA] shadow-2xs space-y-1">
              <span className="text-[11px] font-bold text-[#B7B7B7] uppercase tracking-wider px-3 block mb-2">
                {section.title}
              </span>

              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="flex items-center justify-between p-3 rounded-2xl hover:bg-[#F9F9F9] transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-[#FAE2F0] text-[#FA1EFF] flex items-center justify-center">
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-[#111111] group-hover:text-[#FA1EFF] transition-colors">
                        {item.label}
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#B7B7B7] group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                );
              })}
            </div>
          ))}

          {/* Logout Action */}
          <button
            onClick={logout}
            className="w-full bg-white p-4 rounded-3xl border border-[#EAEAEA] shadow-2xs flex items-center justify-between text-[#ED4C5C] hover:bg-[#F2D9DE]/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#F2D9DE] text-[#ED4C5C] flex items-center justify-center">
                <LogOut className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold">Uitloggen</span>
            </div>
            <ChevronRight className="w-4 h-4 text-[#ED4C5C]" />
          </button>
        </div>
      </div>
    </ConsumerLayout>
  );
}
