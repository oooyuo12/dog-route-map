import { useCallback, useEffect, useMemo, useState } from "react";
import CategoryFilter from "./components/CategoryFilter";
import CurrentLocationControl from "./components/CurrentLocationControl";
import DogConditionFilter from "./components/DogConditionFilter";
import MapLegend from "./components/MapLegend";
import MapView from "./components/MapView";
import PurposeSelector from "./components/PurposeSelector";
import RouteCard from "./components/RouteCard";
import RouteDirectionsPanel from "./components/RouteDirectionsPanel";
import SearchBox from "./components/SearchBox";
import StartPointSelector, {
  type StartPointMode,
} from "./components/StartPointSelector";
import { pins } from "./data/pins";
import type {
  DogConditionFilters,
  DogSize,
  Location,
  Pin,
  PinCategory,
  Purpose,
} from "./types";
import { recommendRoutes } from "./utils/routeRecommend";
import {
  fetchWalkingRoute,
  type WalkingRouteResult,
} from "./utils/walkingRoute";

type LocationStatus = "idle" | "loading" | "success" | "error";
type WalkingRouteStatus = "idle" | "loading" | "success" | "error";

const DEFAULT_LOCATION: Location = {
  lat: 37.4509,
  lng: 127.1287,
};

const ALL_CATEGORIES: PinCategory[] = [
  "CAFE",
  "HOSPITAL",
  "PARK",
  "PET_STORE",
  "TOILET",
  "GROOMING",
];

const INITIAL_DOG_FILTERS: DogConditionFilters = {
  selectedDogSizes: [],
  indoorOnly: false,
  parkingOnly: false,
  noReservationOnly: false,
};

const CATEGORY_SEARCH_TEXT: Record<PinCategory, string> = {
  CAFE: "카페 반려동물 동반 카페 애견카페 커피",
  HOSPITAL: "동물병원 병원 진료 응급",
  PARK: "공원 산책로 산책 운동",
  PET_STORE: "용품점 반려동물 용품 사료 간식 장난감",
  TOILET: "배변시설 배변 봉투 쓰레기통",
  GROOMING: "미용 목욕 미용샵 목욕샵 그루밍",
};

function matchesDogFilters(pin: Pin, filters: DogConditionFilters): boolean {
  if (filters.selectedDogSizes.length > 0) {
    const allowedSizes = pin.dogSizeAllowed ?? [];

    const hasMatchingSize = filters.selectedDogSizes.some((size) =>
      allowedSizes.includes(size)
    );

    if (!hasMatchingSize) {
      return false;
    }
  }

  if (filters.indoorOnly && !pin.indoorAllowed) {
    return false;
  }

  if (filters.parkingOnly && !pin.parkingAvailable) {
    return false;
  }

  if (filters.noReservationOnly && pin.reservationRequired) {
    return false;
  }

  return true;
}

function matchesSearchQuery(pin: Pin, searchQuery: string): boolean {
  const normalizedQuery = searchQuery.trim().toLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  const searchableText = [
    pin.name,
    pin.description ?? "",
    pin.address ?? "",
    pin.category,
    CATEGORY_SEARCH_TEXT[pin.category],
  ]
    .join(" ")
    .toLowerCase();

  return searchableText.includes(normalizedQuery);
}

function getWalkingRouteStatusText(status: WalkingRouteStatus) {
  if (status === "loading") {
    return "보행 경로를 계산하는 중입니다...";
  }

  if (status === "success") {
    return "보행 가능한 도로·산책로 기준으로 경로를 표시하고 있습니다.";
  }

  if (status === "error") {
    return "보행 경로 계산에 실패해 임시 직선 경로로 표시합니다.";
  }

  return "추천 루트를 선택하면 경로가 표시됩니다.";
}

function getWalkingRouteStatusStyle(status: WalkingRouteStatus) {
  if (status === "success") {
    return {
      background: "#ecfdf5",
      color: "#166534",
      border: "1px solid #bbf7d0",
    };
  }

  if (status === "error") {
    return {
      background: "#fef2f2",
      color: "#991b1b",
      border: "1px solid #fecaca",
    };
  }

  if (status === "loading") {
    return {
      background: "#eff6ff",
      color: "#1e40af",
      border: "1px solid #bfdbfe",
    };
  }

  return {
    background: "#f8fafc",
    color: "#334155",
    border: "1px solid #e2e8f0",
  };
}

