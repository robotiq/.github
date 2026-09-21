import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  escapeCell,
  buildRepoTable,
  extractMarkerBlock,
  absolutizeDocLinks,
  buildSoftwareToolsSection,
  replaceBetweenMarkers,
} from './update-readme.mjs';

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
