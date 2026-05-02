import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { Form, useActionData, useNavigation } from "@remix-run/react";
import { getAdminSession, createAdminSession } from "../utils/session.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getAdminSession(request);
  if (session.has("adminId")) {
    return redirect("/admin/map");
  }
  return json({});
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const password = formData.get("password");

  if (password !== process.env.ADMIN_PASSWORD) {
    return json({ error: "Invalid password" }, { status: 401 });
  }

  return createAdminSession(request, "/admin/map");
}

export default function AdminLogin() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#111827',
      color: '#f9fafb',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        backgroundColor: '#1f2937',
        padding: '2.5rem',
        borderRadius: '1rem',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.25)',
        width: '100%',
        maxWidth: '380px'
      }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '2rem', textAlign: 'center', letterSpacing: '0.05em' }}>
          ADMIN PORTAL
        </h1>
        
        <Form method="post" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label htmlFor="password" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#9ca3af' }}>
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              required
              autoFocus
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '0.5rem',
                border: '1px solid #374151',
                backgroundColor: '#111827',
                color: '#f9fafb',
                outline: 'none',
                fontSize: '1rem',
                boxSizing: 'border-box'
              }}
            />
            {actionData?.error && (
              <p style={{ color: '#ef4444', fontSize: '0.875rem', marginTop: '0.5rem', textAlign: 'center' }}>
                {actionData.error}
              </p>
            )}
          </div>
          
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              width: '100%',
              padding: '0.875rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              fontWeight: 'bold',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              opacity: isSubmitting ? 0.7 : 1,
              marginTop: '0.5rem',
              transition: 'background-color 0.2s',
              fontSize: '1rem'
            }}
          >
            {isSubmitting ? "Authenticating..." : "Login"}
          </button>
        </Form>
      </div>
    </div>
  );
}
