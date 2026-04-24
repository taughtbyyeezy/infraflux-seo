import { json, type ActionFunctionArgs } from "@remix-run/node";

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  const IMGBB_API_KEY = process.env.IMGBB_API_KEY || process.env.VITE_IMGBB_API_KEY;
  if (!IMGBB_API_KEY) {
    return json({ error: "Image hosting service not configured" }, { status: 500 });
  }

  try {
    const formData = await request.formData();
    const image = formData.get("image");

    if (!image || !(image instanceof File)) {
      return json({ error: "No image provided" }, { status: 400 });
    }

    const imgbbForm = new FormData();
    const buffer = await image.arrayBuffer();
    const base64Image = Buffer.from(buffer).toString("base64");
    imgbbForm.append("image", base64Image);

    const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
      method: "POST",
      body: imgbbForm,
    });

    const result = await response.json();

    if (result.success) {
      return json({ success: true, data: { url: result.data.url } });
    } else {
      return json({ error: result.error?.message || "Upload failed" }, { status: 500 });
    }
  } catch (err) {
    console.error("Upload proxy error:", err);
    return json({ error: "Internal server error during upload" }, { status: 500 });
  }
}
