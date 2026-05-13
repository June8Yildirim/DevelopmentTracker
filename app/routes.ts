import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("auth/github", "routes/auth.github.tsx"),
  route("auth/github/callback", "routes/auth.github.callback.tsx"),
  route("dashboard", "routes/dashboard.tsx"),
  route("logout", "routes/logout.tsx"),
] satisfies RouteConfig;
