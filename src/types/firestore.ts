import type { Timestamp } from "firebase/firestore";

export interface UserDoc {
  uid: string;
  email: string;
  displayName?: string;
  createdAt: Timestamp;
}

export interface SearchDoc {
  id: string;
  userId: string;
  query: string;
  status: "pending" | "resolving" | "extracting" | "complete" | "failed";
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ListingDoc {
  id: string;
  searchId: string;
  retailerDomain: string;
  url: string;
  title: string;
  price: number;
  currency: string;
  inStock: boolean;
  matchConfidence: number;
  extractionTier: 1 | 2 | 3 | 4;
  scrapedAt: Timestamp;
}

export interface RetailerTemplateDoc {
  domain: string;
  resolutionMethod: "registry" | "form-discovery" | "platform-pattern" | "user-provided";
  searchUrlPattern?: string;
  lastValidatedAt: Timestamp;
  successCount: number;
  failureCount: number;
}
