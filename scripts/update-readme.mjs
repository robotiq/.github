// Regenerates the auto-generated sections of profile/README.md:
//  - "Repositories": one row per public, non-archived, non-fork repo in the
//    robotiq GitHub org (excluding this repo and the docs site itself),
//    pulled live from the GitHub API.
//  - "Software tools": the SDK / ROS2 / ROS1 / Physics engine / Other tables
//    imported from robotiq/robotiq.github.io's docs/intro.mdx (itself kept
//    up to date by that repo's own scripts/generate-tools-table.js), with
//    relative doc links rewritten to absolute robotiq.github.io URLs.
//
// Run via `.github/workflows/update-readme.yml` on a daily schedule, or
// locally with `node scripts/update-readme.mjs` (optionally set GITHUB_TOKEN
// to avoid the unauthenticated API rate limit).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const README_PATH = path.join(ROOT, 'profile', 'README.md');

const ORG = 'robotiq';
const DOCS_REPO = 'robotiq.github.io';
const DOCS_BRANCH = 'main';
const DOCS_SITE_URL = 'https://robotiq.github.io';

// Org repos that aren't "software tools" and shouldn't appear in the table.
const EXCLUDED_REPOS = new Set(['.github', DOCS_REPO]);

const SOFTWARE_SECTIONS = [
  { key: 'SDK', heading: 'SDKs/languages' },
  { key: 'ROS2', heading: 'ROS2' },
  { key: 'ROS1', heading: 'ROS1' },
  { key: 'PHYSICS_ENGINE', heading: 'Physics engine' },
  { key: 'OTHER', heading: 'Other community projects' },
];

async function githubApi(url) {
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'robotiq-profile-readme-bot',
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`[update-readme] GitHub API request failed (${res.status} ${res.statusText}): ${url}`);
  }
  return res.json();
}

// Public, non-archived, non-fork repos in the org, paginated.
async function fetchOrgRepos() {
  const repos = [];
  for (let page = 1; ; page += 1) {
    const batch = await githubApi(`https://api.github.com/orgs/${ORG}/repos?type=public&per_page=100&page=${page}`);
    if (batch.length === 0) break;
    repos.push(...batch);
    if (batch.length < 100) break;
  }
  return repos
    .filter((r) => !r.archived && !r.fork && !EXCLUDED_REPOS.has(r.name))
    .map((r) => ({ name: r.name, url: r.html_url, description: (r.description || '').trim() }))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
}

function escapeCell(text) {
  return text.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

function buildRepoTable(repos) {
  const header = '| Repository | Description |';
  const separator = '|---|---|';
  const rows = repos.map((r) => `| [${r.name}](${r.url}) | ${escapeCell(r.description) || '_No description yet._'} |`);
  return [header, separator, ...rows].join('\n');
}

async function fetchDocsIntro() {
  const url = `https://raw.githubusercontent.com/${ORG}/${DOCS_REPO}/${DOCS_BRANCH}/docs/intro.mdx`;
  const res = await fetch(url, { headers: { 'User-Agent': 'robotiq-profile-readme-bot' } });
  if (!res.ok) {
    throw new Error(`[update-readme] Failed to fetch ${url} (${res.status} ${res.statusText})`);
  }
  return res.text();
}

function extractMarkerBlock(raw, key) {
  const re = new RegExp(
    `\\{/\\* AUTO-GENERATED-${key}-TABLE:START \\*/\\}\\n([\\s\\S]*?)\\n\\{/\\* AUTO-GENERATED-${key}-TABLE:END \\*/\\}`
  );
  const m = raw.match(re);
  return m ? m[1].trim() : null;
}

// docs/intro.mdx links to product pages with paths relative to docs/
// (e.g. "drivers/Adaptive%20grippers") — make them absolute so they resolve
// from the profile README, which isn't served from the docs site.
function absolutizeDocLinks(markdown) {
  return markdown.replace(/\]\(drivers\//g, `](${DOCS_SITE_URL}/docs/drivers/`);
}

// generate-tools-table.js (in robotiq.github.io) always writes every one of
// these marker pairs, even when a category has no products yet (it fills
// the gap with a "_No ... documented yet._" message) — so a missing marker
// here never means "legitimately empty", only that the fetched page isn't
// the shape this script expects (docs site restructured, marker renamed,
// truncated response, ...). Treat that as a hard failure rather than
// silently publishing a README with a gutted software tools section.
function buildSoftwareToolsSection(introRaw) {
  const parts = [];
  for (const { key, heading } of SOFTWARE_SECTIONS) {
    const block = extractMarkerBlock(introRaw, key);
    if (!block) {
      throw new Error(
        `[update-readme] Could not import the "${heading}" software tools section: no ` +
        `AUTO-GENERATED-${key}-TABLE markers found in ${DOCS_REPO}'s docs/intro.mdx. ` +
        `It may have been restructured — refusing to publish a partial section.`
      );
    }
    parts.push(`#### ${heading}\n\n${absolutizeDocLinks(block)}`);
  }
  return parts.join('\n\n');
}

function writeBetweenMarkers(filePath, key, content) {
  const startMarker = `<!-- AUTO-GENERATED-${key}:START -->`;
  const endMarker = `<!-- AUTO-GENERATED-${key}:END -->`;
  const markerRegex = new RegExp(
    `${startMarker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?${endMarker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`
  );
  const raw = fs.readFileSync(filePath, 'utf8');
  if (!markerRegex.test(raw)) {
    throw new Error(`[update-readme] Markers not found in ${path.relative(ROOT, filePath)}: ${startMarker}`);
  }
  const block = `${startMarker}\n${content}\n${endMarker}`;
  fs.writeFileSync(filePath, raw.replace(markerRegex, block), 'utf8');
}

async function main() {
  const [repos, introRaw] = await Promise.all([fetchOrgRepos(), fetchDocsIntro()]);

  // An org with zero matching repos is far more likely a broken fetch
  // (rate limit, wrong org, API change) than reality — same reasoning as
  // buildSoftwareToolsSection's marker check: fail loudly instead of
  // publishing a README with an emptied-out repository table.
  if (repos.length === 0) {
    throw new Error(
      `[update-readme] Fetched 0 repositories for org "${ORG}" — refusing to overwrite the ` +
      'repository table. Check GITHUB_TOKEN / API rate limits / the ORG constant.'
    );
  }

  // Build and validate both sections before writing anything, so a failure
  // in either one (e.g. the marker check above) never leaves the README
  // with only one section refreshed.
  const repoTable = buildRepoTable(repos);
  const softwareToolsSection = buildSoftwareToolsSection(introRaw);

  writeBetweenMarkers(README_PATH, 'REPOS-TABLE', repoTable);
  console.log(`[update-readme] Wrote ${repos.length} repositories to profile/README.md`);

  writeBetweenMarkers(README_PATH, 'SOFTWARE-TOOLS', softwareToolsSection);
  console.log('[update-readme] Wrote software tools section to profile/README.md');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
