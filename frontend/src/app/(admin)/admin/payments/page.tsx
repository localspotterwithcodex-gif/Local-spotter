"use client";

import React from "react";
import { CreditCard } from "lucide-react";
import { AdminLayout } from "@/layouts/AdminLayout";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils";

export default function AdminPaymentsPage() {
  const payments = [
    { id: "pay-1", user: "Bag Shop Horn Center", type: "Subscription (Workshop)", amount: 150.00, method: "iDEAL", status: "SUCCEEDED", date: "01 mrt 2026" },
    { id: "pay-2", user: "Sanne de Jong", type: "Order #LS-2026-1001", amount: 153.95, method: "iDEAL", status: "SUCCEEDED", date: "02 mrt 2026" },
    { id: "pay-3", user: "Studio Lizzy Boutique", type: "Subscription (Workshop)", amount: 150.00, method: "PayPal", status: "SUCCEEDED", date: "01 mrt 2026" },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="pb-2 border-b border-[#EAEAEA]">
          <h1 className="text-xl font-bold font-rubik text-[#111111]">Betalingen Log</h1>
          <p className="text-xs text-[#B7B7B7]">Overzicht van alle verwerkte betalingen (abonnementen & orders)</p>
        </div>

        <div className="bg-white rounded-3xl border border-[#EAEAEA] shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F9F9F9] border-b border-[#EAEAEA] font-bold text-[#111111]">
                <tr>
                  <th className="p-4">ID</th>
                  <th className="p-4">Klant / Winkel</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Methode</th>
                  <th className="p-4">Bedrag</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Datum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F9F9F9]">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-[#F9F9F9]/50 transition-colors">
                    <td className="p-4 font-mono font-bold">{p.id}</td>
                    <td className="p-4 font-bold text-[#111111]">{p.user}</td>
                    <td className="p-4 text-[#555555]">{p.type}</td>
                    <td className="p-4">{p.method}</td>
                    <td className="p-4 font-extrabold">{formatCurrency(p.amount)}</td>
                    <td className="p-4"><Badge variant="completed">{p.status}</Badge></td>
                    <td className="p-4 text-[#B7B7B7]">{p.date}</td>
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
