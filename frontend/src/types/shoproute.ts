export interface RouteStop {
  id: string;
  businessId: string;
  businessName: string;
  businessCategory: string;
  logoUrl?: string;
  address: string;
  lat: number;
  lng: number;
  sequenceOrder: number;
}

export interface Shoproute {
  id: string;
  title: string;
  cityName: string;
  description: string;
  imageUrl?: string;
  shopCount: number;
  stops: RouteStop[];
  status: "PUBLISHED" | "DRAFT";
  createdAt: string;
}
