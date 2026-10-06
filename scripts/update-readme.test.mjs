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
    '{/* AUTO-GENERATED-LIBRARIES-TABLE:START */}',
    '| a | b |',
    '{/* AUTO-GENERATED-LIBRARIES-TABLE:END */}',
  ].join('\n');
  assert.equal(extractMarkerBlock(raw, 'LIBRARIES'), '| a | b |');
});

test('extractMarkerBlock returns null when the marker pair is absent', () => {
  assert.equal(extractMarkerBlock('no markers here', 'LIBRARIES'), null);
});

test('extractMarkerBlock strips a leading heading line inside the marker pair', () => {
  // The docs site has put the section's own "### Heading" both outside and
  // inside the marker pair across different restructures — strip it either
  // way, since buildSoftwareToolsSection supplies its own heading and a
  // leaked one would duplicate it in the README.
  const raw = [
    '{/* AUTO-GENERATED-LIBRARIES-TABLE:START */}',
    '### Libraries',
    '',
    '| a | b |',
    '{/* AUTO-GENERATED-LIBRARIES-TABLE:END */}',
  ].join('\n');
  assert.equal(extractMarkerBlock(raw, 'LIBRARIES'), '| a | b |');
});

test('extractMarkerBlock strips a heading even when it is the only thing in the block', () => {
  // The trailing \n+ in the strip regex only matched when something
  // followed the heading — a block that's nothing but a heading has no
  // trailing newline left (the outer regex already consumed the one before
  // END), so it came through unchanged, leaking a duplicate heading.
  const raw = [
    '{/* AUTO-GENERATED-LIBRARIES-TABLE:START */}',
    '### Libraries',
    '{/* AUTO-GENERATED-LIBRARIES-TABLE:END */}',
  ].join('\n');
  assert.equal(extractMarkerBlock(raw, 'LIBRARIES'), '');
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
  const sections = { LIBRARIES: '| sdk |', ROS: '| ros |', SIMULATION: '| phys |', OTHER: '| other |', ...overrides };
  return Object.entries(sections)
    .filter(([, body]) => body !== null)
    .map(([key, body]) => `{/* AUTO-GENERATED-${key}-TABLE:START */}\n${body}\n{/* AUTO-GENERATED-${key}-TABLE:END */}`)
    .join('\n\n');
}

test('buildSoftwareToolsSection includes every section heading, in order, when all markers are present', () => {
  const section = buildSoftwareToolsSection(fakeIntro());
  const headings = [...section.matchAll(/^#### (.+)$/gm)].map((m) => m[1]);
  assert.deepEqual(headings, ['Libraries', 'ROS', 'Simulation', 'Other community projects']);
});

test('buildSoftwareToolsSection throws instead of publishing a partial section when a marker is missing', () => {
  assert.throws(() => buildSoftwareToolsSection(fakeIntro({ SIMULATION: null })), /Simulation/);
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
  assert.deepEqual(headings, ['Libraries', 'ROS', 'Simulation', 'Other community projects']);
  // The heading check above only matches our own `####` lines — it would
  // still pass even if extractMarkerBlock regressed and let the fixture's
  // own `### Heading` lines leak through alongside ours. Assert directly
  // that none did.
  assert.doesNotMatch(section, /^#{1,3} /m);

  // Links absolutized against the docs site, not left root-relative.
  assert.match(section, /\[Adaptive grippers\]\(https:\/\/robotiq\.github\.io\/docs\/drivers\/Adaptive%20grippers\)/);
  assert.match(section, /\]\(https:\/\/robotiq\.github\.io\/docs\/drivers\/Adaptive%20grippers\/Libraries\/C\+\+\)/);
  // Legend text (not just table rows) survives.
  assert.match(section, /Compiled, performance-oriented language\./);
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
