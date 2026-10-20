export interface WorkshopSession {
  id: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  finishTime: string; // HH:MM
  startsAt: string; // ISO
  capacity: number;
  bookedCount: number;
  remaining: number;
  status: "OPEN" | "FULL" | "CANCELLED" | "COMPLETED";
}

export interface WorkshopParticipant {
  bookingId: string;
  name: string;
  phone: string | null;
  tickets: number;
  total: number;
  status: string;
  sessionId: string | null;
  sessionStart: string | null;
  bookedAt: string;
}

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
  sessions: WorkshopSession[];
  cancellationDeadlineHours: number;
  refundPercentage: number;
  minAge?: number;
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
