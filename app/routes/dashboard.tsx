import { redirect, Form } from "react-router";
import type { Route } from "./+types/dashboard";
import { getSession } from "../session.server";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Dashboard — Git Activity Tracker" }];
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ContributionDay {
  contributionCount: number;
  date: string;
  weekday: number;
}

interface ContributionWeek {
  contributionDays: ContributionDay[];
}

interface ContributionCalendar {
  totalContributions: number;
  weeks: ContributionWeek[];
}

interface Repo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  private: boolean;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  pushed_at: string;
  fork: boolean;
}

// ─── Loader ───────────────────────────────────────────────────────────────────

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const token = session.get("token") as string | undefined;
  const login = session.get("login") as string | undefined;

  if (!token || !login) return redirect("/");

  const ghHeaders = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  const contributionQuery = `
    query($username: String!) {
      user(login: $username) {
        contributionsCollection {
          contributionCalendar {
            totalContributions
            weeks {
              contributionDays {
                contributionCount
                date
                weekday
              }
            }
          }
        }
      }
    }
  `;

  const [reposRes, graphqlRes] = await Promise.all([
    fetch(
      "https://api.github.com/user/repos?sort=pushed&per_page=20&visibility=all&affiliation=owner",
      { headers: ghHeaders }
    ),
    fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: { ...ghHeaders, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query: contributionQuery, variables: { username: login } }),
    }),
  ]);

  const [repos, graphqlData] = await Promise.all([
    reposRes.ok ? reposRes.json() : Promise.resolve([]),
    graphqlRes.ok ? graphqlRes.json() : Promise.resolve({}),
  ]);

  const calendar: ContributionCalendar =
    graphqlData?.data?.user?.contributionsCollection?.contributionCalendar ?? {
      totalContributions: 0,
      weeks: [],
    };

  return {
    login,
    name: session.get("name") as string,
    avatar: session.get("avatar") as string,
    repos: Array.isArray(repos) ? (repos as Repo[]) : [],
    calendar,
  };
}

// ─── Heatmap ──────────────────────────────────────────────────────────────────

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function contributionLevel(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count === 0) return 0;
  if (count <= 3) return 1;
  if (count <= 6) return 2;
  if (count <= 9) return 3;
  return 4;
}

