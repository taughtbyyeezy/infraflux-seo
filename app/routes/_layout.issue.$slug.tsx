import { json, type LoaderFunctionArgs, type MetaFunction } from "@remix-run/node";
import { useLoaderData, useNavigate, useOutletContext } from "@remix-run/react";
import { query } from "../db.server";
import { MobileBottomPanel } from "../components/panels/MobileBottomPanel";
import { IssueDetails } from "../components/ui/IssueDetails";
import { hapticButton } from "../utils/haptic";

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  if (!data) return [{ title: "Issue Not Found | InfraFlux" }];
  const { issue } = data;
  return [
    { title: `Fix ${issue.type} at ${issue.location[0].toFixed(4)}, ${issue.location[1].toFixed(4)} | InfraFlux` },
    { name: "description", content: `Evidence of ${issue.type} reported in InfraFlux. Help verify and fix our city's infrastructure.` },
    { property: "og:title", content: `Issue: ${issue.type} | InfraFlux` },
    { property: "og:image", content: issue.images?.[0] || "/og-image.png" },
  ];
};

export async function loader({ params }: LoaderFunctionArgs) {
  const { slug } = params;
  
  const sql = `
    SELECT 
      i.*,
      ST_Y(i.geom::geometry) as lat,
      ST_X(i.geom::geometry) as lng,
      COALESCE(json_agg(distinct m.image_url) FILTER (WHERE m.image_url IS NOT NULL), '[]') as images,
      ac.mla_name as current_mla_name,
      ac.party as current_mla_party,
      ac.ac_name as current_ac_name,
      ac.st_name as current_st_name,
      ac.dist_name as current_dist_name
    FROM issues i
    LEFT JOIN issue_updates u ON u.issue_id = i.id
    LEFT JOIN media m ON m.update_id = u.id
    LEFT JOIN mla_data ac ON ST_Contains(ac.geom, i.geom::geometry)
    WHERE i.slug = $1
    GROUP BY i.id, ac.id
    LIMIT 1;
  `;

  const result = await query(sql, [slug]);
  
  if (result.rows.length === 0) {
    throw new Response("Not Found", { status: 404 });
  }

  const issue = {
    ...result.rows[0],
    location: [parseFloat(result.rows[0].lat), parseFloat(result.rows[0].lng)],
    images: result.rows[0].images || []
  };

  return json({ issue });
}

export default function IssueDetailRoute() {
  const { issue } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const { userLocation } = useOutletContext<any>();

  const magnitudeLabel = (mag: number) => {
    if (mag <= 3) return 'Low';
    if (mag <= 7) return 'Moderate';
    return 'High';
  };

  const handleClose = () => {
    hapticButton();
    navigate("/");
  };

  return (
    <MobileBottomPanel onClose={handleClose} height={0.65}>
      <IssueDetails 
        issue={issue} 
        magnitudeLabel={magnitudeLabel}
        userLocation={userLocation}
        onStatusUpdate={() => {
          // Trigger revalidation if needed
        }}
      />
    </MobileBottomPanel>
  );
}
