export type PinCategory =
  | "CAFE"
  | "HOSPITAL"
  | "PARK"
  | "PET_STORE"
  | "TOILET"
  | "GROOMING";

export type Pin = {
  id: string;
  name: string;
  category: PinCategory;
  lat: number;
  lng: number;
  description?: string;

  address?: string;
  dogFriendlyScore?: number;
  routePriorityScore?: number;
  accessibilityScore?: number;
  safetyScore?: number;
};

export type Purpose =
  | "WALK"
  | "HOSPITAL_VISIT"
  | "GROOMING"
  | "SHOPPING"
  | "STRESS_RELIEF";

export type RouteResult = {
  id: string;
  title: string;
  purpose: Purpose;
  pins: Pin[];
  totalDistanceKm: number;
  score: number;
  description: string;
};