function Heatmap({ calendar }: { calendar: ContributionCalendar }) {
  const { weeks, totalContributions } = calendar;

  // Build month labels: record which week index starts a new month
  const monthLabels: Array<{ label: string; weekIndex: number }> = [];
  let lastMonth = -1;
  weeks.forEach((week, i) => {
    const firstDay = week.contributionDays[0];
    if (!firstDay) return;
    const month = new Date(firstDay.date + "T00:00:00").getMonth();
    if (month !== lastMonth) {
      monthLabels.push({
        label: new Date(firstDay.date + "T00:00:00").toLocaleString("default", { month: "short" }),
        weekIndex: i,
      });
      lastMonth = month;
    }
  });

  return (
    <div>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        <span className="font-semibold text-gray-900 dark:text-gray-100">
          {totalContributions.toLocaleString()}
        </span>{" "}
        contributions in the last year
      </p>

      <div className="overflow-x-auto pb-2">
        <div className="inline-flex">
          {/* Day-of-week labels */}
          <div className="flex flex-col mr-2 mt-[22px] gap-[3px]">
            {DAYS.map((day, i) => (
              <div
                key={day}
                className="h-[11px] text-[9px] leading-none text-gray-400 flex items-center"
              >
                {i % 2 === 1 ? day : ""}
              </div>
            ))}
          </div>

          <div className="flex flex-col">
            {/* Month labels */}
            <div className="flex gap-[3px] h-[18px] mb-1">
              {weeks.map((_, i) => {
                const entry = monthLabels.find((m) => m.weekIndex === i);
                return (
                  <div
                    key={i}
                    className="w-[11px] shrink-0 text-[9px] text-gray-400 whitespace-nowrap overflow-visible"
                  >
                    {entry ? entry.label : ""}
                  </div>
                );
              })}
            </div>

            {/* Week columns */}
            <div className="flex gap-[3px]">
              {weeks.map((week, wi) => {
                const firstWeekday = week.contributionDays[0]?.weekday ?? 0;
                return (
                  <div key={wi} className="flex flex-col gap-[3px]">
                    {wi === 0 &&
                      firstWeekday > 0 &&
                      Array.from({ length: firstWeekday }).map((_, i) => (
                        <div key={`pad-${i}`} className="w-[11px] h-[11px]" />
                      ))}
                    {week.contributionDays.map((day) => (
                      <div
                        key={day.date}
                        title={`${day.date}: ${day.contributionCount} contribution${day.contributionCount !== 1 ? "s" : ""}`}
                        className={`w-[11px] h-[11px] rounded-[2px] heatmap-level-${contributionLevel(day.contributionCount)} cursor-default`}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-1 mt-3 text-[10px] text-gray-400">
        <span>Less</span>
        {([0, 1, 2, 3, 4] as const).map((level) => (
          <div key={level} className={`w-[11px] h-[11px] rounded-[2px] heatmap-level-${level}`} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}

// ─── Repo card ────────────────────────────────────────────────────────────────

const LANG_COLORS: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Python: "#3572A5",
  Go: "#00ADD8",
  Rust: "#dea584",
  Swift: "#F05138",
  Kotlin: "#A97BFF",
  Java: "#b07219",
  "C++": "#f34b7d",
  C: "#555555",
  Ruby: "#701516",
  PHP: "#4F5D95",
  CSS: "#563d7c",
  HTML: "#e34c26",
  Shell: "#89e051",
  Dart: "#00B4AB",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

function RepoCard({ repo }: { repo: Repo }) {
  const langColor = repo.language ? (LANG_COLORS[repo.language] ?? "#8b949e") : null;

  return (
    <a
      href={repo.html_url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex flex-col gap-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 hover:border-indigo-400 dark:hover:border-indigo-600 transition-colors shadow-sm group"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 group-hover:underline truncate">
          {repo.name}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {repo.private && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400">
              Private
            </span>
          )}
          {repo.fork && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
              Fork
            </span>
          )}
        </div>
      </div>

      {repo.description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{repo.description}</p>
      )}

      <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-auto">
        {langColor && (
          <span className="flex items-center gap-1">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: langColor }}
            />
            {repo.language}
          </span>
        )}
        {repo.stargazers_count > 0 && (
          <span className="flex items-center gap-0.5">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z" />
            </svg>
            {repo.stargazers_count}
          </span>
        )}
        {repo.forks_count > 0 && (
          <span className="flex items-center gap-0.5">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 16 16">
              <path d="M5 5.372v.878c0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75v-.878a2.25 2.25 0 1 1 1.5 0v.878a2.25 2.25 0 0 1-2.25 2.25h-1.5v2.128a2.251 2.251 0 1 1-1.5 0V8.5h-1.5A2.25 2.25 0 0 1 3.5 6.25v-.878a2.25 2.25 0 1 1 1.5 0ZM5 3.25a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Zm6.75.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm-3 8.75a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Z" />
            </svg>
            {repo.forks_count}
          </span>
        )}
        <span className="ml-auto">{timeAgo(repo.pushed_at)}</span>
      </div>
    </a>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Dashboard({ loaderData }: Route.ComponentProps) {
  const { login, name, avatar, repos, calendar } = loaderData;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-[Inter,sans-serif]">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-gray-200 dark:border-gray-800 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src={avatar}
              alt={name}
              className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-700"
            />
            <div>
              <p className="text-sm font-semibold leading-none">{name}</p>
              <p className="text-xs text-gray-500 leading-none mt-0.5">@{login}</p>
            </div>
          </div>
          <Form method="post" action="/logout">
            <button
              type="submit"
              className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
            >
              Sign out
            </button>
          </Form>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Contribution heatmap */}
        <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
          <h2 className="text-base font-semibold mb-5">Contribution Activity</h2>
          <Heatmap calendar={calendar} />
        </section>

        {/* Repositories */}
        <section>
          <h2 className="text-base font-semibold mb-4">
            Repositories
            <span className="ml-2 text-sm font-normal text-gray-400">({repos.length})</span>
          </h2>
          {repos.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-12">No repositories found.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {repos.map((repo) => (
                <RepoCard key={repo.id} repo={repo} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
