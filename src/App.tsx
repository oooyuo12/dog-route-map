import { useEffect, useMemo, useState } from "react";
import CategoryFilter from "./components/CategoryFilter";
import MapLegend from "./components/MapLegend";
import MapView from "./components/MapView";
import PurposeSelector from "./components/PurposeSelector";
import RouteCard from "./components/RouteCard";
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

export default function App() {
  const [selectedCategories, setSelectedCategories] =
    useState<PinCategory[]>(ALL_CATEGORIES);

  const [selectedPurpose, setSelectedPurpose] = useState<Purpose>("WALK");
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);

  const visiblePins = useMemo(() => {
    return pins.filter((pin) => selectedCategories.includes(pin.category));
  }, [selectedCategories]);

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

      <CategoryFilter
        selectedCategories={selectedCategories}
        onToggleCategory={handleToggleCategory}
        onSelectAll={handleSelectAll}
        onClearAll={handleClearAll}
      />

      <MapLegend />

      <MapView pins={visiblePins} routePins={selectedRoute.pins} />

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