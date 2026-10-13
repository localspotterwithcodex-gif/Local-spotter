"use client";

import React from "react";
import { ShoppingBag } from "lucide-react";
import { AdminLayout } from "@/layouts/AdminLayout";
import { Badge } from "@/components/ui/Badge";
import { MOCK_ORDERS } from "@/data/mock/orders";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function AdminOrdersPage() {
  return (
    <AdminLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="pb-2 border-b border-[#EAEAEA]">
          <h1 className="text-xl font-bold font-rubik text-[#111111]">Bestellingen Overzicht</h1>
          <p className="text-xs text-[#B7B7B7]">Centraal overzicht van alle transacties op het platform</p>
        </div>

        <div className="bg-white rounded-3xl border border-[#EAEAEA] shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F9F9F9] border-b border-[#EAEAEA] font-bold text-[#111111]">
                <tr>
                  <th className="p-4">Order Nr.</th>
                  <th className="p-4">Klant</th>
                  <th className="p-4">Winkel</th>
                  <th className="p-4">Totaal</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Datum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F9F9F9]">
                {MOCK_ORDERS.map((o) => (
                  <tr key={o.id} className="hover:bg-[#F9F9F9]/50 transition-colors">
                    <td className="p-4 font-bold text-[#111111]">{o.orderNumber}</td>
                    <td className="p-4 text-[#555555]">{o.consumerName}</td>
                    <td className="p-4 font-bold text-[#111111]">{o.businessName}</td>
                    <td className="p-4 font-bold">{formatCurrency(o.total)}</td>
                    <td className="p-4"><Badge status={o.status} /></td>
                    <td className="p-4 text-[#B7B7B7]">{formatDate(o.createdAt)}</td>
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
