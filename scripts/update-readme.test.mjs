import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  escapeCell,
  buildRepoTable,
  extractMarkerBlock,
  absolutizeDocLinks,
  buildSoftwareToolsSection,
  replaceBetweenMarkers,
} from './update-readme.mjs';

const FIXTURES_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');

test('escapeCell escapes pipes and collapses newlines', () => {
  assert.equal(escapeCell('a | b'), 'a \\| b');
  assert.equal(escapeCell('line one\nline two'), 'line one line two');
  assert.equal(escapeCell('line one\r\nline two'), 'line one line two');
});

test('buildRepoTable renders one row per repo, falling back on empty description', () => {
  const table = buildRepoTable([
    { name: 'grippers', url: 'https://github.com/robotiq/grippers', description: 'A driver' },
    { name: 'ros', url: 'https://github.com/robotiq/ros', description: '' },
  ]);
  assert.match(table, /\| \[grippers\]\(https:\/\/github\.com\/robotiq\/grippers\) \| A driver \|/);
  assert.match(table, /\| \[ros\]\(https:\/\/github\.com\/robotiq\/ros\) \| _No description yet\._ \|/);
});

test('buildRepoTable escapes a pipe in a live repo description', () => {
  const table = buildRepoTable([
    { name: 'x', url: 'https://github.com/robotiq/x', description: 'Do A | Do B' },
  ]);
  assert.match(table, /Do A \\\| Do B/);
});

test('extractMarkerBlock returns the trimmed content between markers', () => {
  const raw = [
    '{/* AUTO-GENERATED-SDK-TABLE:START */}',
    '| a | b |',
    '{/* AUTO-GENERATED-SDK-TABLE:END */}',
  ].join('\n');
  assert.equal(extractMarkerBlock(raw, 'SDK'), '| a | b |');
});

test('extractMarkerBlock returns null when the marker pair is absent', () => {
  assert.equal(extractMarkerBlock('no markers here', 'SDK'), null);
});

