import type { FulfilmentMethod, OrderStatus } from "@/types/order";

export interface TrackerStep {
  status: OrderStatus;
  /** Use the "ready for pickup" wording instead of "ready". */
  pickupLabel?: boolean;
}

const COMMON: TrackerStep[] = [{ status: "PENDING" }, { status: "CONFIRMED" }, { status: "PREPARING" }];

/** The happy-path steps for a fulfilment method. Cancelled/rejected orders are not part of the path. */
export function trackerSteps(method: FulfilmentMethod): TrackerStep[] {
  return method === "PICKUP"
    ? [...COMMON, { status: "READY", pickupLabel: true }, { status: "DELIVERED" }]
    : [...COMMON, { status: "OUT_FOR_DELIVERY" }, { status: "DELIVERED" }];
}

/** Index of the current step, or -1 for cancelled/rejected orders. */
export function currentStepIndex(status: OrderStatus, method: FulfilmentMethod): number {
  if (status === "CANCELLED" || status === "REJECTED") return -1;
  const steps = trackerSteps(method);
  const exact = steps.findIndex((s) => s.status === status);
  if (exact >= 0) return exact;
  // READY on a delivery order sits between PREPARING and OUT_FOR_DELIVERY.
  return status === "READY" ? 2 : 0;
}

/**
 * Where the parcel marker sits on the shop→home route (0..1). It is derived from the order status only:
 * the app has no live courier GPS, so this is an indication of progress, not a position.
 */
export function routeProgress(status: OrderStatus): number {
  switch (status) {
    case "PENDING":
      return 0;
    case "CONFIRMED":
      return 0.05;
    case "PREPARING":
      return 0.12;
    case "READY":
      return 0.22;
    case "OUT_FOR_DELIVERY":
      return 0.62;
    case "DELIVERED":
      return 1;
    default:
      return 0;
  }
}
