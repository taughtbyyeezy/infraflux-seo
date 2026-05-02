import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { requireAdminSession } from "../utils/session.server";
import { useLoaderData, useFetcher, useRouteLoaderData } from "@remix-run/react";
import { useState, useEffect } from "react";
import { query } from "../db.server";
import { Map } from "../components/ui/MapLibre";
import { ZoomHandler } from "../components/map/ZoomHandler";
import { MapRegister } from "../components/map/MapRegister";
import { IssuesLayer } from "../components/map/IssuesLayer";
import { X, Trash2, Moon, Sun } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export async function loader({ request }: LoaderFunctionArgs) {
  await requireAdminSession(request);

  // Fetch ALL issues for admin, including resolved
  const sql = `
    SELECT 
      i.id, i.slug, i.type, i.status, 
      ST_Y(i.geom::geometry) as lat, 
      ST_X(i.geom::geometry) as lng,
      (SELECT note FROM issue_updates u WHERE u.issue_id = i.id ORDER BY created_at ASC LIMIT 1) as note,
      (SELECT image_url FROM media m JOIN issue_updates u ON m.update_id = u.id WHERE u.issue_id = i.id LIMIT 1) as image_url
    FROM issues i
  `;
  const result = await query(sql);
  
  const issues = result.rows.map((row: any) => ({
    ...row,
    location: [parseFloat(row.lat), parseFloat(row.lng)],
    images: row.image_url ? [row.image_url] : []
  }));

  return json({ issues });
}

export async function action({ request }: ActionFunctionArgs) {
  await requireAdminSession(request);

  const formData = await request.formData();
  const intent = formData.get("intent");
  const id = formData.get("id");

  if (intent === "update_status") {
    const status = formData.get("status");
    await query("UPDATE issues SET status = $1 WHERE id = $2", [status, id]);
    return json({ success: true });
  }

  if (intent === "delete_issue") {
    // Delete updates and media first if cascade is not enabled
    await query("DELETE FROM media WHERE update_id IN (SELECT id FROM issue_updates WHERE issue_id = $1)", [id]);
    await query("DELETE FROM issue_updates WHERE issue_id = $1", [id]);
    await query("DELETE FROM issues WHERE id = $1", [id]);
    return json({ success: true });
  }

  return json({ error: "Invalid intent" }, { status: 400 });
}

