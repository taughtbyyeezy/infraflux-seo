import { json, type ActionFunctionArgs } from "@remix-run/node";
import { setTheme } from "../utils/theme.server";

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const theme = formData.get("theme") as string;

  if (!theme || (theme !== "light" && theme !== "dark")) {
    return json({ success: false, error: "Invalid theme" }, { status: 400 });
  }

  return json(
    { success: true, theme },
    {
      headers: {
        "Set-Cookie": await setTheme(theme),
      },
    }
  );
}
