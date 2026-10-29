import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

// Owner-authorized PR creation only. Credentials stay in memory and never enter
// command arguments, files, stdout, error messages or the PR body.
const repository = "ikhaliddevs/anajao-ecommerce-backend";
const milestone = process.argv.includes("--milestone=03") ? "03" : "02";
const head =
  milestone === "03"
    ? "feature/milestone-03-catalog-inventory"
    : "feature/milestone-02-identity-access";
const descriptionPath = `docs/pull-request-milestone-${milestone}.md`;
const title =
  milestone === "03"
    ? "feat: catalogue, inventory and approved wholesale pricing"
    : "feat: Milestone 2 identity, authentication and access control";
let token = process.env.ANAJAO_GITHUB_TOKEN;
if (!token) {
  const credential = spawnSync("git", ["credential", "fill"], {
    input: `protocol=https\nhost=github.com\npath=${repository}.git\n\n`,
    encoding: "utf8",
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0", GCM_INTERACTIVE: "never" },
    windowsHide: true
  });
  if (credential.status !== 0)
    throw new Error(
      "GitHub credential helper unavailable; install/authenticate gh or provide ANAJAO_GITHUB_TOKEN securely"
    );
  token = credential.stdout
    .split(/\r?\n/)
    .find((line) => line.startsWith("password="))
    ?.slice("password=".length);
}
if (!token) throw new Error("No GitHub API credential is available");
const headers = {
  Accept: "application/vnd.github+json",
  Authorization: `Bearer ${token}`,
  "X-GitHub-Api-Version": "2026-03-10",
  "Content-Type": "application/json"
};
const api = async (path: string, method = "GET", body?: object): Promise<unknown> => {
  const response = await fetch(`https://api.github.com/repos/${repository}${path}`, {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(20000)
  });
  if (!response.ok) throw new Error(`GitHub API ${method} returned HTTP ${response.status}`);
  return response.json();
};
type Pull = {
  number: number;
  html_url: string;
  head: { sha: string };
  base: { ref: string };
  merged: boolean;
};
const existing = (await api(
  `/pulls?state=open&head=ikhaliddevs:${encodeURIComponent(head)}&base=develop`
)) as Pull[];
const pull =
  existing[0] ??
  ((await api("/pulls", "POST", {
    title,
    head,
    base: "develop",
    body: readFileSync(descriptionPath, "utf8")
  })) as Pull);
const verified = (await api(`/pulls/${pull.number}`)) as Pull;
if (verified.base.ref !== "develop" || verified.merged) throw new Error("Unexpected PR state");
console.log(`PR #${verified.number}: ${verified.html_url} (base: develop, merged: false)`);
if (process.argv.includes("--update-body")) {
  await api(`/pulls/${pull.number}`, "PATCH", {
    body: readFileSync(descriptionPath, "utf8")
  });
  console.log("PR description updated from the committed handoff document");
}
const checks = (await api(`/commits/${verified.head.sha}/check-runs`)) as {
  check_runs: { name: string; status: string; conclusion: string | null; html_url: string }[];
};
for (const check of checks.check_runs)
  console.log(`${check.name}: ${check.status}/${check.conclusion ?? "pending"} ${check.html_url}`);
