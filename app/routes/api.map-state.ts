import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { query } from "../db.server";

interface IssueRow {
  id: string;
  slug: string;
  type: string;
  lat: string;
  lng: string;
  createdAt: Date;
  approved: boolean;
  votes_true: number;
  votes_false: number;
  resolve_votes: number;
  magnitude: number;
  status: string;
  updated_at: Date;
  reported_mla_name?: string;
  reported_mla_party?: string;
  reported_ac_name?: string;
  reported_st_name?: string;
  reported_dist_name?: string;
  current_mla_name?: string;
  current_mla_party?: string;
  current_ac_name?: string;
  current_st_name?: string;
  current_dist_name?: string;
  resolution_image_url?: string;
  resolution_upvotes: number;
  resolution_downvotes: number;
  images: string[];
}

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const timestamp = url.searchParams.get("timestamp");
  const qMinLng = url.searchParams.get("minLng");
  const qMinLat = url.searchParams.get("minLat");
  const qMaxLng = url.searchParams.get("maxLng");
  const qMaxLat = url.searchParams.get("maxLat");

  const targetTime = timestamp ? new Date(timestamp) : new Date();

  // Parse and validate coordinates for spatial stability
  const minLng = parseFloat(qMinLng || "");
  const minLat = parseFloat(qMinLat || "");
  const maxLng = parseFloat(qMaxLng || "");
  const maxLat = parseFloat(qMaxLat || "");

  const hasValidBounds = !isNaN(minLng) && !isNaN(minLat) && !isNaN(maxLng) && !isNaN(maxLat) &&
      minLng >= -180 && minLng <= 180 &&
      maxLng >= -180 && maxLng <= 180 &&
      minLat >= -90 && minLat <= 90 &&
      maxLat >= -90 && maxLat <= 90;

  try {
    const sql = `
      SELECT 
        i.id,
        i.slug,
        i.type,
        ST_Y(i.geom::geometry) as lat,
        ST_X(i.geom::geometry) as lng,
        i.created_at as "createdAt",
        i.approved,
        i.votes_true,
        i.votes_false,
        i.resolve_votes,
        i.magnitude,
        i.status,
        i.resolution_image_url,
        i.resolution_upvotes,
        i.resolution_downvotes,
        u.timestamp as updated_at,
        u.note,
        i.reported_mla_name,
        i.reported_mla_party,
        i.reported_ac_name,
        i.reported_st_name,
        i.reported_dist_name,
        ac.mla_name as current_mla_name,
        ac.party as current_mla_party,
        ac.ac_name as current_ac_name,
        ac.st_name as current_st_name,
        ac.dist_name as current_dist_name,
        COALESCE(json_agg(distinct m.image_url) FILTER (WHERE m.image_url IS NOT NULL), '[]') as images
      FROM issues i
      JOIN LATERAL (
        SELECT * FROM issue_updates
        WHERE issue_id = i.id AND timestamp <= $1
        ORDER BY timestamp DESC
        LIMIT 1
      ) u ON true
      LEFT JOIN media m ON m.update_id = u.id
      LEFT JOIN mla_data ac ON ST_Contains(ac.geom, i.geom::geometry)
      ${hasValidBounds 
        ? "WHERE i.status != 'resolved' AND ST_Intersects(i.geom, ST_MakeEnvelope($2, $3, $4, $5, 4326))"
        : "WHERE i.status != 'resolved'"
      }
      GROUP BY i.id, i.slug, i.type, i.geom, i.reported_by, i.created_at, i.approved, i.votes_true, i.votes_false, i.resolve_votes, i.magnitude, i.status, i.resolution_image_url, i.resolution_upvotes, i.resolution_downvotes, u.id, u.status, u.timestamp, u.note, i.reported_mla_name, i.reported_mla_party, i.reported_ac_name, i.reported_st_name, i.reported_dist_name, ac.id
      ORDER BY i.created_at DESC
      ${hasValidBounds ? '' : 'LIMIT 5000'};
    `;

    const params = hasValidBounds 
        ? [targetTime, minLng, minLat, maxLng, maxLat] 
        : [targetTime];

    const result = await query(sql, params);

    const issues = result.rows.map((row: IssueRow) => ({
        ...row,
        location: [parseFloat(row.lat), parseFloat(row.lng)],
        images: row.images
    }));

    // IP-based geolocation headers
    const ipLat = request.headers.get('x-vercel-ip-latitude') || request.headers.get('x-render-lat');
    const ipLng = request.headers.get('x-vercel-ip-longitude') || request.headers.get('x-render-lon');

    let userDefaultLocation = null;
    if (ipLat && ipLng) {
        const lat = parseFloat(ipLat);
        const lng = parseFloat(ipLng);
        if (!isNaN(lat) && !isNaN(lng)) {
            userDefaultLocation = [lat, lng];
        }
    }

    return json({
        timestamp: targetTime.toISOString(),
        issues,
        userDefaultLocation
    });
  } catch (error) {
    console.error('Error fetching map state:', error);
    return json({ error: 'Failed to fetch map state' }, { status: 500 });
  }
}
