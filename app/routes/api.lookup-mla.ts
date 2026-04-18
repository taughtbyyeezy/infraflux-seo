import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { query } from "../db.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const lat = parseFloat(url.searchParams.get("lat") || "");
  const lng = parseFloat(url.searchParams.get("lng") || "");

  if (isNaN(lat) || isNaN(lng)) {
    return json({ found: false, error: "Invalid coordinates" }, { status: 400 });
  }

  try {
    const sql = `
        SELECT 
            ac_name,
            mla_name,
            party,
            st_name,
            dist_name
        FROM mla_data 
        WHERE ST_Contains(geom, ST_SetSRID(ST_Point($1, $2), 4326))
        LIMIT 1;
    `;

    const result = await query(sql, [lng, lat]);

    if (result.rows.length === 0) {
      return json({ found: false });
    }

    return json({
      found: true,
      ...result.rows[0]
    });
  } catch (error) {
    console.error("Error looking up MLA:", error);
    return json({ found: false, error: "Internal server error" }, { status: 500 });
  }
}
