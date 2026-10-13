"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle, Truck, XCircle, Package, AlertCircle } from "lucide-react";
import { OwnerLayout } from "@/layouts/OwnerLayout";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/feedback/LoadingState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { api } from "@/lib/api";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { useMyBusiness } from "@/features/business/useMyBusiness";
import { OrderStatus } from "@/types/order";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getErrorMessage } from "@/lib/errors";

interface StatusAction {
  to: OrderStatus;
  label: string;
  variant: "primary" | "secondary" | "outline";
  icon: React.ReactNode;
}

/** Mirrors the backend transition table (orders.service validateStatusTransition). */
const ACTIONS: Partial<Record<OrderStatus, StatusAction[]>> = {
  PENDING: [
    { to: "CONFIRMED", label: "Accepteren", variant: "primary", icon: <CheckCircle className="w-3.5 h-3.5 mr-1" /> },
    { to: "REJECTED", label: "Afwijzen", variant: "outline", icon: <XCircle className="w-3.5 h-3.5 mr-1" /> },
  ],
  CONFIRMED: [
    { to: "PREPARING", label: "In Voorbereiding", variant: "primary", icon: <Package className="w-3.5 h-3.5 mr-1" /> },
    { to: "CANCELLED", label: "Annuleren", variant: "outline", icon: <XCircle className="w-3.5 h-3.5 mr-1" /> },
  ],
  PREPARING: [
    { to: "READY", label: "Markeer Klaar", variant: "primary", icon: <CheckCircle className="w-3.5 h-3.5 mr-1" /> },
    { to: "CANCELLED", label: "Annuleren", variant: "outline", icon: <XCircle className="w-3.5 h-3.5 mr-1" /> },
  ],
  READY: [
    { to: "OUT_FOR_DELIVERY", label: "Markeer Onderweg", variant: "primary", icon: <Truck className="w-3.5 h-3.5 mr-1" /> },
    { to: "DELIVERED", label: "Markeer Bezorgd", variant: "secondary", icon: <CheckCircle className="w-3.5 h-3.5 mr-1" /> },
    { to: "CANCELLED", label: "Annuleren", variant: "outline", icon: <XCircle className="w-3.5 h-3.5 mr-1" /> },
  ],
  OUT_FOR_DELIVERY: [
    { to: "DELIVERED", label: "Markeer Bezorgd", variant: "secondary", icon: <CheckCircle className="w-3.5 h-3.5 mr-1" /> },
  ],
};

export default function OwnerOrdersPage() {
  const { business, loading: businessLoading, error: businessError, reload: reloadBusiness } = useMyBusiness();
  const businessId = business?.id ?? null;
  const orders = useApiResource(businessId && `owner-orders:${businessId}`, () => api.getBusinessOrders(businessId!));

  const [activeFilter, setActiveFilter] = useState<string>("ALL");
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");

  const handleStatusUpdate = async (orderId: string, nextStatus: OrderStatus) => {
    setActionError("");
    setBusyOrderId(orderId);
    try {
      await api.updateOrderStatus(orderId, nextStatus);
      orders.reload();
    } catch (err) {
      setActionError(getErrorMessage(err, "Status bijwerken mislukt"));
    } finally {
      setBusyOrderId(null);
    }
  };

  const isLoading = businessLoading || orders.loading;
  const loadError = businessError ?? orders.error;
  const retry = businessError ? reloadBusiness : orders.reload;

  const filteredOrders = (orders.data ?? []).filter((o) => activeFilter === "ALL" || o.status === activeFilter);

  return (
    <OwnerLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        <Link href="/owner" className="inline-flex items-center gap-1.5 text-xs font-bold text-[#B7B7B7] hover:text-[#111111]">
          <ArrowLeft className="w-4 h-4" />
          Terug naar dashboard
        </Link>

        <div>
          <h1 className="text-xl font-bold font-rubik text-[#111111]">Product Bestellingen (Orders)</h1>
          <p className="text-xs text-[#B7B7B7]">Beheer binnenkomende bestellingen van jouw producten</p>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {["ALL", "PENDING", "CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED", "REJECTED"].map((st) => (
            <button
              key={st}
              onClick={() => setActiveFilter(st)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                activeFilter === st
                  ? "bg-[#FA1EFF] text-white"
                  : "bg-white text-[#111111] border border-[#EAEAEA] hover:bg-[#F9F9F9]"
              }`}
            >
              {st === "ALL" ? "Alle Bestellingen" : st}
            </button>
          ))}
        </div>

        {actionError && (
          <div className="p-3 bg-[#F2D9DE] text-[#E54666] text-xs font-bold rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {actionError}
          </div>
        )}

        {isLoading ? (
          <LoadingState label="Bestellingen laden..." />
        ) : loadError ? (
          <ErrorState message={loadError} onRetry={retry} />
        ) : !business ? (
          <EmptyState title="Nog geen winkel" description="Maak eerst een winkel aan om bestellingen te ontvangen." />
        ) : filteredOrders.length === 0 ? (
          <EmptyState title="Geen bestellingen" description="Er zijn geen bestellingen die voldoen aan het filter." />
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <div key={order.id} className="bg-white p-5 rounded-3xl border border-[#EAEAEA] shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#F9F9F9]">
                  <div>
                    <span className="text-sm font-bold text-[#111111]">{order.orderNumber}</span>
                    <span className="text-xs text-[#B7B7B7] block">{formatDate(order.createdAt)} • Klant: {order.consumerName}</span>
                  </div>
                  <Badge status={order.status} />
                </div>

                {/* Items List */}
                <div className="space-y-2">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex justify-between items-center text-xs">
                      <span className="font-medium text-[#111111]">
                        {item.quantity}x {item.productName} {item.variantSize || item.variantColor ? `(${item.variantSize ?? item.variantColor})` : ""}
                      </span>
                      <span className="font-bold">{formatCurrency(item.totalPrice)}</span>
                    </div>
                  ))}
                </div>

                {/* Delivery Address */}
                <div className="p-3 bg-[#F9F9F9] rounded-2xl text-xs text-[#555555]">
                  <span className="font-bold text-[#111111] block mb-0.5">Bezorgadres:</span>
                  <p>{order.deliveryAddress.fullName} - {order.deliveryAddress.street} {order.deliveryAddress.houseNumber}, {order.deliveryAddress.city}</p>
                </div>

                {/* Status Action Buttons */}
                <div className="flex items-center justify-between pt-2 border-t border-[#F9F9F9]">
                  <span className="text-sm font-extrabold text-[#111111]">Totaal: {formatCurrency(order.total)}</span>

                  <div className="flex flex-wrap gap-2 justify-end">
                    {(ACTIONS[order.status] ?? []).map((action) => (
                      <Button
                        key={action.to}
                        variant={action.variant}
                        size="sm"
                        isLoading={busyOrderId === order.id}
                        disabled={busyOrderId !== null}
                        onClick={() => handleStatusUpdate(order.id, action.to)}
                        className="text-xs h-8"
                      >
                        {action.icon} {action.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </OwnerLayout>
  );
}
