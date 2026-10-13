export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PREPARING"
  | "READY"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED"
  | "REJECTED";

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
  paymentMethod: "ideal" | "paypal" | "tikkie";
  createdAt: string;
  updatedAt: string;
}
