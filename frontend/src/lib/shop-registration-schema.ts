import { z } from "zod";

const short = z.string().trim().max(200).optional().default("");
const long = z.string().trim().max(2000).optional().default("");

export const shopRegistrationSchema = z.object({
  shopName: z.string().trim().min(1, "Please enter your shop name").max(200),
  contactPersonName: z.string().trim().min(1, "Please enter the contact person's name").max(200),
  email: z.string().trim().min(1, "Please enter an email address").email("Please enter a valid email address").max(255),
  phone: short,
  shopAddress: z.string().trim().min(1, "Please enter your shop address").max(500),
  websiteInstagram: short,
  shopType: z.string().trim().min(1, "Please select your shop type").max(100),
  otherShopType: short,
  productCount: short,
  sellsOnline: short,
  otherSellsOnline: short,
  webshopPos: short,
  otherWebshopPos: short,
  pilotInterest: z.string().trim().min(1, "Please let us know if you're interested in the pilot").max(100),
  valuableFeatures: z.array(z.string().trim().max(200)).max(20).optional().default([]),
  otherFeature: short,
  monthlyPrice: short,
  pricingModel: short,
  routeInterest: short,
  routeOffer: short,
  otherRouteOffer: short,
  biggestChallenge: long,
});

export type ShopRegistrationInput = z.input<typeof shopRegistrationSchema>;
export type ShopRegistration = z.output<typeof shopRegistrationSchema>;