export default function App() {
  const [selectedCategories, setSelectedCategories] =
    useState<PinCategory[]>(ALL_CATEGORIES);

  const [selectedPurpose, setSelectedPurpose] = useState<Purpose>("WALK");
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [dogFilters, setDogFilters] =
    useState<DogConditionFilters>(INITIAL_DOG_FILTERS);

  const [userLocation, setUserLocation] = useState<Location | null>(null);
  const [mapCenter, setMapCenter] = useState<Location>(DEFAULT_LOCATION);
  const [mapViewCenter, setMapViewCenter] =
    useState<Location>(DEFAULT_LOCATION);
  const [locationStatus, setLocationStatus] =
    useState<LocationStatus>("idle");

  const [startPointMode, setStartPointMode] =
    useState<StartPointMode>("CURRENT");
  const [selectedStartPinId, setSelectedStartPinId] = useState("");
  const [customStartLocation, setCustomStartLocation] =
    useState<Location | null>(null);

  const [walkingRouteResult, setWalkingRouteResult] =
    useState<WalkingRouteResult | null>(null);

  const [walkingRouteStatus, setWalkingRouteStatus] =
    useState<WalkingRouteStatus>("idle");

  const selectedStartPin = useMemo(() => {
    return pins.find((pin) => pin.id === selectedStartPinId) ?? null;
  }, [selectedStartPinId]);

  const routeStartLocation = useMemo<Location>(() => {
    if (startPointMode === "CUSTOM" && customStartLocation) {
      return customStartLocation;
    }

    if (startPointMode === "PIN" && selectedStartPin) {
      return {
        lat: selectedStartPin.lat,
        lng: selectedStartPin.lng,
      };
    }

    if (startPointMode === "CURRENT" && userLocation) {
      return userLocation;
    }

    return DEFAULT_LOCATION;
  }, [startPointMode, customStartLocation, selectedStartPin, userLocation]);

  const startPins = useMemo(() => {
    return [...pins].sort((a, b) => a.name.localeCompare(b.name, "ko"));
  }, []);

  const routeCandidatePins = useMemo(() => {
    return pins.filter((pin) => {
      if (!matchesDogFilters(pin, dogFilters)) {
        return false;
      }

      if (startPointMode === "PIN" && pin.id === selectedStartPinId) {
        return false;
      }

      return true;
    });
  }, [dogFilters, startPointMode, selectedStartPinId]);

  const visiblePins = useMemo(() => {
    return routeCandidatePins.filter((pin) => {
      const isCategorySelected = selectedCategories.includes(pin.category);

      if (!isCategorySelected) {
        return false;
      }

      return matchesSearchQuery(pin, searchQuery);
    });
  }, [routeCandidatePins, selectedCategories, searchQuery]);

  const routeOptions = useMemo(() => {
    return recommendRoutes(
      routeCandidatePins,
      selectedPurpose,
      routeStartLocation
    );
  }, [routeCandidatePins, selectedPurpose, routeStartLocation]);

  const selectedRoute = routeOptions[selectedRouteIndex] ?? routeOptions[0];

  const walkingRoutePath = walkingRouteResult?.path ?? null;
  const walkingRouteSegments = walkingRouteResult?.segments ?? [];

  const isRouteIncomplete = selectedRoute.pins.length === 0;

  const handleMapCenterChange = useCallback((nextCenter: Location) => {
    setMapViewCenter(nextCenter);
  }, []);

  useEffect(() => {
    setSelectedRouteIndex(0);
  }, [
    selectedPurpose,
    dogFilters,
    userLocation,
    startPointMode,
    selectedStartPinId,
    customStartLocation,
  ]);

  const handleUseCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationStatus("error");
      return;
    }

    setLocationStatus("loading");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        setUserLocation(nextLocation);
        setMapCenter(nextLocation);
        setMapViewCenter(nextLocation);
        setLocationStatus("success");
      },
      () => {
        setLocationStatus("error");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  }, []);

  useEffect(() => {
    handleUseCurrentLocation();
  }, [handleUseCurrentLocation]);

  useEffect(() => {
    let isCancelled = false;

    async function loadWalkingRoute() {
      if (!selectedRoute || selectedRoute.pins.length === 0) {
        setWalkingRouteResult(null);
        setWalkingRouteStatus("idle");
        return;
      }

      try {
        setWalkingRouteStatus("loading");

        const result = await fetchWalkingRoute(
          routeStartLocation,
          selectedRoute.pins
        );

        if (!isCancelled) {
          setWalkingRouteResult(result);
          setWalkingRouteStatus("success");
        }
      } catch (error) {
        console.error(error);

        if (!isCancelled) {
          setWalkingRouteResult(null);
          setWalkingRouteStatus("error");
        }
      }
    }

    loadWalkingRoute();

    return () => {
      isCancelled = true;
    };
  }, [selectedRoute, routeStartLocation]);

  const handleChangeStartPointMode = (mode: StartPointMode) => {
    setStartPointMode(mode);

    if (mode === "CURRENT") {
      if (userLocation) {
        setMapCenter(userLocation);
        setMapViewCenter(userLocation);
      } else {
        handleUseCurrentLocation();
      }
    }

    if (mode === "DEFAULT") {
      setMapCenter(DEFAULT_LOCATION);
      setMapViewCenter(DEFAULT_LOCATION);
    }

    if (mode === "PIN" && selectedStartPin) {
      const nextLocation = {
        lat: selectedStartPin.lat,
        lng: selectedStartPin.lng,
      };

      setMapCenter(nextLocation);
      setMapViewCenter(nextLocation);
    }
  };

  const handleChangeStartPin = (pinId: string) => {
    setSelectedStartPinId(pinId);

    const nextPin = pins.find((pin) => pin.id === pinId);

    if (nextPin) {
      const nextLocation = {
        lat: nextPin.lat,
        lng: nextPin.lng,
      };

      setStartPointMode("PIN");
      setMapCenter(nextLocation);
      setMapViewCenter(nextLocation);
    }
  };

  const handleSetStartToMapCenter = () => {
    setCustomStartLocation(mapViewCenter);
    setStartPointMode("CUSTOM");
    setSelectedStartPinId("");
    setMapCenter(mapViewCenter);
  };

  const handleSetStartToCurrentLocation = () => {
    if (userLocation) {
      setCustomStartLocation(userLocation);
      setStartPointMode("CUSTOM");
      setSelectedStartPinId("");
      setMapCenter(userLocation);
      setMapViewCenter(userLocation);
      return;
    }

    if (!navigator.geolocation) {
      setLocationStatus("error");
      return;
    }

    setLocationStatus("loading");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        setUserLocation(nextLocation);
        setCustomStartLocation(nextLocation);
        setStartPointMode("CUSTOM");
        setSelectedStartPinId("");
        setMapCenter(nextLocation);
        setMapViewCenter(nextLocation);
        setLocationStatus("success");
      },
      () => {
        setLocationStatus("error");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  const handleToggleCategory = (category: PinCategory) => {
    setSelectedCategories((prev) => {
      if (prev.includes(category)) {
        return prev.filter((item) => item !== category);
      }

      return [...prev, category];
    });
  };

  const handleSelectAll = () => {
    setSelectedCategories(ALL_CATEGORIES);
  };

  const handleClearAll = () => {
    setSelectedCategories([]);
  };

  const handleToggleDogSize = (size: DogSize) => {
    setDogFilters((prev) => {
      if (prev.selectedDogSizes.includes(size)) {
        return {
          ...prev,
          selectedDogSizes: prev.selectedDogSizes.filter(
            (item) => item !== size
          ),
        };
      }

      return {
        ...prev,
        selectedDogSizes: [...prev.selectedDogSizes, size],
      };
    });
  };

  const handleToggleIndoorOnly = () => {
    setDogFilters((prev) => ({
      ...prev,
      indoorOnly: !prev.indoorOnly,
    }));
  };

  const handleToggleParkingOnly = () => {
    setDogFilters((prev) => ({
      ...prev,
      parkingOnly: !prev.parkingOnly,
    }));
  };

  const handleToggleNoReservationOnly = () => {
    setDogFilters((prev) => ({
      ...prev,
      noReservationOnly: !prev.noReservationOnly,
    }));
  };

  const handleClearDogFilters = () => {
    setDogFilters(INITIAL_DOG_FILTERS);
  };

  const walkingRouteStatusStyle =
    getWalkingRouteStatusStyle(walkingRouteStatus);

  return (
    <main style={{ padding: "24px", maxWidth: "1000px", margin: "0 auto" }}>
      <h1>반려견 외출 루트 추천 지도</h1>

      <p>
        외출 목적과 반려견 조건을 선택하면 조건에 맞는 장소를 조합해 추천
        루트를 표시합니다.
      </p>

      <CurrentLocationControl
        status={locationStatus}
        onUseCurrentLocation={handleUseCurrentLocation}
      />

      <StartPointSelector
        mode={startPointMode}
        pins={startPins}
        selectedPinId={selectedStartPinId}
        customStartLocation={customStartLocation}
        onChangeMode={handleChangeStartPointMode}
        onChangePin={handleChangeStartPin}
        onSetStartToMapCenter={handleSetStartToMapCenter}
        onSetStartToCurrentLocation={handleSetStartToCurrentLocation}
      />

      <PurposeSelector
        selectedPurpose={selectedPurpose}
        onChange={setSelectedPurpose}
      />

      <SearchBox searchQuery={searchQuery} onChange={setSearchQuery} />

      <CategoryFilter
        selectedCategories={selectedCategories}
        onToggleCategory={handleToggleCategory}
        onSelectAll={handleSelectAll}
        onClearAll={handleClearAll}
      />

      <DogConditionFilter
        filters={dogFilters}
        onToggleDogSize={handleToggleDogSize}
        onToggleIndoorOnly={handleToggleIndoorOnly}
        onToggleParkingOnly={handleToggleParkingOnly}
        onToggleNoReservationOnly={handleToggleNoReservationOnly}
        onClear={handleClearDogFilters}
      />

      <MapLegend />

      <div
        style={{
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
          margin: "12px 0",
          color: "#111827",
        }}
      >
        <span
          style={{
            padding: "8px 12px",
            borderRadius: "10px",
            background: "#f3f4f6",
            fontWeight: 700,
          }}
        >
          현재 표시 중인 장소 {visiblePins.length}개
        </span>

        <span
          style={{
            padding: "8px 12px",
            borderRadius: "10px",
            background: "#dbeafe",
            color: "#1e40af",
            fontWeight: 700,
          }}
        >
          추천 계산 가능 장소 {routeCandidatePins.length}개
        </span>
      </div>

      <section
        style={{
          margin: "12px 0",
          padding: "12px",
          borderRadius: "12px",
          background: walkingRouteStatusStyle.background,
          color: walkingRouteStatusStyle.color,
          border: walkingRouteStatusStyle.border,
          fontWeight: 700,
        }}
      >
        {getWalkingRouteStatusText(walkingRouteStatus)}
      </section>

      <MapView
        pins={visiblePins}
        routePins={selectedRoute.pins}
        center={mapCenter}
        userLocation={userLocation}
        routeStartLocation={routeStartLocation}
        walkingRoutePath={walkingRoutePath}
        walkingRouteSegments={walkingRouteSegments}
        onMapCenterChange={handleMapCenterChange}
      />

      <RouteDirectionsPanel
        status={walkingRouteStatus}
        route={walkingRouteResult}
      />

      {visiblePins.length === 0 && (
        <section
          style={{
            marginTop: "16px",
            padding: "16px",
            borderRadius: "12px",
            background: "#fff7ed",
            color: "#9a3412",
            border: "1px solid #fed7aa",
            fontWeight: 700,
          }}
        >
          조건에 맞는 장소가 없습니다. 검색어를 줄이거나 필터 조건을 다시
          확인하세요.
        </section>
      )}

      {isRouteIncomplete && (
        <section
          style={{
            marginTop: "16px",
            padding: "16px",
            borderRadius: "12px",
            background: "#fef2f2",
            color: "#991b1b",
            border: "1px solid #fecaca",
            fontWeight: 700,
          }}
        >
          현재 반려견 조건을 만족하는 장소가 부족해서 추천 루트를 구성할 수
          없습니다. 조건을 완화하거나 장소 데이터를 더 추가해 주세요.
        </section>
      )}

      <section style={{ marginTop: "20px" }}>
        <h2>추천 루트 3개</h2>
        <p>카드를 클릭하면 해당 루트가 지도에 표시됩니다.</p>

        {routeOptions.map((route, index) => (
          <RouteCard
            key={route.id}
            route={route}
            isSelected={selectedRouteIndex === index}
            onSelect={() => setSelectedRouteIndex(index)}
          />
        ))}
      </section>
    </main>
  );
}