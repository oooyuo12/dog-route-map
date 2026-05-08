import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, Marker, Polyline, Popup, TileLayer } from "react-leaflet";
import type { Pin, PinCategory } from "../types";

type MapViewProps = {
  pins: Pin[];
  routePins: Pin[];
};

const CATEGORY_INFO: Record<
  PinCategory,
  {
    label: string;
    color: string;
    emoji: string;
  }
> = {
  CAFE: {
    label: "반려동물 동반 카페",
    color: "#8B5E3C",
    emoji: "☕",
  },
  HOSPITAL: {
    label: "동물병원",
    color: "#E53935",
    emoji: "🏥",
  },
  PARK: {
    label: "산책로·공원",
    color: "#43A047",
    emoji: "🌳",
  },
  PET_STORE: {
    label: "반려동물 용품점",
    color: "#8E24AA",
    emoji: "🛒",
  },
  TOILET: {
    label: "배변시설",
    color: "#1E88E5",
    emoji: "🚮",
  },
  GROOMING: {
    label: "미용·목욕샵",
    color: "#D81B60",
    emoji: "✂️",
  },
};

function createCategoryIcon(category: PinCategory) {
  const info = CATEGORY_INFO[category];

  return L.divIcon({
    className: "",
    html: `
      <div style="
        width: 34px;
        height: 34px;
        border-radius: 50% 50% 50% 0;
        background: ${info.color};
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.35);
      ">
        <span style="
          transform: rotate(45deg);
          font-size: 17px;
          line-height: 1;
        ">
          ${info.emoji}
        </span>
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -34],
  });
}

export default function MapView({ pins, routePins }: MapViewProps) {
  const routePath: [number, number][] = routePins.map((pin) => [
    pin.lat,
    pin.lng,
  ]);

  return (
    <MapContainer
      center={[37.5408, 127.0693]}
      zoom={15}
      style={{
        width: "100%",
        height: "500px",
        borderRadius: "12px",
        overflow: "hidden",
      }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {pins.map((pin) => {
        const categoryInfo = CATEGORY_INFO[pin.category];

        return (
          <Marker
            key={pin.id}
            position={[pin.lat, pin.lng]}
            icon={createCategoryIcon(pin.category)}
          >
            <Popup>
              <strong>{pin.name}</strong>
              <br />
              {categoryInfo.label}
              <br />
              {pin.description}
            </Popup>
          </Marker>
        );
      })}

      {routePath.length >= 2 && (
        <Polyline
          positions={routePath}
          pathOptions={{
            weight: 5,
            opacity: 0.8,
          }}
        />
      )}
    </MapContainer>
  );
}