test('absolutizeDocLinks rewrites relative links, leaves absolute/anchor links alone', () => {
  const input = '[a](drivers/Foo) [b](img/x.png) [c](./drivers/Foo) [d](https://example.com) [e](#section)';
  const output = absolutizeDocLinks(input);
  assert.match(output, /\[a\]\(https:\/\/robotiq\.github\.io\/docs\/drivers\/Foo\)/);
  assert.match(output, /\[b\]\(https:\/\/robotiq\.github\.io\/docs\/img\/x\.png\)/);
  assert.match(output, /\[c\]\(https:\/\/robotiq\.github\.io\/docs\/drivers\/Foo\)/);
  assert.match(output, /\[d\]\(https:\/\/example\.com\)/);
  assert.match(output, /\[e\]\(#section\)/);
});

test('absolutizeDocLinks prepends only the domain to a site-root-relative link, without doubling /docs/', () => {
  const output = absolutizeDocLinks('[a](/docs/drivers/Foo) [b](/img/x.png)');
  assert.match(output, /\[a\]\(https:\/\/robotiq\.github\.io\/docs\/drivers\/Foo\)/);
  assert.doesNotMatch(output, /docs\/docs/);
  assert.match(output, /\[b\]\(https:\/\/robotiq\.github\.io\/img\/x\.png\)/);
});

function fakeIntro(overrides = {}) {
  const sections = { SDK: '| sdk |', ROS2: '| ros2 |', ROS1: '| ros1 |', PHYSICS_ENGINE: '| phys |', OTHER: '| other |', ...overrides };
  return Object.entries(sections)
    .filter(([, body]) => body !== null)
    .map(([key, body]) => `{/* AUTO-GENERATED-${key}-TABLE:START */}\n${body}\n{/* AUTO-GENERATED-${key}-TABLE:END */}`)
    .join('\n\n');
}

test('buildSoftwareToolsSection includes every section heading, in order, when all markers are present', () => {
  const section = buildSoftwareToolsSection(fakeIntro());
  const headings = [...section.matchAll(/^#### (.+)$/gm)].map((m) => m[1]);
  assert.deepEqual(headings, ['SDKs/languages', 'ROS2', 'ROS1', 'Physics engine', 'Other community projects']);
});

test('buildSoftwareToolsSection throws instead of publishing a partial section when a marker is missing', () => {
  assert.throws(() => buildSoftwareToolsSection(fakeIntro({ PHYSICS_ENGINE: null })), /Physics engine/);
});

test('replaceBetweenMarkers replaces content between an existing marker pair', () => {
  const text = '# Title\n\n<!-- AUTO-GENERATED-REPOS-TABLE:START -->\nold\n<!-- AUTO-GENERATED-REPOS-TABLE:END -->\n';
  const result = replaceBetweenMarkers(text, 'REPOS-TABLE', 'new content');
  assert.match(result, /<!-- AUTO-GENERATED-REPOS-TABLE:START -->\nnew content\n<!-- AUTO-GENERATED-REPOS-TABLE:END -->/);
});

test('replaceBetweenMarkers throws when the marker pair is missing, instead of silently no-op-ing', () => {
  assert.throws(() => replaceBetweenMarkers('# Title\n\nno markers', 'REPOS-TABLE', 'new content'), /Markers not found/);
});

test('replaceBetweenMarkers treats content as a literal string, not a replacement pattern', () => {
  const text = '<!-- AUTO-GENERATED-REPOS-TABLE:START -->\nold\n<!-- AUTO-GENERATED-REPOS-TABLE:END -->';
  // A live GitHub repo description containing "$&" would previously splice
  // the entire matched marker block back into itself here.
  const result = replaceBetweenMarkers(text, 'REPOS-TABLE', 'weird repo description with $& and $1 in it');
  assert.match(result, /weird repo description with \$& and \$1 in it/);
});

test('replaceBetweenMarkers only touches the named marker pair, leaving the rest of the document untouched', () => {
  const text = [
    '# Robotiq',
    '',
    '<!-- AUTO-GENERATED-REPOS-TABLE:START -->old repos<!-- AUTO-GENERATED-REPOS-TABLE:END -->',
    '',
    '<!-- AUTO-GENERATED-SOFTWARE-TOOLS:START -->old tools<!-- AUTO-GENERATED-SOFTWARE-TOOLS:END -->',
  ].join('\n');
  const result = replaceBetweenMarkers(text, 'REPOS-TABLE', 'new repos');
  assert.match(result, /new repos/);
  assert.match(result, /old tools/);
});

// Mirrors main()'s actual sequence: read the README once, chain
// replaceBetweenMarkers calls over the in-memory string, write once at the
// end. If a later call throws (e.g. the README's own SOFTWARE-TOOLS marker
// is damaged), fs.writeFileSync is never reached — proving that on disk,
// not just in the return value of one function call.
test('a failed second replacement leaves the README file on disk completely unchanged', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'update-readme-test-'));
  const file = path.join(dir, 'README.md');
  const original = [
    '# Robotiq',
    '',
    '<!-- AUTO-GENERATED-REPOS-TABLE:START -->old repos<!-- AUTO-GENERATED-REPOS-TABLE:END -->',
    '',
    'no software tools markers here',
  ].join('\n');
  writeFileSync(file, original, 'utf8');

  try {
    assert.throws(() => {
      let text = readFileSync(file, 'utf8');
      text = replaceBetweenMarkers(text, 'REPOS-TABLE', 'new repos');
      text = replaceBetweenMarkers(text, 'SOFTWARE-TOOLS', 'new tools'); // throws — SOFTWARE-TOOLS marker absent
      writeFileSync(file, text, 'utf8'); // never reached
    }, /Markers not found/);

    assert.equal(readFileSync(file, 'utf8'), original);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// A real docs/intro.mdx snapshot (scripts/fixtures/intro.mdx), not the
// minimal synthetic markers used above — exercises the actual regexes
// against real badge markup, multi-column tables and legend bullets, so a
// change to extractMarkerBlock/absolutizeDocLinks that breaks on real
// formatting (but not on the synthetic fixture) shows up here.
test('buildSoftwareToolsSection matches a real intro.mdx fixture (catches upstream format drift)', () => {
  const fixture = readFileSync(path.join(FIXTURES_DIR, 'intro.mdx'), 'utf8');
  const section = buildSoftwareToolsSection(fixture);

  const headings = [...section.matchAll(/^#### (.+)$/gm)].map((m) => m[1]);
  assert.deepEqual(headings, ['SDKs/languages', 'ROS2', 'ROS1', 'Physics engine', 'Other community projects']);

  // Links absolutized against the docs site, not left root-relative.
  assert.match(section, /\[2F \/ Hand-E\]\(https:\/\/robotiq\.github\.io\/docs\/drivers\/2F%20hande\)/);
  assert.match(section, /\]\(https:\/\/robotiq\.github\.io\/docs\/drivers\/2F%20hande\/SDK\/C\+\+\)/);
  // Legend text (not just table rows) survives.
  assert.match(section, /ROS 2 LTS release \(2022\), supported until 2027\./);
  // Nothing upstream-relative leaks into the README unresolved.
  assert.doesNotMatch(section, /\]\(drivers\//);
});

test('regenerating from the same inputs is idempotent — byte-identical output both times', () => {
  const repos = [
    { name: 'grippers', url: 'https://github.com/robotiq/grippers', description: 'A driver' },
    { name: 'ros', url: 'https://github.com/robotiq/ros', description: 'ROS packages' },
  ];
  assert.equal(buildRepoTable(repos), buildRepoTable(repos));

  const fixture = readFileSync(path.join(FIXTURES_DIR, 'intro.mdx'), 'utf8');
  assert.equal(buildSoftwareToolsSection(fixture), buildSoftwareToolsSection(fixture));

  // Applying the same replacement twice in sequence (as a second run of the
  // script would, against its own previous output) reaches a fixed point.
  const text = '<!-- AUTO-GENERATED-REPOS-TABLE:START -->x<!-- AUTO-GENERATED-REPOS-TABLE:END -->';
  const content = buildRepoTable(repos);
  const once = replaceBetweenMarkers(text, 'REPOS-TABLE', content);
  const twice = replaceBetweenMarkers(once, 'REPOS-TABLE', content);
  assert.equal(once, twice);
});
