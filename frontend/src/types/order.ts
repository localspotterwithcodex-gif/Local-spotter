export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PREPARING"
  | "READY"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED"
  | "REJECTED";

export type FulfilmentMethod = "PICKUP" | "SHIPPING" | "LOCAL_DELIVERY";

export type PaymentState =
  | "PENDING"
  | "AUTHORIZED"
  | "PAID"
  | "FAILED"
  | "CANCELLED"
  | "EXPIRED"
  | "REFUNDED"
  | "PARTIALLY_REFUNDED";

/** States in which the money has been received (the shop may see and process the order). */
export const PAID_STATES: PaymentState[] = ["PAID", "PARTIALLY_REFUNDED", "REFUNDED"];

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productImage?: string;
  variantSize?: string;
  variantColor?: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
}

export interface DeliveryAddress {
  fullName: string;
  phone: string;
  street: string;
  houseNumber: string;
  city: string;
  postalCode: string;
  country: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  consumerId: string;
  consumerName: string;
  businessId: string;
  businessName: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  status: OrderStatus;
  deliveryAddress: DeliveryAddress;
  fulfilmentMethod: FulfilmentMethod;
  paymentStatus: PaymentState;
  /** The checkout this order belongs to (absent on legacy orders). */
  customerOrder?: { id: string; orderNumber: string; paymentStatus: PaymentState };
  createdAt: string;
  updatedAt: string;
  /** When the order was delivered / picked up (starts the return window). */
  deliveredAt?: string;
}
