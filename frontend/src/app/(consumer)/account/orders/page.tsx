"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, Store } from "lucide-react";
import { ConsumerLayout } from "@/layouts/ConsumerLayout";
import { Badge } from "@/components/ui/Badge";
import { LoadingState } from "@/components/feedback/LoadingState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { api } from "@/lib/api";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { useLocale } from "@/i18n/LocaleContext";
import { useFormat } from "@/i18n/useFormat";

export default function ConsumerOrdersPage() {
  const { t } = useLocale();
  const f = useFormat();
  const { data, error, loading: isLoading, reload } = useApiResource("my-orders", () => api.getMyOrders());
  const orders = data ?? [];

  return (
    <ConsumerLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <Link href="/account" className="inline-flex items-center gap-1.5 text-xs font-bold text-[#B7B7B7] hover:text-[#111111]">
          <ArrowLeft className="w-4 h-4" />
          {t("account.back")}
        </Link>

        <div>
          <h1 className="text-xl font-bold font-rubik text-[#111111]">{t("account.myOrders")}</h1>
          <p className="text-xs text-[#B7B7B7]">{t("account.ordersSubtitle")}</p>
        </div>

        {isLoading ? (
          <LoadingState label={t("account.ordersLoading")} />
        ) : error ? (
          <ErrorState title={t("account.ordersUnavailable")} message={error} onRetry={reload} />
        ) : orders.length === 0 ? (
          <EmptyState
            title={t("account.ordersEmptyTitle")}
            description={t("account.ordersEmptyDesc")}
          />
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="bg-white p-5 rounded-3xl border border-[#EAEAEA] shadow-2xs space-y-3"
              >
                <div className="flex items-center justify-between pb-2 border-b border-[#F9F9F9]">
                  <div>
                    <span className="text-xs font-bold text-[#111111]">{order.orderNumber}</span>
                    <span className="text-[11px] text-[#B7B7B7] block">{f.date(order.createdAt)}</span>
                  </div>
                  <Badge status={order.status} />
                </div>

                {/* Business Info */}
                <div className="flex items-center gap-2">
                  <Store className="w-4 h-4 text-[#FA1EFF]" />
                  <span className="text-xs font-bold text-[#111111]">{order.businessName}</span>
                </div>

                {/* Items Summary */}
                <div className="space-y-2 pt-1">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex justify-between items-center text-xs">
                      <span className="text-[#555555]">
                        {item.quantity}x {item.productName} {item.variantSize ? `(${item.variantSize})` : ""}
                      </span>
                      <span className="font-bold text-[#111111]">{f.currency(item.totalPrice)}</span>
                    </div>
                  ))}
                </div>

                {/* Total */}
                <div className="flex items-center justify-between pt-2 border-t border-[#F9F9F9] text-xs">
                  <span className="text-[#B7B7B7]">{t("account.orderTotal")}</span>
                  <span className="text-sm font-extrabold text-[#111111]">{f.currency(order.total)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ConsumerLayout>
  );
}
