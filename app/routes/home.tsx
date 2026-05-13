import { redirect, useSearchParams } from "react-router";
import type { Route } from "./+types/home";
import { getSession } from "../session.server";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Git Activity Tracker" },
    { name: "description", content: "Visualize your GitHub contributions" },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  if (session.get("token")) return redirect("/dashboard");
  return null;
}

const FEATURES = [
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
      </svg>
    ),
    title: "Contribution Heatmap",
    description: "See your entire year of commits at a glance, just like GitHub's activity graph.",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
      </svg>
    ),
    title: "All Repositories",
    description: "Browse all your repos — public and private — sorted by last activity.",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
      </svg>
    ),
    title: "Secure OAuth",
    description: "Sign in with GitHub OAuth — no passwords stored, revokable at any time.",
  },
];

const ERROR_MESSAGES: Record<string, string> = {
  access_denied: "GitHub access was denied. Please try again.",
  state_mismatch: "Security check failed. Please try signing in again.",
  token_exchange_failed: "Could not complete sign-in. Please try again.",
};

export default function Home() {
  const [params] = useSearchParams();
  const errorKey = params.get("error");
  const reason = params.get("reason");
  const errorMsg = errorKey
    ? `${ERROR_MESSAGES[errorKey] ?? "Sign-in failed."} ${reason ? `(${decodeURIComponent(reason)})` : ""}`.trim()
    : null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-[Inter,sans-serif] flex flex-col">
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16">
        {/* Logo + heading */}
        <div className="flex items-center gap-3 mb-6">
          <svg className="w-10 h-10 text-gray-900 dark:text-gray-100" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
          </svg>
          <h1 className="text-3xl font-bold tracking-tight">Git Activity Tracker</h1>
        </div>

        <p className="text-gray-500 dark:text-gray-400 text-center max-w-md mb-8 text-base">
          Visualize your GitHub contribution heatmap and browse all your repositories in one place.
        </p>

        {errorMsg && (
          <div className="mb-6 px-4 py-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400 max-w-sm w-full text-center">
            {errorMsg}
          </div>
        )}

        {/* Sign in button */}
        <a
          href="/auth/github"
          className="inline-flex items-center gap-2.5 px-6 py-3 bg-gray-900 dark:bg-white hover:bg-gray-700 dark:hover:bg-gray-100 text-white dark:text-gray-900 font-semibold rounded-xl text-sm transition-colors shadow-md"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
          </svg>
          Sign in with GitHub
        </a>

        {/* Features */}
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl w-full">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 shadow-sm"
            >
              <div className="text-indigo-600 dark:text-indigo-400 mb-3">{f.icon}</div>
              <h3 className="text-sm font-semibold mb-1">{f.title}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="text-center py-6 text-xs text-gray-400">
        Uses the GitHub OAuth &amp; GraphQL APIs
      </footer>
    </div>
  );
}
