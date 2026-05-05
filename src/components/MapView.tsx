import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, Marker, Polyline, Popup, TileLayer } from "react-leaflet";
import type { Pin, PinCategory } from "../types";

type MapViewProps = {
  pins: Pin[];
  routePins: Pin[];
};

const CATEGORY_LABEL: Record<PinCategory, string> = {
  CAFE: "반려동물 동반 카페",
  HOSPITAL: "동물병원",
  PARK: "산책로·공원",
  PET_STORE: "반려동물 용품점",
  TOILET: "배변시설",
  GROOMING: "미용·목욕샵",
};

const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

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

      {pins.map((pin) => (
        <Marker key={pin.id} position={[pin.lat, pin.lng]} icon={defaultIcon}>
          <Popup>
            <strong>{pin.name}</strong>
            <br />
            {CATEGORY_LABEL[pin.category]}
            <br />
            {pin.description}
          </Popup>
        </Marker>
      ))}

      {routePath.length >= 2 && <Polyline positions={routePath} />}
    </MapContainer>
  );
}