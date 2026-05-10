import type { Location, Pin } from "../types";

export type MapPath = [number, number][];

type OpenRouteServiceGeoJsonResponse = {
  features: Array<{
    geometry: {
      coordinates: [number, number][];
    };
  }>;
};

export async function fetchWalkingRoutePath(
  startLocation: Location,
  routePins: Pin[]
): Promise<MapPath> {
  const apiKey = import.meta.env.VITE_ORS_API_KEY;

  if (!apiKey) {
    throw new Error("OpenRouteService API key is missing.");
  }

  const coordinates = [
    [startLocation.lng, startLocation.lat],
    ...routePins.map((pin) => [pin.lng, pin.lat]),
  ];

  if (coordinates.length < 2) {
    return [];
  }

  const response = await fetch(
    "https://api.openrouteservice.org/v2/directions/foot-walking/geojson",
    {
      method: "POST",
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        coordinates,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Walking route request failed: ${response.status}`);
  }

  const data = (await response.json()) as OpenRouteServiceGeoJsonResponse;

  const routeCoordinates = data.features[0]?.geometry.coordinates ?? [];

  return routeCoordinates.map(([lng, lat]) => [lat, lng]);
}