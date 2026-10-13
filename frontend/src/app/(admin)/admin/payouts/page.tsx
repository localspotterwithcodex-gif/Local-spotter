"use client";

import React, { useState } from "react";
import { FileCheck, CheckCircle, XCircle } from "lucide-react";
import { AdminLayout } from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils";

interface PayoutRequest {
  id: string;
  businessName: string;
  iban: string;
  amount: number;
  status: "PENDING" | "APPROVED" | "REJECTED" | "PAID";
  date: string;
}

export default function AdminPayoutsPage() {
  const [payouts, setPayouts] = useState<PayoutRequest[]>([
    { id: "po-101", businessName: "Bag Shop Horn Center", iban: "NL91 ABNA 0417 1234 56", amount: 428.50, status: "PENDING", date: "03 mrt 2026" },
    { id: "po-102", businessName: "Delftse Ambacht & Keramiek", iban: "NL12 ING 0001 2345 67", amount: 215.00, status: "PENDING", date: "02 mrt 2026" },
    { id: "po-100", businessName: "Studio Lizzy Boutique", iban: "NL44 RABO 0300 9876 54", amount: 350.00, status: "PAID", date: "25 feb 2026" },
  ]);

  const handleApprove = (id: string) => {
    setPayouts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: "PAID" as const } : p))
    );
  };

  const handleReject = (id: string) => {
    setPayouts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: "REJECTED" as const } : p))
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="pb-2 border-b border-[#EAEAEA]">
          <h1 className="text-xl font-bold font-rubik text-[#111111]">Uitbetalingen Goedkeuren (Payouts)</h1>
          <p className="text-xs text-[#B7B7B7]">Beoordeel en keur verzochte uitbetalingen van winkeliers goed</p>
        </div>

        <div className="bg-white rounded-3xl border border-[#EAEAEA] shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F9F9F9] border-b border-[#EAEAEA] font-bold text-[#111111]">
                <tr>
                  <th className="p-4">ID</th>
                  <th className="p-4">Winkel</th>
                  <th className="p-4">IBAN</th>
                  <th className="p-4">Bedrag</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Datum</th>
                  <th className="p-4 text-right">Acties</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F9F9F9]">
                {payouts.map((p) => (
                  <tr key={p.id} className="hover:bg-[#F9F9F9]/50 transition-colors">
                    <td className="p-4 font-mono font-bold">{p.id}</td>
                    <td className="p-4 font-bold text-[#111111]">{p.businessName}</td>
                    <td className="p-4 font-mono text-[#555555]">{p.iban}</td>
                    <td className="p-4 font-extrabold text-[#111111]">{formatCurrency(p.amount)}</td>
                    <td className="p-4">
                      <Badge variant={p.status === "PAID" ? "completed" : p.status === "PENDING" ? "processing" : "cancelled"}>
                        {p.status}
                      </Badge>
                    </td>
                    <td className="p-4 text-[#B7B7B7]">{p.date}</td>
                    <td className="p-4 text-right">
                      {p.status === "PENDING" && (
                        <div className="flex justify-end gap-1.5">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleApprove(p.id)}
                            className="h-7 text-[11px] bg-[#3B9B52] hover:bg-[#2F7E42]"
                          >
                            Keur Goed & Betaal
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReject(p.id)}
                            className="h-7 text-[11px] text-[#ED4C5C]"
                          >
                            Afwijzen
                          </Button>
                        </div>
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
