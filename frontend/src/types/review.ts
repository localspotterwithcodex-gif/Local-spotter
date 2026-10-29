export interface Review {
  id: string;
  businessId: string;
  businessName?: string;
  productId?: string;
  consumerId: string;
  consumerName: string;
  consumerAvatarUrl?: string;
  rating: number; // 1 to 5
  title?: string;
  comment: string;
  images?: string[];
  createdAt: string;
}

/** A delivered order or an attended workshop that can still be reviewed. */
export interface ReviewableItem {
  kind: "order" | "workshop";
  id: string;
  /** Order number or workshop title. */
  label: string;
  businessId: string;
  businessName: string;
  date: string;
}
