"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, ShoppingBag, CheckCircle, Clock, Truck, XCircle, Package } from "lucide-react";
import { OwnerLayout } from "@/layouts/OwnerLayout";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/feedback/LoadingState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { api } from "@/lib/api";
import { Order, OrderStatus } from "@/types/order";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function OwnerOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>("ALL");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadOrders() {
      setIsLoading(true);
      const data = await api.getOrders({ businessId: "bus-1" });
      setOrders(data);
      setIsLoading(false);
    }
    loadOrders();
  }, []);

  const handleStatusUpdate = async (orderId: string, nextStatus: OrderStatus) => {
    try {
      const updated = await api.updateOrderStatus(orderId, nextStatus);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filteredOrders = activeFilter === "ALL"
    ? orders
    : orders.filter((o) => o.status === activeFilter);

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
          {["ALL", "PENDING", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"].map((st) => (
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

        {isLoading ? (
          <LoadingState label="Bestellingen laden..." />
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
                        {item.quantity}x {item.productName} {item.variantColor ? `(${item.variantColor})` : ""}
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

                  <div className="flex gap-2">
                    {order.status === "PREPARING" && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleStatusUpdate(order.id, "OUT_FOR_DELIVERY")}
                        className="text-xs h-8"
                      >
                        <Truck className="w-3.5 h-3.5 mr-1" /> Markeer Onderweg
                      </Button>
                    )}
                    {order.status === "OUT_FOR_DELIVERY" && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleStatusUpdate(order.id, "DELIVERED")}
                        className="text-xs h-8"
                      >
                        <CheckCircle className="w-3.5 h-3.5 mr-1" /> Markeer Bezorgd
                      </Button>
                    )}
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
