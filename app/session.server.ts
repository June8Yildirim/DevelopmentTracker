import { createCookieSessionStorage } from "react-router";

const { getSession, commitSession, destroySession } = createCookieSessionStorage({
  cookie: {
    name: "__gh_session",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    secrets: [process.env.SESSION_SECRET ?? "dev-secret-change-me"],
  },
});

export { getSession, commitSession, destroySession };
