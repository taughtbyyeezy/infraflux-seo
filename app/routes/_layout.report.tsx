import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { useOutletContext, useNavigate, useActionData } from "@remix-run/react";
import { useEffect, useState } from "react";
import { MobileBottomPanel } from "../../src/components/panels/MobileBottomPanel";
import { ReportForm } from "../components/ReportForm";
import { query } from "../db.server";
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
  const mla_name = formData.get("mla_name") as string;
  const party = formData.get("party") as string;
  const ac_name = formData.get("ac_name") as string;
  const st_name = formData.get("st_name") as string;
  const imageFile = formData.get("image") as File;

  let imageUrl = "";

  // 1. Upload Image to ImgBB (Secure hybrid approach)
  if (imageFile && imageFile.size > 0) {
    const IMGBB_API_KEY = process.env.VITE_IMGBB_API_KEY || process.env.IMGBB_API_KEY;
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

  // 3. Save to Database
  try {
    const sql = `
      INSERT INTO issues (
        id,
        slug,
        type, 
        geom, 
        reported_by, 
        magnitude, 
        reported_mla_name, 
        reported_mla_party, 
        reported_ac_name, 
        reported_st_name,
        status,
        resolution_image_url
      ) 
      VALUES ($1, $2, $3, ST_SetSRID(ST_Point($4, $5), 4326), $6, $7, $8, $9, $10, $11, 'active', $12)
      RETURNING slug;
    `;

    const result = await query(sql, [
      newIssueId,
      slug,
      type,
      lng,
      lat,
      "anonymous_voter", // Default for now
      magnitude,
      mla_name || null,
      party || null,
      ac_name || null,
      st_name || 'India',
      imageUrl
    ]);

    return json({ success: true, slug: result.rows[0].slug });
  } catch (err) {
    console.error("Database error:", err);
    return json({ error: "Failed to save report to database" }, { status: 500 });
  }
}

export default function ReportRoute() {
  const navigate = useNavigate();
  const actionData = useActionData<typeof action>();
  const { addToast } = useToast();
  
  // Get report state from Outlet context (Step 1 adjustment)
  const { reportCoordinates, setReportCoordinates, map } = useOutletContext<{
    reportCoordinates: [number, number] | null;
    setReportCoordinates: (loc: [number, number] | null) => void;
    map: any;
  }>();

  // On mount, if no coordinates, set them to map center
  useEffect(() => {
    if (!reportCoordinates && map) {
      const center = map.getCenter();
      setReportCoordinates([center.lat, center.lng]);
    }
  }, [map]);

  useEffect(() => {
    if (actionData?.success && actionData.slug) {
      hapticSuccess();
      addToast("Issue reported successfully!", "success");
      navigate(`/issue/${actionData.slug}`);
      // Reset report coordinates
      setReportCoordinates(null);
    } else if (actionData?.error) {
      addToast(actionData.error, "error");
    }
  }, [actionData]);

  const handleClose = () => {
    navigate("/");
    setReportCoordinates(null);
  };

  return (
    <MobileBottomPanel onClose={handleClose} height={0.9}>
      <ReportForm isMobile={true} onCancel={handleClose} />
    </MobileBottomPanel>
  );
}
