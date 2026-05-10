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
import type { WalkingRouteSegment } from "../utils/walkingRoute";

type MapViewProps = {
  pins: Pin[];
  routePins: Pin[];
  center: Location;
  userLocation: Location | null;
  routeStartLocation: Location;
  walkingRoutePath: [number, number][] | null;
  walkingRouteSegments: WalkingRouteSegment[];
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

const SEGMENT_STYLES = [
  {
    color: "#f97316",
    label: "1구간",
    dashArray: undefined,
  },
  {
    color: "#2563eb",
    label: "2구간",
    dashArray: "10 8",
  },
  {
    color: "#e11d48",
    label: "3구간",
    dashArray: "4 8",
  },
  {
    color: "#7c3aed",
    label: "4구간",
    dashArray: "12 6 4 6",
  },
];

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

function createRouteOrderIcon(label: string, variant: "start" | "stop") {
  const background = variant === "start" ? "#111827" : "#e11d48";
  const text = variant === "start" ? "출발" : label;

  return L.divIcon({
    className: "",
    html: `
      <div style="
        min-width: ${variant === "start" ? "46px" : "32px"};
        height: 32px;
        padding: 0 8px;
        border-radius: 999px;
        background: ${background};
        color: #ffffff;
        border: 3px solid #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 900;
        font-size: 13px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.45);
        white-space: nowrap;
      ">
        ${text}
      </div>
    `,
    iconSize: [variant === "start" ? 52 : 36, 32],
    iconAnchor: [variant === "start" ? 26 : 18, 16],
    popupAnchor: [0, -18],
  });
}

function getBearingDegree(from: Location, to: Location): number {
  const lat1 = (from.lat * Math.PI) / 180;
  const lat2 = (to.lat * Math.PI) / 180;
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function createDirectionArrowIcon(degree: number, color: string) {
  return L.divIcon({
    className: "",
    html: `
      <div style="
        width: 26px;
        height: 26px;
        border-radius: 999px;
        background: #ffffff;
        color: ${color};
        border: 2px solid ${color};
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 15px;
        font-weight: 900;
        box-shadow: 0 3px 10px rgba(0,0,0,0.28);
      ">
        <span style="
          display: inline-block;
          transform: rotate(${degree - 90}deg);
        ">
          ➤
        </span>
      </div>
    `,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

function createSegmentLabelIcon(label: string, color: string) {
  return L.divIcon({
    className: "",
    html: `
      <div style="
        padding: 5px 8px;
        border-radius: 999px;
        background: ${color};
        color: #ffffff;
        border: 2px solid #ffffff;
        font-size: 12px;
        font-weight: 900;
        box-shadow: 0 3px 10px rgba(0,0,0,0.35);
        white-space: nowrap;
      ">
        ${label}
      </div>
    `,
    iconSize: [54, 26],
    iconAnchor: [27, 13],
  });
}

function toLocation(point: [number, number]): Location {
  return {
    lat: point[0],
    lng: point[1],
  };
}

function createDirectionMarkersFromPath(routePath: [number, number][]) {
  if (routePath.length < 2) {
    return [];
  }

  const maxStartIndex = routePath.length - 2;

  const indexes = Array.from(
    new Set(
      [0.25, 0.5, 0.75].map((ratio) =>
        Math.min(maxStartIndex, Math.max(0, Math.round(maxStartIndex * ratio)))
      )
    )
  );

  return indexes.map((index) => {
    const from = toLocation(routePath[index]);
    const to = toLocation(routePath[index + 1]);

    return {
      id: `direction-${index}`,
      position: {
        lat: (from.lat + to.lat) / 2,
        lng: (from.lng + to.lng) / 2,
      },
      degree: getBearingDegree(from, to),
      color: "#f97316",
    };
  });
}

function createSegmentDirectionMarkers(segments: WalkingRouteSegment[]) {
  return segments
    .filter((segment) => segment.path.length >= 2)
    .map((segment, index) => {
      const middleIndex = Math.max(
        0,
        Math.min(segment.path.length - 2, Math.floor(segment.path.length / 2))
      );

      const from = toLocation(segment.path[middleIndex]);
      const to = toLocation(segment.path[middleIndex + 1]);
      const style = SEGMENT_STYLES[index % SEGMENT_STYLES.length];

      return {
        id: `segment-direction-${segment.id}`,
        position: {
          lat: (from.lat + to.lat) / 2,
          lng: (from.lng + to.lng) / 2,
        },
        degree: getBearingDegree(from, to),
        color: style.color,
      };
    });
}

function createSegmentLabelMarkers(segments: WalkingRouteSegment[]) {
  return segments
    .filter((segment) => segment.path.length >= 2)
    .map((segment, index) => {
      const middleIndex = Math.floor(segment.path.length / 2);
      const point = segment.path[middleIndex];
      const style = SEGMENT_STYLES[index % SEGMENT_STYLES.length];

      return {
        id: `segment-label-${segment.id}`,
        label: style.label,
        position: {
          lat: point[0],
          lng: point[1],
        },
        color: style.color,
      };
    });
}

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
  walkingRoutePath,
  walkingRouteSegments,
}: MapViewProps) {
  const straightRoutePath: [number, number][] = [
    [routeStartLocation.lat, routeStartLocation.lng],
    ...routePins.map((pin) => [pin.lat, pin.lng] as [number, number]),
  ];

  const routePath: [number, number][] =
    walkingRoutePath && walkingRoutePath.length >= 2
      ? walkingRoutePath
      : straightRoutePath;

  const hasSegmentPaths = walkingRouteSegments.some(
    (segment) => segment.path.length >= 2
  );

  const directionMarkers = hasSegmentPaths
    ? createSegmentDirectionMarkers(walkingRouteSegments)
    : createDirectionMarkersFromPath(routePath);

  const segmentLabelMarkers = hasSegmentPaths
    ? createSegmentLabelMarkers(walkingRouteSegments)
    : [];

  const routePinIdSet = new Set(routePins.map((pin) => pin.id));
  const nonRoutePins = pins.filter((pin) => !routePinIdSet.has(pin.id));

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
          zIndexOffset={1000}
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
        {nonRoutePins.map((pin) => {
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

      {hasSegmentPaths ? (
        <>
          {walkingRouteSegments.map((segment) => {
            if (segment.path.length < 2) {
              return null;
            }

            return (
              <Polyline
                key={`${segment.id}-shadow`}
                positions={segment.path}
                pathOptions={{
                  weight: 11,
                  opacity: 0.28,
                  color: "#111827",
                  lineCap: "round",
                  lineJoin: "round",
                }}
              />
            );
          })}

          {walkingRouteSegments.map((segment) => {
            if (segment.path.length < 2) {
              return null;
            }

            return (
              <Polyline
                key={`${segment.id}-outline`}
                positions={segment.path}
                pathOptions={{
                  weight: 8,
                  opacity: 0.95,
                  color: "#ffffff",
                  lineCap: "round",
                  lineJoin: "round",
                }}
              />
            );
          })}

          {walkingRouteSegments.map((segment, index) => {
            if (segment.path.length < 2) {
              return null;
            }

            const style = SEGMENT_STYLES[index % SEGMENT_STYLES.length];

            return (
              <Polyline
                key={segment.id}
                positions={segment.path}
                pathOptions={{
                  weight: 5,
                  opacity: 0.98,
                  color: style.color,
                  dashArray: style.dashArray,
                  lineCap: "round",
                  lineJoin: "round",
                }}
              />
            );
          })}
        </>
      ) : (
        routePath.length >= 2 && (
          <>
            <Polyline
              positions={routePath}
              pathOptions={{
                weight: 11,
                opacity: 0.35,
                color: "#111827",
                lineCap: "round",
                lineJoin: "round",
              }}
            />

            <Polyline
              positions={routePath}
              pathOptions={{
                weight: 8,
                opacity: 0.95,
                color: "#ffffff",
                lineCap: "round",
                lineJoin: "round",
              }}
            />

            <Polyline
              positions={routePath}
              pathOptions={{
                weight: 5,
                opacity: 0.98,
                color: walkingRoutePath ? "#f97316" : "#2563eb",
                lineCap: "round",
                lineJoin: "round",
              }}
            />
          </>
        )
      )}

      <Marker
        position={[routeStartLocation.lat, routeStartLocation.lng]}
        icon={createRouteOrderIcon("출발", "start")}
        zIndexOffset={1200}
      >
        <Popup>
          <strong>출발 지점</strong>
          <br />
          {userLocation
            ? "현재 위치 기준으로 추천 루트를 시작합니다."
            : "기본 위치 기준으로 추천 루트를 시작합니다."}
        </Popup>
      </Marker>

      {routePins.map((pin, index) => (
        <Marker
          key={`route-order-${pin.id}`}
          position={[pin.lat, pin.lng]}
          icon={createRouteOrderIcon(String(index + 1), "stop")}
          zIndexOffset={1200}
        >
          <Popup>
            <strong>{index + 1}번째 경유지</strong>
            <br />
            {pin.name}
          </Popup>
        </Marker>
      ))}

      {segmentLabelMarkers.map((marker) => (
        <Marker
          key={marker.id}
          position={[marker.position.lat, marker.position.lng]}
          icon={createSegmentLabelIcon(marker.label, marker.color)}
          interactive={false}
          zIndexOffset={950}
        />
      ))}

      {directionMarkers.map((marker) => (
        <Marker
          key={marker.id}
          position={[marker.position.lat, marker.position.lng]}
          icon={createDirectionArrowIcon(marker.degree, marker.color)}
          interactive={false}
          zIndexOffset={900}
        />
      ))}
    </MapContainer>
  );
}