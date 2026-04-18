import { createCookie } from "@remix-run/node";

export const themeCookie = createCookie("theme", {
  maxAge: 31536000, // 1 year
  path: "/",
  httpOnly: false, // Allow client-side access if needed
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
});

export async function getTheme(request: Request) {
  const cookieHeader = request.headers.get("Cookie");
  const theme = await themeCookie.parse(cookieHeader);
  return theme || "dark"; // Default to dark
}

export async function setTheme(theme: string) {
  return await themeCookie.serialize(theme);
}
