import type { Pin, PinCategory, Purpose, RouteResult } from "../types";
import { getDistanceKm, getRouteDistanceKm } from "./distance";

type Location = {
  lat: number;
  lng: number;
};

type RouteStrategy = "BALANCED" | "SHORT_DISTANCE" | "DOG_FRIENDLY";

type StrategyConfig = {
  id: RouteStrategy;
  title: string;
  descriptionPrefix: string;
  dogFriendlyWeight: number;
  routePriorityWeight: number;
  accessibilityWeight: number;
  safetyWeight: number;
  distanceWeight: number;
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

const STRATEGIES: StrategyConfig[] = [
  {
    id: "BALANCED",
    title: "균형 추천 코스",
    descriptionPrefix: "거리, 접근성, 반려견 친화도를 균형 있게 고려한 코스입니다.",
    dogFriendlyWeight: 10,
    routePriorityWeight: 10,
    accessibilityWeight: 6,
    safetyWeight: 6,
    distanceWeight: 8,
  },
  {
    id: "SHORT_DISTANCE",
    title: "짧은 거리 코스",
    descriptionPrefix: "이동 거리를 줄이는 것을 우선한 코스입니다.",
    dogFriendlyWeight: 6,
    routePriorityWeight: 6,
    accessibilityWeight: 8,
    safetyWeight: 5,
    distanceWeight: 16,
  },
  {
    id: "DOG_FRIENDLY",
    title: "반려견 친화 코스",
    descriptionPrefix: "반려견 친화도와 안전성을 우선한 코스입니다.",
    dogFriendlyWeight: 16,
    routePriorityWeight: 8,
    accessibilityWeight: 5,
    safetyWeight: 10,
    distanceWeight: 6,
  },
];

function getPinScore(
  pin: Pin,
  from: Location,
  strategy: StrategyConfig
): number {
  const distanceKm = getDistanceKm(from, {
    lat: pin.lat,
    lng: pin.lng,
  });

  const dogFriendlyScore = pin.dogFriendlyScore ?? 3;
  const routePriorityScore = pin.routePriorityScore ?? 3;
  const accessibilityScore = pin.accessibilityScore ?? 3;
  const safetyScore = pin.safetyScore ?? 3;

  return (
    dogFriendlyScore * strategy.dogFriendlyWeight +
    routePriorityScore * strategy.routePriorityWeight +
    accessibilityScore * strategy.accessibilityWeight +
    safetyScore * strategy.safetyWeight -
    distanceKm * strategy.distanceWeight
  );
}

function selectBestPinByCategory(
  pins: Pin[],
  category: PinCategory,
  from: Location,
  selectedPinIds: string[],
  strategy: StrategyConfig
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
      score: getPinScore(pin, from, strategy),
    }))
    .sort((a, b) => b.score - a.score)[0].pin;
}

function buildRoute(
  pins: Pin[],
  purpose: Purpose,
  strategy: StrategyConfig,
  startLocation: Location
): RouteResult {
  const requiredCategories = PURPOSE_ROUTE_MAP[purpose];

  const selectedPins: Pin[] = [];
  let currentLocation = startLocation;

  for (const category of requiredCategories) {
    const selectedPin = selectBestPinByCategory(
      pins,
      category,
      currentLocation,
      selectedPins.map((pin) => pin.id),
      strategy
    );

    if (selectedPin) {
      selectedPins.push(selectedPin);
      currentLocation = {
        lat: selectedPin.lat,
        lng: selectedPin.lng,
      };
    }
  }

  const routeLocations = [
    startLocation,
    ...selectedPins.map((pin) => ({
      lat: pin.lat,
      lng: pin.lng,
    })),
  ];

  const totalDistanceKm = getRouteDistanceKm(routeLocations);

  const averagePinScore =
    selectedPins.length === 0
      ? 0
      : selectedPins.reduce((sum, pin) => {
          return (
            sum +
            (pin.dogFriendlyScore ?? 3) * strategy.dogFriendlyWeight +
            (pin.routePriorityScore ?? 3) * strategy.routePriorityWeight +
            (pin.accessibilityScore ?? 3) * strategy.accessibilityWeight +
            (pin.safetyScore ?? 3) * strategy.safetyWeight
          );
        }, 0) / selectedPins.length;

  const score = Math.max(
    0,
    Math.round(averagePinScore - totalDistanceKm * strategy.distanceWeight)
  );

  return {
    id: strategy.id,
    title: strategy.title,
    purpose,
    pins: selectedPins,
    totalDistanceKm,
    score,
    description: `${strategy.descriptionPrefix} ${PURPOSE_DESCRIPTION[purpose]}`,
  };
}

export function recommendRoutes(
  pins: Pin[],
  purpose: Purpose,
  startLocation: Location = DEFAULT_START_LOCATION
): RouteResult[] {
  return STRATEGIES.map((strategy) =>
    buildRoute(pins, purpose, strategy, startLocation)
  );
}