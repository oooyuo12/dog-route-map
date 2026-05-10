import type { Location, Pin } from "../types";

export type MapPath = [number, number][];

export type WalkingRouteStep = {
  instruction: string;
  distanceMeters: number;
  durationSeconds: number;
};

export type WalkingRouteSegment = {
  id: string;
  title: string;
  from: string;
  to: string;
  distanceMeters: number;
  durationSeconds: number;
  path: MapPath;
  steps: WalkingRouteStep[];
};

export type WalkingRouteResult = {
  path: MapPath;
  distanceMeters: number;
  durationSeconds: number;
  segments: WalkingRouteSegment[];
};

type OpenRouteServiceGeoJsonResponse = {
  features?: Array<{
    geometry?: {
      coordinates?: [number, number][];
    };
    properties?: {
      summary?: {
        distance: number;
        duration: number;
      };
      segments?: Array<{
        distance: number;
        duration: number;
        steps?: Array<{
          instruction: string;
          distance: number;
          duration: number;
          way_points?: [number, number];
        }>;
      }>;
    };
  }>;
};

function convertCoordinatesToPath(
  coordinates: [number, number][]
): MapPath {
  return coordinates.map(([lng, lat]) => [lat, lng]);
}

function getSegmentPath(
  routeCoordinates: [number, number][],
  segment: {
    steps?: Array<{
      way_points?: [number, number];
    }>;
  }
): MapPath {
  if (!segment.steps || segment.steps.length === 0) {
    return [];
  }

  const firstWayPoint = segment.steps[0]?.way_points?.[0];
  const lastWayPoint = segment.steps[segment.steps.length - 1]?.way_points?.[1];

  if (
    firstWayPoint === undefined ||
    lastWayPoint === undefined ||
    firstWayPoint < 0 ||
    lastWayPoint < firstWayPoint
  ) {
    return [];
  }

  const segmentCoordinates = routeCoordinates.slice(
    firstWayPoint,
    lastWayPoint + 1
  );

  return convertCoordinatesToPath(segmentCoordinates);
}

export async function fetchWalkingRoute(
  startLocation: Location,
  routePins: Pin[]
): Promise<WalkingRouteResult> {
  const apiKey = import.meta.env.VITE_ORS_API_KEY;

  if (!apiKey) {
    throw new Error("OpenRouteService API key is missing.");
  }

  const coordinates = [
    [startLocation.lng, startLocation.lat],
    ...routePins.map((pin) => [pin.lng, pin.lat]),
  ];

  if (coordinates.length < 2) {
    return {
      path: [],
      distanceMeters: 0,
      durationSeconds: 0,
      segments: [],
    };
  }

  const response = await fetch(
    "https://api.openrouteservice.org/v2/directions/foot-walking/geojson",
    {
      method: "POST",
      headers: {
        Authorization: apiKey,
        Accept: "application/json, application/geo+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        coordinates,
        instructions: true,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("OpenRouteService error:", response.status, errorText);

    throw new Error(
      `Walking route request failed: ${response.status} ${errorText}`
    );
  }

  const data = (await response.json()) as OpenRouteServiceGeoJsonResponse;
  const feature = data.features?.[0];

  const routeCoordinates = feature?.geometry?.coordinates ?? [];
  const path = convertCoordinatesToPath(routeCoordinates);

  const summary = feature?.properties?.summary;
  const rawSegments = feature?.properties?.segments ?? [];

  const segments: WalkingRouteSegment[] = rawSegments.map((segment, index) => {
    const from =
      index === 0
        ? "출발 지점"
        : routePins[index - 1]?.name ?? `${index}번 지점`;

    const to = routePins[index]?.name ?? `${index + 1}번 지점`;

    return {
      id: `segment-${index + 1}`,
      title: `${index + 1}구간`,
      from,
      to,
      distanceMeters: segment.distance,
      durationSeconds: segment.duration,
      path: getSegmentPath(routeCoordinates, segment),
      steps:
        segment.steps?.map((step) => ({
          instruction: step.instruction,
          distanceMeters: step.distance,
          durationSeconds: step.duration,
        })) ?? [],
    };
  });

  return {
    path,
    distanceMeters: summary?.distance ?? 0,
    durationSeconds: summary?.duration ?? 0,
    segments,
  };
}