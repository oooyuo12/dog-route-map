import { useEffect } from "react";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

import L from "leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import type { Location, Pin, PinCategory } from "../types";

type MapViewProps = {
  pins: Pin[];
  routePins: Pin[];
  center: Location;
  userLocation: Location | null;
  routeStartLocation: Location;
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

function createClusterCustomIcon(cluster: { getChildCount: () => number }) {
  const count = cluster.getChildCount();

  return L.divIcon({
    className: "",
    html: `
      <div style="
        width: 46px;
        height: 46px;
        border-radius: 999px;
        background: #2563eb;
        color: #ffffff;
        border: 4px solid #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 900;
        font-size: 17px;
        box-shadow: 0 4px 14px rgba(0,0,0,0.45);
      ">
        ${count}
      </div>
    `,
    iconSize: [46, 46],
    iconAnchor: [23, 23],
  });
}

const userLocationIcon = L.divIcon({
  className: "",
  html: `
    <div style="
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: #2563eb;
      border: 4px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.35);
    "></div>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -16],
});

function MapCenterUpdater({ center }: { center: Location }) {
  const map = useMap();

  useEffect(() => {
    map.setView([center.lat, center.lng], map.getZoom());
  }, [center.lat, center.lng, map]);

  return null;
}

export default function MapView({
  pins,
  routePins,
  center,
  userLocation,
  routeStartLocation,
}: MapViewProps) {
  const routePath: [number, number][] = [
    [routeStartLocation.lat, routeStartLocation.lng],
    ...routePins.map((pin) => [pin.lat, pin.lng] as [number, number]),
  ];

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={15}
      style={{
        width: "100%",
        height: "500px",
        borderRadius: "16px",
        overflow: "hidden",
        border: "1px solid #d1d5db",
        boxShadow: "0 4px 14px rgba(0, 0, 0, 0.12)",
      }}
    >
      <MapCenterUpdater center={center} />

      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {userLocation && (
        <Marker
          position={[userLocation.lat, userLocation.lng]}
          icon={userLocationIcon}
        >
          <Popup>
            <strong>현재 위치</strong>
            <br />
            추천 루트의 시작 기준점입니다.
          </Popup>
        </Marker>
      )}

      <MarkerClusterGroup
        chunkedLoading
        iconCreateFunction={createClusterCustomIcon}
        maxClusterRadius={45}
        disableClusteringAtZoom={17}
        spiderfyOnMaxZoom
        showCoverageOnHover={false}
      >
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
      </MarkerClusterGroup>

      {routePath.length >= 2 && (
        <Polyline
          positions={routePath}
          pathOptions={{
            weight: 5,
            opacity: 0.85,
            color: "#2563eb",
          }}
        />
      )}
    </MapContainer>
  );
}