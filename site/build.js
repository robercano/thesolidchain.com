#!/usr/bin/env node
"use strict";

/**
 * Zero-dependency static site generator.
 *
 * Reads ./content.json (resolved relative to this script, not the caller's
 * cwd) and writes the complete ./index.html. Deterministic and idempotent:
 * running this twice against the same content.json produces byte-identical
 * output. The generated HTML is written already in the exact shape Prettier
 * expects (see site/.prettierrc.json), so `pnpm run lint` passes on the
 * committed file without ever invoking Prettier from here.
 *
 * Editing flow: edit content.json -> `node build.js` -> commit both files.
 */

const fs = require("fs");
const path = require("path");

const CONTENT_PATH = path.join(__dirname, "content.json");
const OUTPUT_PATH = path.join(__dirname, "index.html");

/** HTML-escape a value before interpolating it into markup. */
function esc(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const BAR_WIDTH = 31;
const LABEL_WIDTH = 17;

/** Render one ASCII skill bar: `<label padded to 17ch>` + block/shade run. */
function renderSkillBar(skill) {
  const filled = Math.round((skill.level / 100) * BAR_WIDTH);
  const empty = BAR_WIDTH - filled;
  const blocks = "█".repeat(filled) + "░".repeat(empty);
  return (
    `<div class="bar"><span class="label">${esc(skill.name)}</span>${blocks} ` +
    `<span class="pct">${esc(skill.level)}%</span></div>`
  );
}

function renderTile(tile) {
  return (
    `<div class="tile">\n` +
    `            <div class="n">${esc(tile.n)}</div>\n` +
    `            <div class="l">${esc(tile.l)}</div>\n` +
    `          </div>`
  );
}

function renderLogline(entry) {
  return (
    `<div class="logline">\n` +
    `            <span class="ts">${esc(entry.period)}</span>` +
    `<span><b>${esc(entry.company)}</b> — ${esc(entry.role)}<br />` +
    `<span class="msg">${esc(entry.summary)}</span></span>\n` +
    `          </div>`
  );
}

function renderTag(tag) {
  return `<span class="tag">${esc(tag)}</span>`;
}

function renderSocialRow(social) {
  return (
    `<tr>\n` +
    `                <td class="proto">${esc(social.proto)}</td>\n` +
    `                <td><a href="${esc(social.url)}">${esc(social.label)}</a></td>\n` +
    `                <td class="st">200 OK</td>\n` +
    `              </tr>`
  );
}

function renderProductRow(product) {
  const statusCell =
    product.status === "live"
      ? `<td class="st">200 OK</td>`
      : `<td class="prov">provisioning</td>`;
  const host = product.url.replace(/^https?:\/\//, "");
  return (
    `<tr>\n` +
    `                <td class="proto">svc://</td>\n` +
    `                <td>\n` +
    `                  <a href="${esc(product.url)}"><b>${esc(product.name)}</b> — ${esc(host)}</a>\n` +
    `                </td>\n` +
    `                ${statusCell}\n` +
    `              </tr>`
  );
}

function readContent() {
  const raw = fs.readFileSync(CONTENT_PATH, "utf8");
  return JSON.parse(raw);
}

function renderStyle() {
  return `<style>
      :root {
        --bg: #0d0a05;
        --panel: #121008;
        --edge: #292112;
        --ink: #e4dac2;
        --dim: #8a7b5c;
        --accent: #f5a524;
        --ok: #3fb950;
        --mono: ui-monospace, "Cascadia Code", "JetBrains Mono", Menlo, Consolas, monospace;
      }
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        background: repeating-linear-gradient(0deg, rgba(245, 165, 36, 0.015) 0 1px, transparent 1px 3px), var(--bg);
        color: var(--ink);
        font-family: var(--mono);
        font-size: 13.5px;
        line-height: 1.65;
      }
      .statusbar {
        display: flex;
        gap: 18px;
        flex-wrap: wrap;
        align-items: center;
        padding: 6px 18px;
        background: var(--panel);
        border-bottom: 1px solid var(--edge);
        font-size: 11.5px;
        color: var(--dim);
        position: sticky;
        top: 0;
        z-index: 5;
      }
      .statusbar .brand {
        display: inline-flex;
        align-items: center;
      }
      .statusbar .brand img {
        display: block;
      }
      .statusbar .dots {
        display: inline-flex;
        gap: 6px;
        margin-right: 4px;
      }
      .statusbar .dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
      }
      .dot.r {
        background: #e5534b;
      }
      .dot.y {
        background: #d4a72c;
      }
      .dot.g {
        background: #3fb950;
      }
      .statusbar b {
        color: var(--ink);
        font-weight: 600;
      }
      .led {
        color: var(--ok);
      }
      .led::before {
        content: "\\25cf ";
      }
      .cursor {
        display: inline-block;
        width: 8px;
        height: 14px;
        margin-left: auto;
        background: var(--accent);
        animation: blink 1.1s steps(1) infinite;
      }
      @keyframes blink {
        50% {
          opacity: 0;
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .cursor {
          animation: none;
        }
      }
      .grid {
        max-width: 1140px;
        margin: 22px auto 60px;
        padding: 0 18px;
        display: grid;
        grid-template-columns: repeat(12, 1fr);
        gap: 16px;
      }
      .panel {
        background: var(--panel);
        border: 1px solid var(--edge);
        border-radius: 6px;
        grid-column: span 12;
      }
      .panel .head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        padding: 9px 16px;
        border-bottom: 1px solid var(--edge);
        font-size: 12px;
      }
      .panel .head .cmd {
        color: var(--accent);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .panel .head .cmd::before {
        content: "$ ";
        color: var(--dim);
      }
      .panel .head .r {
        color: var(--dim);
        font-size: 11px;
        white-space: nowrap;
      }
      .panel .head .r::before {
        content: "# ";
      }
      .panel .body {
        padding: 18px;
      }
      .c6 {
        grid-column: span 6;
      }
      .c4 {
        grid-column: span 4;
      }
      .c8 {
        grid-column: span 8;
      }
      @media (max-width: 820px) {
        .c6,
        .c4,
        .c8 {
          grid-column: span 12;
        }
      }
      h1 {
        font-size: clamp(24px, 4vw, 34px);
        margin: 0 0 2px;
        color: #f7eed9;
        letter-spacing: -0.01em;
      }
      .role {
        color: var(--accent);
        margin: 0 0 12px;
        font-size: 13px;
      }
      .bio {
        color: var(--ink);
        max-width: 68ch;
        margin: 0;
      }
      .meta {
        color: var(--dim);
        margin-top: 12px;
        font-size: 12px;
      }
      .tiles {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
        gap: 12px;
      }
      .tile {
        border: 1px solid var(--edge);
        border-radius: 5px;
        padding: 12px 14px;
        background: var(--bg);
      }
      .tile .n {
        font-size: 24px;
        color: var(--accent);
        font-variant-numeric: tabular-nums;
      }
      .tile .l {
        font-size: 10.5px;
        color: var(--dim);
        letter-spacing: 0.1em;
        text-transform: uppercase;
      }
      .logline {
        display: grid;
        grid-template-columns: 11ch 1fr;
        gap: 12px;
        padding: 9px 0;
        border-top: 1px dashed var(--edge);
      }
      .logline:first-child {
        border-top: 0;
      }
      .logline .ts {
        color: var(--accent);
        font-size: 12px;
        font-variant-numeric: tabular-nums;
      }
      .logline b {
        color: #f7eed9;
        font-weight: 600;
      }
      .logline .msg {
        color: var(--dim);
        font-size: 12.5px;
      }
      .bar {
        white-space: pre;
        color: var(--accent);
        font-size: 13px;
        margin: 8px 0;
        overflow-x: auto;
      }
      .bar .label {
        color: var(--ink);
        display: inline-block;
        width: ${LABEL_WIDTH}ch;
      }
      .bar .pct {
        color: var(--dim);
      }
      .tagrow {
        display: flex;
        flex-wrap: wrap;
        gap: 7px;
        margin-top: 14px;
      }
      .tag {
        font-size: 11px;
        color: var(--dim);
        border: 1px solid var(--edge);
        border-radius: 3px;
        padding: 2px 8px;
      }
      table.links {
        width: 100%;
        border-collapse: collapse;
      }
      table.links td {
        padding: 9px 4px;
        border-top: 1px dashed var(--edge);
        font-size: 12.5px;
      }
      table.links tr:first-child td {
        border-top: 0;
      }
      table.links .proto {
        color: var(--dim);
        width: 10ch;
      }
      table.links a {
        color: var(--ink);
        text-decoration: none;
        font-weight: 600;
      }
      table.links a:hover,
      table.links a:focus-visible {
        color: var(--accent);
        outline: none;
      }
      table.links .st {
        text-align: right;
        color: var(--ok);
        font-size: 11px;
      }
      .cvrow {
        display: flex;
        align-items: center;
        gap: 16px;
        flex-wrap: wrap;
      }
      .cvbtn {
        display: inline-block;
        padding: 11px 22px;
        border: 1px solid var(--accent);
        border-radius: 5px;
        background: rgba(245, 165, 36, 0.07);
        color: var(--accent);
        font-weight: 700;
        text-decoration: none;
        font-size: 13px;
      }
      .cvbtn:hover,
      .cvbtn:focus-visible {
        background: var(--accent);
        color: #140f04;
        outline: none;
      }
      .cvmeta {
        color: var(--dim);
        font-size: 12px;
      }
      .svc {
        margin-top: 18px;
      }
      .svc td {
        padding: 10px 4px;
        border-top: 1px dashed var(--edge);
      }
      .svc .prov {
        color: var(--accent);
        font-size: 11px;
        text-align: right;
      }
      .svc .prov::before {
        content: "\\25cc ";
        display: inline-block;
        animation: spin 2s linear infinite;
      }
      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .svc .prov::before {
          animation: none;
        }
      }
      a:focus-visible,
      button:focus-visible {
        outline: 2px solid var(--accent);
        outline-offset: 2px;
      }
      footer {
        max-width: 1140px;
        margin: 0 auto;
        padding: 0 18px 40px;
        color: var(--dim);
        font-size: 11px;
      }
      footer .prompt {
        color: var(--accent);
      }
    </style>`;
}

function render(content) {
  const {
    meta,
    statusbar,
    profile,
    metrics,
    experience,
    skills,
    tags,
    socials,
    cv,
    products,
    footer,
  } = content;

  const tiles = metrics.map((tile) => renderTile(tile)).join("\n          ");
  const loglines = experience
    .map((entry) => renderLogline(entry))
    .join("\n          ");
  const bars = skills
    .map((skill) => renderSkillBar(skill))
    .join("\n          ");
  const tagSpans = tags.map((tag) => renderTag(tag)).join("");
  const socialRows = socials
    .map((social) => renderSocialRow(social))
    .join("\n              ");
  const productRows = products
    .map((product) => renderProductRow(product))
    .join("\n              ");

  const experienceTail = `tail -n ${experience.length}`;
  const endpointsCount = `${socials.length} endpoints`;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content="${esc(meta.description)}" />
    <title>${esc(meta.title)}</title>
    <link rel="icon" href="favicon.ico" sizes="32x32" />
    <link rel="icon" type="image/png" sizes="32x32" href="favicon-32.png" />
    <link rel="icon" type="image/png" sizes="16x16" href="favicon-16.png" />
    <link rel="apple-touch-icon" href="apple-touch-icon.png" />
    ${renderStyle()}
  </head>
  <body>
    <div class="statusbar">
      <a class="brand" href="/" aria-label="The Solid Chain"><img src="assets/tsc-logo.svg" alt="" width="56" height="56" /></a>
      <span class="dots"><span class="dot r"></span><span class="dot y"></span><span class="dot g"></span></span>
      <span><b>${esc(statusbar.user)}</b>: ~</span>
      <span class="led">online</span>
      <span>uptime: <b>${esc(statusbar.uptime)}</b></span>
      <span>region: <b>${esc(statusbar.region)}</b></span>
      <span class="cursor"></span>
    </div>
    <div class="grid">
      <div class="panel c8">
        <div class="head"><span class="cmd">whoami</span><span class="r">profile</span></div>
        <div class="body">
          <h1>${esc(profile.name)}</h1>
          <p class="role">${esc(profile.role)}</p>
          <p class="bio">${esc(profile.bio)}</p>
          <p class="meta">${esc(profile.meta)}</p>
        </div>
      </div>
      <div class="panel c4">
        <div class="head"><span class="cmd">uptime --stats</span></div>
        <div class="body tiles">
          ${tiles}
        </div>
      </div>
      <div class="panel c6">
        <div class="head"><span class="cmd">cat experience.log</span><span class="r">${esc(experienceTail)}</span></div>
        <div class="body">
          ${loglines}
        </div>
      </div>
      <div class="panel c6">
        <div class="head"><span class="cmd">cat skills.conf</span><span class="r">calibrated ${esc(footer.year)}</span></div>
        <div class="body">
          ${bars}
          <div class="tagrow">${tagSpans}</div>
        </div>
      </div>
      <div class="panel c6">
        <div class="head"><span class="cmd">ls -la ~/socials/</span><span class="r">${esc(endpointsCount)}</span></div>
        <div class="body">
          <table class="links">
            <tbody>
              ${socialRows}
            </tbody>
          </table>
        </div>
      </div>
      <div class="panel c6">
        <div class="head"><span class="cmd">./download --cv &amp;&amp; systemctl status subdomains</span></div>
        <div class="body">
          <div class="cvrow">
            <a class="cvbtn" href="${esc(cv.url)}">⬇ fetch cv.pdf</a>
            <span class="cvmeta">${esc(cv.filename)} · ${esc(cv.mime)}</span>
          </div>
          <table class="links svc">
            <tbody>
              ${productRows}
            </tbody>
          </table>
        </div>
      </div>
    </div>
    <footer><span class="prompt">${esc(statusbar.user)}:~$</span> © ${esc(footer.year)} ${esc(footer.text)}</footer>
  </body>
</html>
`;
}

function main() {
  const content = readContent();
  const html = render(content);
  fs.writeFileSync(OUTPUT_PATH, html);
}

main();
