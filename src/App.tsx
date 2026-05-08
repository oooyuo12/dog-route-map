import { useCallback, useEffect, useMemo, useState } from "react";
import CategoryFilter from "./components/CategoryFilter";
import CurrentLocationControl from "./components/CurrentLocationControl";
import DogConditionFilter from "./components/DogConditionFilter";
import MapLegend from "./components/MapLegend";
import MapView from "./components/MapView";
import PurposeSelector from "./components/PurposeSelector";
import RouteCard from "./components/RouteCard";
import SearchBox from "./components/SearchBox";
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

type LocationStatus = "idle" | "loading" | "success" | "error";

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
  const [locationStatus, setLocationStatus] =
    useState<LocationStatus>("idle");

  const routeStartLocation = userLocation ?? DEFAULT_LOCATION;

  const routeCandidatePins = useMemo(() => {
    return pins.filter((pin) => matchesDogFilters(pin, dogFilters));
  }, [dogFilters]);

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
    return recommendRoutes(routeCandidatePins, selectedPurpose, routeStartLocation);
  }, [routeCandidatePins, selectedPurpose, routeStartLocation]);

  const selectedRoute = routeOptions[selectedRouteIndex] ?? routeOptions[0];

  const isRouteIncomplete = selectedRoute.pins.length === 0;

  useEffect(() => {
    setSelectedRouteIndex(0);
  }, [selectedPurpose, dogFilters, userLocation]);

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

      <MapView
        pins={visiblePins}
        routePins={selectedRoute.pins}
        center={mapCenter}
        userLocation={userLocation}
        routeStartLocation={routeStartLocation}
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