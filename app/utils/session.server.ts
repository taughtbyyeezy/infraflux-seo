import { createCookieSessionStorage, redirect } from "@remix-run/node";

const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  throw new Error("SESSION_SECRET must be set in environment variables");
}

export const storage = createCookieSessionStorage({
  cookie: {
    name: "admin_session",
    secure: process.env.NODE_ENV === "production",
    secrets: [sessionSecret],
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    httpOnly: true,
  },
});

export async function requireAdminSession(request: Request) {
  const session = await storage.getSession(request.headers.get("Cookie"));
  if (!session.has("adminId")) {
    throw redirect("/admin/login");
  }
  return session;
}

export async function createAdminSession(request: Request, redirectTo: string) {
  const session = await storage.getSession(request.headers.get("Cookie"));
  session.set("adminId", "admin_user"); // Single user system
  
  return redirect(redirectTo, {
    headers: {
      "Set-Cookie": await storage.commitSession(session),
    },
  });
}

export async function getAdminSession(request: Request) {
  return storage.getSession(request.headers.get("Cookie"));
}
