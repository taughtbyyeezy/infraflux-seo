import { json, redirect, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData, useFetcher, Link } from "@remix-run/react";
import { query } from "../db.server";
import { Check, CheckCircle, MapPin, Clock, ArrowLeft, Activity } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const adminSecret = process.env.ADMIN_SECRET || "admin";
  if (params.secret !== adminSecret) {
    return redirect("/");
  }

  const res = await query(`
    SELECT 
      i.*,
      ST_Y(i.geom::geometry) as lat,
      ST_X(i.geom::geometry) as lng
    FROM issues i
    ORDER BY created_at DESC
  `);

  const issues = res.rows.map(row => ({
    ...row,
    location: [parseFloat(row.lat), parseFloat(row.lng)]
  }));

  return json({ issues });
}

export async function action({ request, params }: ActionFunctionArgs) {
  const adminSecret = process.env.ADMIN_SECRET || "admin";
  if (params.secret !== adminSecret) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const id = formData.get("id");
  const intent = formData.get("intent");

  // Simple secret check for demo purposes
  // In production, use session-based auth
  
  if (intent === "approve") {
    await query("UPDATE issues SET approved = true, status = 'active' WHERE id = $1", [id]);
    return json({ success: true });
  }

  if (intent === "resolve") {
    await query("UPDATE issues SET status = 'resolved' WHERE id = $1", [id]);
    return json({ success: true });
  }

  return json({ error: "Invalid intent" }, { status: 400 });
}

export default function AdminDashboard() {
  const { issues } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const [activeTab, setActiveTab] = useState<'pending' | 'active' | 'resolved'>('pending');

  const pendingIssues = issues.filter((i: any) => !i.approved && i.status !== 'resolved');
  const activeIssues = issues.filter((i: any) => i.approved && i.status !== 'resolved');
  const resolvedIssues = issues.filter((i: any) => i.status === 'resolved');

  const currentList = activeTab === 'pending' ? pendingIssues : activeTab === 'active' ? activeIssues : resolvedIssues;

  return (
    <div style={{ padding: '1.5rem', maxWidth: '900px', margin: '0 auto', color: 'var(--text-primary)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link to="/" style={{ color: 'var(--text-muted)' }}><ArrowLeft size={24} /></Link>
          <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Admin Dashboard</h1>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ background: 'var(--glass-card)', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700 }}>{pendingIssues.length}</div>
          <div style={{ color: 'var(--mag-mod-text)', fontSize: '0.75rem' }}>Pending</div>
        </div>
        <div style={{ background: 'var(--glass-card)', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700 }}>{activeIssues.length}</div>
          <div style={{ color: 'var(--mag-high-text)', fontSize: '0.75rem' }}>Active</div>
        </div>
        <div style={{ background: 'var(--glass-card)', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700 }}>{resolvedIssues.length}</div>
          <div style={{ color: 'var(--mag-low-text)', fontSize: '0.75rem' }}>Resolved</div>
        </div>
      </div>

      <div style={{ display: 'flex', marginBottom: '1rem', gap: '2px' }}>
        <button 
          onClick={() => setActiveTab('pending')}
          style={{ flex: 1, padding: '0.75rem', background: activeTab === 'pending' ? 'var(--accent)' : 'var(--glass-card)', border: 'none', color: activeTab === 'pending' ? 'white' : 'var(--text-primary)', cursor: 'pointer', borderRadius: '8px 0 0 8px' }}
        >
          Pending
        </button>
        <button 
          onClick={() => setActiveTab('active')}
          style={{ flex: 1, padding: '0.75rem', background: activeTab === 'active' ? 'var(--accent)' : 'var(--glass-card)', border: 'none', color: activeTab === 'active' ? 'white' : 'var(--text-primary)', cursor: 'pointer' }}
        >
          Active
        </button>
        <button 
          onClick={() => setActiveTab('resolved')}
          style={{ flex: 1, padding: '0.75rem', background: activeTab === 'resolved' ? 'var(--accent)' : 'var(--glass-card)', border: 'none', color: activeTab === 'resolved' ? 'white' : 'var(--text-primary)', cursor: 'pointer', borderRadius: '0 8px 8px 0' }}
        >
          Resolved
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {currentList.map((issue: any) => (
          <div key={issue.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--glass-card)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="mobile-report-label" style={{ fontSize: '0.6rem' }}>{issue.type}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{format(new Date(issue.created_at || issue.createdAt), 'PP')}</span>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <MapPin size={12} style={{ marginRight: '4px' }} />
                {issue.location[0].toFixed(4)}, {issue.location[1].toFixed(4)}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {activeTab === 'pending' && (
                <fetcher.Form method="post">
                  <input type="hidden" name="id" value={issue.id} />
                  <input type="hidden" name="intent" value="approve" />
                  <button type="submit" style={{ background: 'var(--mag-low-text)', border: 'none', color: 'white', padding: '0.4rem 0.75rem', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Check size={16} /> Approve
                  </button>
                </fetcher.Form>
              )}
              {activeTab === 'active' && (
                <fetcher.Form method="post">
                  <input type="hidden" name="id" value={issue.id} />
                  <input type="hidden" name="intent" value="resolve" />
                  <button type="submit" style={{ background: 'var(--accent)', border: 'none', color: 'white', padding: '0.4rem 0.75rem', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <CheckCircle size={16} /> Resolve
                  </button>
                </fetcher.Form>
              )}
            </div>
          </div>
        ))}
        {currentList.length === 0 && <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No issues found.</div>}
      </div>
    </div>
  );
}
