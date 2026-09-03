/* The address bar is the source of truth for where you are.

   Public surface           Application (needs a session)
   /                        /app
   /login                   /app/applications, /app/alerts, …
   /register                /app/monitors/<id>

   Keeping the application under one prefix means a shared link opens what it
   says, the back button behaves, and robots.txt can exclude the part no
   crawler should reach without excluding the front page with it. */

export const APP_PREFIX = "/app";

export type View = "front" | "login" | "register" | "app";

export type Route = {
  view: View;
  page: string;
  selected: string | null;
};

const pageByPath: Record<string, string> = {
  "": "dashboard",
  applications: "applications",
  alerts: "settings",
  operations: "operations",
  reports: "reports",
  import: "import",
  organizations: "tenants",
  users: "users",
  profile: "profile"
};

const pathByPage: Record<string, string> = Object.fromEntries(
  Object.entries(pageByPath).map(([path, page]) => [page, path])
);

export const parseRoute = (pathname: string): Route => {
  const clean = pathname.replace(/\/+$/, "") || "/";

  if (clean === "/login") return { view: "login", page: "dashboard", selected: null };
  if (clean === "/register") return { view: "register", page: "dashboard", selected: null };

  if (clean === APP_PREFIX || clean.startsWith(`${APP_PREFIX}/`)) {
    const rest = clean.slice(APP_PREFIX.length).replace(/^\//, "");
    const [first, second] = rest.split("/");
    if (first === "monitors" && second) return { view: "app", page: "dashboard", selected: second };
    return { view: "app", page: pageByPath[first] ?? "dashboard", selected: null };
  }

  return { view: "front", page: "dashboard", selected: null };
};

export const pathForPage = (page: string, selected: string | null = null) => {
  if (selected) return `${APP_PREFIX}/monitors/${selected}`;
  const segment = pathByPage[page];
  return segment ? `${APP_PREFIX}/${segment}` : APP_PREFIX;
};

export const pathForView = (view: View) =>
  view === "login" ? "/login" : view === "register" ? "/register" : view === "app" ? APP_PREFIX : "/";
