import type { Pin, PinCategory, Purpose, RouteResult } from "../types";
import { getDistanceKm, getRouteDistanceKm } from "./distance";

type Location = {
  lat: number;
  lng: number;
};

const DEFAULT_START_LOCATION: Location = {
  lat: 37.5408,
  lng: 127.0693,
};

const PURPOSE_ROUTE_MAP: Record<Purpose, PinCategory[]> = {
  WALK: ["TOILET", "PARK", "CAFE"],
  HOSPITAL_VISIT: ["HOSPITAL", "TOILET", "PARK"],
  GROOMING: ["TOILET", "PARK", "GROOMING", "CAFE"],
  SHOPPING: ["TOILET", "PET_STORE", "CAFE"],
  STRESS_RELIEF: ["PARK", "TOILET", "CAFE"],
};

const PURPOSE_DESCRIPTION: Record<Purpose, string> = {
  WALK: "배변시설, 공원, 카페를 포함한 기본 산책 루트입니다.",
  HOSPITAL_VISIT: "병원 방문 후 짧은 배변과 산책을 고려한 루트입니다.",
  GROOMING: "미용·목욕 전 배변과 가벼운 산책을 포함한 루트입니다.",
  SHOPPING: "용품 구매 후 휴식할 수 있는 카페를 연결한 루트입니다.",
  STRESS_RELIEF: "공원 중심으로 반려견의 스트레스 해소를 우선한 루트입니다.",
};

function getPinScore(pin: Pin, from: Location): number {
  const distanceKm = getDistanceKm(from, {
    lat: pin.lat,
    lng: pin.lng,
  });

  const dogFriendlyScore = pin.dogFriendlyScore ?? 3;
  const routePriorityScore = pin.routePriorityScore ?? 3;
  const accessibilityScore = pin.accessibilityScore ?? 3;
  const safetyScore = pin.safetyScore ?? 3;

  return (
    dogFriendlyScore * 10 +
    routePriorityScore * 10 +
    accessibilityScore * 6 +
    safetyScore * 6 -
    distanceKm * 8
  );
}

function selectBestPinByCategory(
  pins: Pin[],
  category: PinCategory,
  from: Location,
  selectedPinIds: string[]
): Pin | undefined {
  const candidates = pins.filter(
    (pin) => pin.category === category && !selectedPinIds.includes(pin.id)
  );

  if (candidates.length === 0) {
    return undefined;
  }

  return candidates
    .map((pin) => ({
      pin,
      score: getPinScore(pin, from),
    }))
    .sort((a, b) => b.score - a.score)[0].pin;
}

export function recommendRoute(
  pins: Pin[],
  purpose: Purpose,
  startLocation: Location = DEFAULT_START_LOCATION
): RouteResult {
  const requiredCategories = PURPOSE_ROUTE_MAP[purpose];

  const selectedPins: Pin[] = [];
  let currentLocation = startLocation;

  for (const category of requiredCategories) {
    const selectedPin = selectBestPinByCategory(
      pins,
      category,
      currentLocation,
      selectedPins.map((pin) => pin.id)
    );

    if (selectedPin) {
      selectedPins.push(selectedPin);
      currentLocation = {
        lat: selectedPin.lat,
        lng: selectedPin.lng,
      };
    }
  }

  const routeLocations = selectedPins.map((pin) => ({
    lat: pin.lat,
    lng: pin.lng,
  }));

  const totalDistanceKm = getRouteDistanceKm(routeLocations);

  const averagePinScore =
    selectedPins.length === 0
      ? 0
      : selectedPins.reduce((sum, pin) => {
          return (
            sum +
            (pin.dogFriendlyScore ?? 3) * 10 +
            (pin.routePriorityScore ?? 3) * 10 +
            (pin.accessibilityScore ?? 3) * 6 +
            (pin.safetyScore ?? 3) * 6
          );
        }, 0) / selectedPins.length;

  const score = Math.max(
    0,
    Math.round(averagePinScore - totalDistanceKm * 5)
  );

  return {
    purpose,
    pins: selectedPins,
    totalDistanceKm,
    score,
    description: PURPOSE_DESCRIPTION[purpose],
  };
}