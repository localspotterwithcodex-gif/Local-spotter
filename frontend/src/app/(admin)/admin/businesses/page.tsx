"use client";

import React, { useState } from "react";
import { Store, CheckCircle, XCircle, Search } from "lucide-react";
import { AdminLayout } from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { MOCK_BUSINESSES } from "@/data/mock/businesses";

export default function AdminBusinessesPage() {
  const [businesses, setBusinesses] = useState(MOCK_BUSINESSES);

  const handleApprove = (id: string) => {
    setBusinesses((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: "ACTIVE" as const } : b))
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#EAEAEA]">
          <div>
            <h1 className="text-xl font-bold font-rubik text-[#111111]">Winkels & Goedkeuring</h1>
            <p className="text-xs text-[#B7B7B7]">Beheer alle geregistreerde winkels en KVK-controles</p>
          </div>
        </div>

        {/* Business Approval List */}
        <div className="bg-white rounded-3xl border border-[#EAEAEA] shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F9F9F9] border-b border-[#EAEAEA] font-bold text-[#111111]">
                <tr>
                  <th className="p-4">Winkelnaam</th>
                  <th className="p-4">Categorie</th>
                  <th className="p-4">KVK Nummer</th>
                  <th className="p-4">Stad</th>
                  <th className="p-4">Pakket</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actie</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F9F9F9]">
                {businesses.map((b) => (
                  <tr key={b.id} className="hover:bg-[#F9F9F9]/50 transition-colors">
                    <td className="p-4 font-bold text-[#111111]">{b.name}</td>
                    <td className="p-4 text-[#555555]">{b.category}</td>
                    <td className="p-4 font-mono text-[#111111]">{b.kvkNumber}</td>
                    <td className="p-4 text-[#555555]">{b.location.city}</td>
                    <td className="p-4">
                      <span className="bg-[#FAE2F0] text-[#FA1EFF] font-bold px-2 py-0.5 rounded-full text-[10px]">
                        {b.subscriptionPlan}
                      </span>
                    </td>
                    <td className="p-4">
                      <Badge variant={b.status === "ACTIVE" ? "completed" : "processing"}>
                        {b.status}
                      </Badge>
                    </td>
                    <td className="p-4 text-right">
                      {b.status !== "ACTIVE" ? (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleApprove(b.id)}
                          className="h-7 text-[11px]"
                        >
                          Goedkeuren
                        </Button>
                      ) : (
                        <span className="text-xs text-[#3B9B52] font-bold">Goedgekeurd</span>
                      )}
                    </td>
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
