import { redirect } from "react-router";
import type { Route } from "./+types/auth.github.callback";
import { getSession, commitSession } from "../session.server";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  const session = await getSession(request.headers.get("Cookie"));

  if (error || !code) {
    return redirect("/?error=access_denied");
  }

  if (state !== session.get("oauth_state")) {
    return redirect("/?error=state_mismatch");
  }

  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
    }),
  });

  const tokenData = await tokenRes.json();

  if (tokenData.error || !tokenData.access_token) {
    console.error("[OAuth] token exchange failed:", tokenData);
    const reason = encodeURIComponent(tokenData.error_description ?? tokenData.error ?? "unknown");
    return redirect(`/?error=token_exchange_failed&reason=${reason}`);
  }

  const userRes = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      Accept: "application/vnd.github+json",
    },
  });
  const user = await userRes.json();

  session.set("token", tokenData.access_token);
  session.set("login", user.login);
  session.set("name", user.name ?? user.login);
  session.set("avatar", user.avatar_url);
  session.unset("oauth_state");

  return redirect("/dashboard", {
    headers: { "Set-Cookie": await commitSession(session) },
  });
}
