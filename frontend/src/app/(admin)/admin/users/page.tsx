"use client";

import React, { useState } from "react";
import { Users, Search, ShieldCheck } from "lucide-react";
import { AdminLayout } from "@/layouts/AdminLayout";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");

  const users = [
    { id: "u-1", name: "Sanne de Jong", email: "sanne@example.nl", role: "CONSUMER", date: "12 jan 2024" },
    { id: "u-2", name: "Karel (Bag Shop)", email: "info@bagshop-horn.nl", role: "BUSINESS_OWNER", date: "15 jan 2024" },
    { id: "u-3", name: "Admin LocalSpotter", email: "admin@localspotter.nl", role: "SUPER_ADMIN", date: "01 jan 2024" },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#EAEAEA]">
          <div>
            <h1 className="text-xl font-bold font-rubik text-[#111111]">Gebruikers Beheer</h1>
            <p className="text-xs text-[#B7B7B7]">Overzicht van alle geregistreerde consumenten en ondernemers</p>
          </div>

          <div className="w-full sm:w-64">
            <Input
              placeholder="Zoek gebruiker..."
              icon={<Search className="w-4 h-4 text-[#B7B7B7]" />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-3xl border border-[#EAEAEA] shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F9F9F9] border-b border-[#EAEAEA] font-bold text-[#111111]">
                <tr>
                  <th className="p-4">Naam</th>
                  <th className="p-4">E-mailadres</th>
                  <th className="p-4">Rol</th>
                  <th className="p-4">Geregistreerd</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F9F9F9]">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-[#F9F9F9]/50 transition-colors">
                    <td className="p-4 font-bold text-[#111111]">{u.name}</td>
                    <td className="p-4 text-[#555555]">{u.email}</td>
                    <td className="p-4">
                      <Badge variant={u.role === "SUPER_ADMIN" ? "pink" : u.role === "BUSINESS_OWNER" ? "completed" : "default"}>
                        {u.role}
                      </Badge>
                    </td>
                    <td className="p-4 text-[#B7B7B7]">{u.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
