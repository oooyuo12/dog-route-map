import { useEffect, useMemo, useState } from "react";
import CategoryFilter from "./components/CategoryFilter";
import MapLegend from "./components/MapLegend";
import MapView from "./components/MapView";
import PurposeSelector from "./components/PurposeSelector";
import RouteCard from "./components/RouteCard";
import SearchBox from "./components/SearchBox";
import { pins } from "./data/pins";
import type { PinCategory, Purpose } from "./types";
import { recommendRoutes } from "./utils/routeRecommend";

const ALL_CATEGORIES: PinCategory[] = [
  "CAFE",
  "HOSPITAL",
  "PARK",
  "PET_STORE",
  "TOILET",
  "GROOMING",
];

const CATEGORY_SEARCH_TEXT: Record<PinCategory, string> = {
  CAFE: "카페 반려동물 동반 카페 애견카페 커피",
  HOSPITAL: "동물병원 병원 진료 응급",
  PARK: "공원 산책로 산책 운동",
  PET_STORE: "용품점 반려동물 용품 사료 간식 장난감",
  TOILET: "배변시설 배변 봉투 쓰레기통",
  GROOMING: "미용 목욕 미용샵 목욕샵 그루밍",
};

export default function App() {
  const [selectedCategories, setSelectedCategories] =
    useState<PinCategory[]>(ALL_CATEGORIES);

  const [selectedPurpose, setSelectedPurpose] = useState<Purpose>("WALK");
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  const visiblePins = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return pins.filter((pin) => {
      const isCategorySelected = selectedCategories.includes(pin.category);

      if (!isCategorySelected) {
        return false;
      }

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
    });
  }, [selectedCategories, searchQuery]);

  const routeOptions = useMemo(() => {
    return recommendRoutes(pins, selectedPurpose);
  }, [selectedPurpose]);

  const selectedRoute = routeOptions[selectedRouteIndex] ?? routeOptions[0];

  useEffect(() => {
    setSelectedRouteIndex(0);
  }, [selectedPurpose]);

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

  return (
    <main style={{ padding: "24px", maxWidth: "1000px", margin: "0 auto" }}>
      <h1>반려견 외출 루트 추천 지도</h1>

      <p>
        외출 목적을 선택하면 카테고리별 장소를 조합해 추천 루트를 표시합니다.
      </p>

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

      <MapLegend />

      <p style={{ color: "#6b7280", fontSize: "14px" }}>
        현재 표시 중인 장소: <strong>{visiblePins.length}</strong>개
      </p>

      <MapView pins={visiblePins} routePins={selectedRoute.pins} />

      {visiblePins.length === 0 && (
        <section
          style={{
            marginTop: "16px",
            padding: "16px",
            borderRadius: "12px",
            background: "#fff7ed",
            color: "#9a3412",
            border: "1px solid #fed7aa",
          }}
        >
          검색 조건에 맞는 장소가 없습니다. 검색어를 줄이거나 카테고리 필터를
          다시 확인하세요.
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