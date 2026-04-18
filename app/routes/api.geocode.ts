import { json, type LoaderFunctionArgs } from "@remix-run/node";

/**
 * Proxy route for OpenStreetMap Nominatim API
 * strictly follows ToS by providing a custom User-Agent
 * and biases results to India (&countrycodes=in).
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q");
  const viewbox = url.searchParams.get("viewbox"); // minLng,maxLat,maxLng,minLat

  if (!q) {
    return json({ error: "Query parameter 'q' is required" }, { status: 400 });
  }

  try {
    const searchParams = new URLSearchParams({
      q,
      format: "json",
      limit: "5",
      countrycodes: "in", // Bias strictly to India
    });

    if (viewbox) {
      searchParams.append("viewbox", viewbox);
      searchParams.append("bounded", "0"); // Prioritize viewbox but don't strictly bind to it
    }

    const apiUrl = `https://nominatim.openstreetmap.org/search?${searchParams.toString()}`;

    const response = await fetch(apiUrl, {
      headers: {
        "User-Agent": "InfraFlux App (contact@infraflux.org)",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.statusText}`);
    }

    const data = await response.json();

    return json(data);
  } catch (error) {
    console.error("Geocoding proxy error:", error);
    return json(
      { error: "Failed to fetch location data" },
      { status: 500 }
    );
  }
}
