export interface Workshop {
  id: string;
  businessId: string;
  businessName: string;
  title: string;
  description: string;
  price: number; // 0 for free
  capacity: number;
  bookedCount: number;
  imageUrl?: string;
  location: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  finishTime: string; // HH:MM
  status: "PUBLISHED" | "DRAFT" | "CANCELLED" | "COMPLETED";
  createdAt: string;
}

export interface WorkshopBooking {
  id: string;
  workshopId: string;
  workshopTitle: string;
  consumerId: string;
  consumerName: string;
  ticketQuantity: number;
  totalAmount: number;
  status: "CONFIRMED" | "CANCELLED" | "PENDING";
  createdAt: string;
}