function AdminIssueDrawer({ issue, onClose }: { issue: any, onClose: () => void }) {
  const fetcher = useFetcher();
  const isDeleting = fetcher.state !== "idle" && fetcher.formData?.get("intent") === "delete_issue";
  const isUpdating = fetcher.state !== "idle" && fetcher.formData?.get("intent") === "update_status";

  return (
    <AnimatePresence>
      {issue && (
        <motion.div 
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '100%',
            maxWidth: '380px',
            height: '100%',
            background: 'white',
            zIndex: 1000,
            boxShadow: '-4px 0 15px rgba(0,0,0,0.1)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            overflowY: 'auto'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'bold', color: '#111' }}>Moderation</h2>
            <button 
                onClick={onClose} 
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <X size={24} color="#666" />
            </button>
          </div>

          {issue.images && issue.images.length > 0 ? (
            <img 
                src={issue.images[0]} 
                alt="Issue evidence" 
                style={{ width: '100%', borderRadius: '12px', objectFit: 'cover', maxHeight: '250px', background: '#f5f5f5' }} 
            />
          ) : (
            <div style={{ width: '100%', height: '150px', background: '#f5f5f5', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
                No Photo Evidence
            </div>
          )}

          <div style={{ background: '#f9fafb', padding: '16px', borderRadius: '12px', border: '1px solid #eee' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.85rem', color: '#666', textTransform: 'uppercase', fontWeight: 'bold' }}>Issue Type</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#111' }}>{issue.type}</span>
            </div>
            <div style={{ fontSize: '0.9rem', color: '#333', lineHeight: 1.5 }}>
              {issue.note || "No description provided."}
            </div>
          </div>

          <div style={{ borderTop: '1px solid #eee', paddingTop: '20px', marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            
            <fetcher.Form method="post">
              <input type="hidden" name="intent" value="update_status" />
              <input type="hidden" name="id" value={issue.id} />
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 'bold', color: '#555' }}>Update Status</label>
              <div style={{ position: 'relative' }}>
                <select 
                  name="status" 
                  defaultValue={issue.status} 
                  onChange={(e) => fetcher.submit(e.target.form)}
                  disabled={isUpdating}
                  style={{ 
                    width: '100%', 
                    padding: '12px 16px', 
                    borderRadius: '8px', 
                    border: '1px solid #ddd',
                    background: '#fff',
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    appearance: 'none',
                    fontWeight: 'bold',
                    color: issue.status === 'resolved' ? '#10b981' : issue.status === 'active' ? '#3b82f6' : '#f59e0b'
                  }}
                >
                  <option value="pending" style={{ color: '#f59e0b' }}>Pending</option>
                  <option value="active" style={{ color: '#3b82f6' }}>Active</option>
                  <option value="resolved" style={{ color: '#10b981' }}>Resolved</option>
                </select>
                <div style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#666' }}>
                  ▼
                </div>
              </div>
            </fetcher.Form>

            <fetcher.Form method="post" onSubmit={(e) => {
               if(!window.confirm("Are you sure you want to permanently delete this issue?")) {
                  e.preventDefault();
               } else {
                  setTimeout(onClose, 100);
               }
            }}>
              <input type="hidden" name="intent" value="delete_issue" />
              <input type="hidden" name="id" value={issue.id} />
              <button 
                type="submit" 
                disabled={isDeleting}
                style={{ 
                  width: '100%', 
                  padding: '14px', 
                  background: '#ef4444', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  transition: 'opacity 0.2s',
                  opacity: isDeleting ? 0.7 : 1
                }}
              >
                <Trash2 size={18} />
                {isDeleting ? "Deleting..." : "Permanently Delete"}
              </button>
            </fetcher.Form>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function AdminMapRoute() {
  const { issues: initialIssues } = useLoaderData<typeof loader>();
  const [issues, setIssues] = useState(initialIssues);
  const [zoom, setZoom] = useState(5);
  const [map, setMap] = useState<any>(null);
  const [selectedIssue, setSelectedIssue] = useState<any>(null);

  const themeFetcher = useFetcher();
  const { theme } = useRouteLoaderData("root") as { theme: "light" | "dark" };

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    themeFetcher.submit(
      { theme: nextTheme },
      { method: "post", action: "/api/set-theme" }
    );
  };

  useEffect(() => {
    setIssues(initialIssues);
    if (selectedIssue) {
        const updated = initialIssues.find((i: any) => i.id === selectedIssue.id);
        if (updated) setSelectedIssue(updated);
    }
  }, [initialIssues]);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      <Map
        projection={{ type: 'mercator' }}
        zoom={zoom}
        onZoomChange={setZoom}
        style={{ height: '100%', width: '100%' }}
        theme={theme}
      >
        <ZoomHandler onZoomChange={setZoom} />
        <MapRegister setMap={setMap} />
        <IssuesLayer 
          issues={issues} 
          zoom={zoom} 
          onSelect={(issue) => {
            setSelectedIssue(issue);
            if (map) {
                map.flyTo({
                    center: [issue.location[1], issue.location[0]],
                    zoom: 16,
                    duration: 800
                });
            }
          }} 
          onZoomChange={setZoom}
        />
      </Map>

      {/* Theme Toggle Button */}
      <button
        onClick={toggleTheme}
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          zIndex: 500,
          background: theme === 'dark' ? '#1f2937' : 'white',
          color: theme === 'dark' ? '#f3f4f6' : '#1f2937',
          border: 'none',
          borderRadius: '50%',
          width: '45px',
          height: '45px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          cursor: 'pointer'
        }}
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      <AdminIssueDrawer 
        issue={selectedIssue} 
        onClose={() => setSelectedIssue(null)} 
      />
    </div>
  );
}
