"use client";

import React from "react";
import Link from "next/link";
import {
  Users,
  Store,
  ShoppingBag,
  CreditCard,
  FileCheck,
  Crown,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import { AdminLayout } from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/Button";
import { useLocale } from "@/i18n/LocaleContext";

export default function AdminDashboardPage() {
  const { t } = useLocale();
  const metrics = [
    { label: t("admin.totalUsers"), val: "1,248", icon: Users, color: "bg-blue-50 text-blue-600" },
    { label: t("admin.activeShops"), val: "142", icon: Store, color: "bg-emerald-50 text-emerald-600" },
    { label: t("admin.totalOrders"), val: "3,890", icon: ShoppingBag, color: "bg-purple-50 text-purple-600" },
    { label: t("admin.monthlyRevenue"), val: "€ 42.850", icon: TrendingUp, color: "bg-pink-50 text-[#FA1EFF]" },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between pb-2 border-b border-[#EAEAEA]">
          <div>
            <h1 className="text-2xl font-bold font-rubik text-[#111111]">{t("admin.platformOverview")}</h1>
            <p className="text-xs text-[#B7B7B7]">{t("admin.platformSubtitle")}</p>
          </div>

          <div className="flex gap-2">
            <Link href="/admin/payouts">
              <Button variant="primary" size="sm" className="gap-1.5 text-xs bg-[#790166] hover:bg-[#5C014E]">
                <FileCheck className="w-4 h-4" /> {t("admin.approvePayouts").replace("{n}", "2")}
              </Button>
            </Link>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {metrics.map((m) => {
            const Icon = m.icon;
            return (
              <div key={m.label} className="bg-white p-5 rounded-3xl border border-[#EAEAEA] shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#B7B7B7]">{m.label}</span>
                  <div className={`p-2 rounded-xl ${m.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
                <span className="text-2xl font-extrabold font-rubik text-[#111111] block">{m.val}</span>
              </div>
            );
          })}
        </div>

        {/* Quick Admin Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {/* Pending Business Approvals */}
          <div className="bg-white p-5 rounded-3xl border border-[#EAEAEA] shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold font-rubik text-[#111111] flex items-center gap-1.5">
                <Store className="w-4 h-4 text-[#FA1EFF]" /> {t("admin.shopsPendingApproval")}
              </h3>
              <span className="bg-[#FAE2F0] text-[#FA1EFF] text-xs font-bold px-2 py-0.5 rounded-full">1 {t("admin.new")}</span>
            </div>

            <div className="p-3 bg-[#F9F9F9] rounded-2xl text-xs space-y-1">
              <span className="font-bold text-[#111111] block">Bakkerij De Ambacht</span>
              <span className="text-[#B7B7B7] block">KVK: 98765432 • Delft</span>
              <Link href="/admin/businesses" className="text-xs font-bold text-[#FA1EFF] hover:underline pt-1 inline-block">
                {t("admin.viewAndApprove")} →
              </Link>
            </div>
          </div>

          {/* Pending Payout Requests */}
          <div className="bg-white p-5 rounded-3xl border border-[#EAEAEA] shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold font-rubik text-[#111111] flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-[#54D1CA]" /> {t("admin.payoutRequests")}
              </h3>
              <span className="bg-[#E8D1ED] text-[#C04BDA] text-xs font-bold px-2 py-0.5 rounded-full">2 {t("admin.pending")}</span>
            </div>

            <div className="p-3 bg-[#F9F9F9] rounded-2xl text-xs space-y-1">
              <span className="font-bold text-[#111111] block">Bag Shop Horn Center</span>
              <span className="text-[#B7B7B7] block">{t("admin.amount")}: € 428,50</span>
              <Link href="/admin/payouts" className="text-xs font-bold text-[#54D1CA] hover:underline pt-1 inline-block">
                {t("admin.review")} →
              </Link>
            </div>
          </div>

          {/* Subscription Breakdown */}
          <div className="bg-white p-5 rounded-3xl border border-[#EAEAEA] shadow-2xs space-y-3">
            <h3 className="text-sm font-bold font-rubik text-[#111111] flex items-center gap-1.5">
              <Crown className="w-4 h-4 text-[#790166]" /> {t("admin.subscriptionBreakdown")}
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-[#555555]">Workshop (€150/mnd)</span>
                <span className="font-bold text-[#111111]">64 {t("admin.shops")}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#555555]">Shoproutes (€100/mnd)</span>
                <span className="font-bold text-[#111111]">48 {t("admin.shops")}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#555555]">Webshop (€50/mnd)</span>
                <span className="font-bold text-[#111111]">30 {t("admin.shops")}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
