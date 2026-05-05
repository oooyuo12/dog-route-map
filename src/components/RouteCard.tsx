import type { RouteResult } from "../types";

type RouteCardProps = {
  route: RouteResult;
};

const CATEGORY_LABEL: Record<string, string> = {
  CAFE: "반려동물 동반 카페",
  HOSPITAL: "동물병원",
  PARK: "산책로·공원",
  PET_STORE: "반려동물 용품점",
  TOILET: "배변시설",
  GROOMING: "미용·목욕샵",
};

export default function RouteCard({ route }: RouteCardProps) {
  return (
    <section
      style={{
        marginTop: "20px",
        padding: "16px",
        border: "1px solid #ddd",
        borderRadius: "12px",
      }}
    >
      <h2>추천 루트</h2>

      <p>{route.description}</p>

      <p>
        <strong>예상 직선 거리:</strong> {route.totalDistanceKm}km
      </p>

      <p>
        <strong>추천 점수:</strong> {route.score}점
      </p>

      <ol>
        {route.pins.map((pin) => (
          <li key={pin.id}>
            <strong>{pin.name}</strong> - {CATEGORY_LABEL[pin.category]}
          </li>
        ))}
      </ol>
    </section>
  );
}