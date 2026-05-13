import { redirect } from "react-router";
import type { Route } from "./+types/auth.github";
import { getSession, commitSession } from "../session.server";

export async function loader({ request }: Route.LoaderArgs) {
  const state = crypto.randomUUID();
  const session = await getSession(request.headers.get("Cookie"));
  session.set("oauth_state", state);

  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID ?? "",
    scope: "read:user user:email repo",
    state,
  });

  return redirect(`https://github.com/login/oauth/authorize?${params}`, {
    headers: { "Set-Cookie": await commitSession(session) },
  });
}
