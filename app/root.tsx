import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from "@remix-run/react";
import type { LinksFunction, LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { getTheme, setTheme } from "./utils/theme.server";
// ToastProvider removed in favor of zero-re-render Pub/Sub pattern
import { ToastContainer } from "./components/Toast";
import styles from "./styles/index.css?url";
import skeletonStyles from "./styles/Skeleton.css?url";
import toastStyles from "./styles/Toast.css?url";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: styles },
  { rel: "stylesheet", href: skeletonStyles },
  { rel: "stylesheet", href: toastStyles },
  { rel: "stylesheet", href: "https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.css" },
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
  { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" },
];

export async function loader({ request }: LoaderFunctionArgs) {
  const theme = await getTheme(request);
  return json({ theme });
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const theme = formData.get("theme") as string;
  return json({ success: true }, {
    headers: {
      "Set-Cookie": await setTheme(theme),
    },
  });
}

export default function App() {
  const { theme } = useLoaderData<typeof loader>();

  return (
    <html lang="en" className={theme === "light" ? "light-theme" : "dark-theme"}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <Meta />
        <Links />
      </head>
      <body>
        <Outlet />
        <ToastContainer />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
