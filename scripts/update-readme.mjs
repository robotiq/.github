// Regenerates the auto-generated sections of profile/README.md:
//  - "Repositories": one row per public, non-archived, non-fork repo in the
//    robotiq GitHub org (excluding this repo and the docs site itself),
//    pulled live from the GitHub API.
//  - "Software tools": the Libraries / ROS2 / ROS1 / Simulation / Other tables
//    imported from robotiq/robotiq.github.io's docs/intro.mdx (itself kept
//    up to date by that repo's own scripts/generate-tools-table.js), with
//    relative doc links rewritten to absolute robotiq.github.io URLs.
//
// Run via `.github/workflows/update-readme.yml` on a daily schedule, or
// locally with `node scripts/update-readme.mjs` (optionally set GITHUB_TOKEN
// to avoid the unauthenticated API rate limit). Pure helpers are exported
// for scripts/update-readme.test.mjs; fetchOrgRepos/fetchDocsIntro/main hit
// the network and aren't unit-tested.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const README_PATH = path.join(ROOT, 'profile', 'README.md');

const ORG = 'robotiq';
const DOCS_REPO = 'robotiq.github.io';
const DOCS_BRANCH = 'main';
const DOCS_SITE_URL = 'https://robotiq.github.io';

// Org repos that aren't "software tools" and shouldn't appear in the table.
const EXCLUDED_REPOS = new Set(['.github', DOCS_REPO]);

const SOFTWARE_SECTIONS = [
  { key: 'LIBRARIES', heading: 'Libraries' },
  { key: 'ROS2', heading: 'ROS2' },
  { key: 'ROS1', heading: 'ROS1' },
  { key: 'SIMULATION', heading: 'Simulation' },
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
export async function fetchOrgRepos() {
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

export function escapeCell(text) {
  return text.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

export function buildRepoTable(repos) {
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

export function extractMarkerBlock(raw, key) {
  const re = new RegExp(
    `\\{/\\* AUTO-GENERATED-${key}-TABLE:START \\*/\\}\\n([\\s\\S]*?)\\n\\{/\\* AUTO-GENERATED-${key}-TABLE:END \\*/\\}`
  );
  const m = raw.match(re);
  return m ? m[1].trim() : null;
}

// docs/intro.mdx lives at the docs/ root, so a document-relative link in it
// ("drivers/...", "img/...", "./drivers/...", "contribute/...") resolves
// against that root. A site-root-relative link ("/docs/drivers/...",
// "/img/...") already names its full path from the domain root, so only the
// domain goes in front of it — prepending "/docs/" too would double it into
// ".../docs/docs/...". Absolute http(s) links and same-page #anchors are
// left untouched. Rewriting every other shape (rather than only the
// "drivers/" links this table happens to use today) means a new link shape
// upstream still resolves correctly here instead of silently 404ing on the
// org landing page.
export function absolutizeDocLinks(markdown) {
  return markdown.replace(/\]\((?!https?:|#)([^)]+)\)/g, (_, href) => (
    href.startsWith('/') ? `](${DOCS_SITE_URL}${href})` : `](${DOCS_SITE_URL}/docs/${href.replace(/^\.\//, '')})`
  ));
}

// generate-tools-table.js (in robotiq.github.io) always writes every one of
// these marker pairs, even when a category has no products yet (it fills
// the gap with a "_No ... documented yet._" message) — so a missing marker
// here never means "legitimately empty", only that the fetched page isn't
// the shape this script expects (docs site restructured, marker renamed,
// truncated response, ...). Treat that as a hard failure rather than
// silently publishing a README with a gutted software tools section.
export function buildSoftwareToolsSection(introRaw) {
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

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Pure text transform (no I/O), so it can be composed left-to-right over an
// in-memory string and unit-tested without touching the filesystem. Throws
// if `key`'s markers aren't present in `text` — callers are expected to run
// every replacement they need before writing anything back out, so one
// missing marker fails before any bytes are written, rather than after some
// sections are already on disk and others aren't.
export function replaceBetweenMarkers(text, key, content) {
  const startMarker = `<!-- AUTO-GENERATED-${key}:START -->`;
  const endMarker = `<!-- AUTO-GENERATED-${key}:END -->`;
  const markerRegex = new RegExp(`${escapeRegExp(startMarker)}[\\s\\S]*?${escapeRegExp(endMarker)}`);
  if (!markerRegex.test(text)) {
    throw new Error(`[update-readme] Markers not found in profile/README.md: ${startMarker}`);
  }
  const block = `${startMarker}\n${content}\n${endMarker}`;
  // A function replacer is used because `content` (live repo descriptions,
  // docs-site table cells) is untrusted as a String.replace() replacement
  // *string* — "$&", "$`", "$'", "$1" etc. in it would otherwise be
  // interpreted as replacement patterns instead of inserted literally,
  // silently corrupting the marker block. A function replacer gets no such
  // special-pattern handling.
  return text.replace(markerRegex, () => block);
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

  // Build and validate both sections, and check both marker pairs actually
  // exist in the README, entirely in memory before writing anything — one
  // read, one write, so a failure partway through (e.g. a damaged marker)
  // never leaves the README with only one section refreshed.
  const repoTable = buildRepoTable(repos);
  const softwareToolsSection = buildSoftwareToolsSection(introRaw);

  let readme = fs.readFileSync(README_PATH, 'utf8');
  readme = replaceBetweenMarkers(readme, 'REPOS-TABLE', repoTable);
  readme = replaceBetweenMarkers(readme, 'SOFTWARE-TOOLS', softwareToolsSection);
  fs.writeFileSync(README_PATH, readme, 'utf8');

  console.log(`[update-readme] Wrote ${repos.length} repositories and the software tools section to profile/README.md`);
}

// Only run when executed directly (`node scripts/update-readme.mjs`), not
// when imported by scripts/update-readme.test.mjs.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
