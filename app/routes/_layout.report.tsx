import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { useOutletContext, useNavigate, useActionData } from "@remix-run/react";
import { useEffect, useState, useCallback } from "react";
import { MobileBottomPanel } from "../components/panels/MobileBottomPanel";
import { ReportForm } from "../components/ReportForm";
import { getPool } from "../db.server";
import { useToast } from "../contexts/ToastContext";
import { hapticSuccess } from "../utils/haptic";
import { getAddressFromCoords, generateIssueSlug } from "../utils/geo.server";
import crypto from 'crypto';

export async function loader({ request }: LoaderFunctionArgs) {
  // We can pre-fetch some data here if needed, but the form handles its own lookups
  return json({});
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  
  const type = formData.get("type") as string;
  const magnitude = parseInt(formData.get("magnitude") as string);
  const note = formData.get("note") as string;
  const lat = parseFloat(formData.get("lat") as string);
  const lng = parseFloat(formData.get("lng") as string);

  if (type === 'misc' && (!note || note.trim() === '')) {
    return json({ error: "Description is required for Miscellaneous issues." }, { status: 400 });
  }
  const mla_name = formData.get("mla_name") as string;
  const party = formData.get("party") as string;
  const ac_name = formData.get("ac_name") as string;
  const st_name = formData.get("st_name") as string;
  const imageFile = formData.get("image") as File;

  let imageUrl = "";

  // 1. Upload Image to ImgBB (Secure hybrid approach)
  if (imageFile && imageFile.size > 0) {
    const IMGBB_API_KEY = process.env.IMGBB_API_KEY;
    if (!IMGBB_API_KEY) {
      return json({ error: "Missing Image Hosting API Key" }, { status: 500 });
    }

    const imgbbForm = new FormData();
    // Convert Blob/File to base64 for ImgBB API
    const buffer = await imageFile.arrayBuffer();
    const base64Image = Buffer.from(buffer).toString("base64");
    imgbbForm.append("image", base64Image);

    try {
      const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
        method: "POST",
        body: imgbbForm,
      });
      const result = await response.json();
      if (result.success) {
        imageUrl = result.data.url;
      } else {
        return json({ error: "Image upload failed: " + result.error.message }, { status: 500 });
      }
    } catch (err) {
      console.error("ImgBB Upload error:", err);
      return json({ error: "Image upload service unavailable" }, { status: 500 });
    }
  }

  // 2. Geocoding and Slug Generation
  const { location, city } = await getAddressFromCoords(lat, lng);
  const newIssueId = crypto.randomUUID();
  const slug = generateIssueSlug(type, location, city, newIssueId);

  // 3. Save to Database using a Transaction
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const issueSql = `
      INSERT INTO issues (
        id, slug, type, geom, reported_by, magnitude, 
        reported_mla_name, reported_mla_party, reported_ac_name, reported_st_name, status
      ) 
      VALUES ($1, $2, $3, ST_SetSRID(ST_Point($4, $5), 4326), $6, $7, $8, $9, $10, $11, 'active')
      RETURNING slug;
    `;

    const issueResult = await client.query(issueSql, [
      newIssueId, slug, type, lng, lat, "anonymous_voter", magnitude,
      mla_name || null, party || null, ac_name || null, st_name || 'India'
    ]);

    const updateId = crypto.randomUUID();
    const updateSql = `
      INSERT INTO issue_updates (id, issue_id, status, note)
      VALUES ($1, $2, 'active', $3)
    `;
    await client.query(updateSql, [updateId, newIssueId, note || null]);

    if (imageUrl) {
      const mediaId = crypto.randomUUID();
      const mediaSql = `
        INSERT INTO media (id, update_id, image_url)
        VALUES ($1, $2, $3)
      `;
      await client.query(mediaSql, [mediaId, updateId, imageUrl]);
    }

    await client.query('COMMIT');
    return json({ success: true, slug: issueResult.rows[0].slug });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Database error:", err);
    return json({ error: "Failed to save report to database" }, { status: 500 });
  } finally {
    client.release();
  }
}

export default function ReportRoute() {
  const navigate = useNavigate();
  
  // Get report state from Outlet context (Step 1 adjustment)
  const { reportCoordinates, setReportCoordinates, map } = useOutletContext<{
    reportCoordinates: [number, number] | null;
    setReportCoordinates: (loc: [number, number] | null) => void;
    map: any;
  }>();

  // Do not initialize coordinates on mount - wait for user to tap map
  useEffect(() => {
    // This space intentionally left blank or removed
  }, []);

  // Form handles its own success notification via fetcher.data now.

  const handleClose = useCallback(() => {
    navigate("/");
    setReportCoordinates(null);
  }, [navigate, setReportCoordinates]);

  const [isMobileDevice, setIsMobileDevice] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobileDevice(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <MobileBottomPanel onClose={handleClose}>
      <ReportForm isMobile={isMobileDevice} onCancel={handleClose} />
    </MobileBottomPanel>
  );
}
