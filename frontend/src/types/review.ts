export interface Review {
  id: string;
  businessId: string;
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
