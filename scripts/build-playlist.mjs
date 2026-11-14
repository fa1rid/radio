#!/usr/bin/env node
// Builds M3U playlists from radio-browser.info (no dependencies, Node 18+).
//
// usage: node scripts/build-playlist.mjs SY [LB JO ...] [--out public/playlists] [--days 7] [--force]
//   SY ...   two-letter country codes; each writes <out>/<code>.m3u (e.g. public/playlists/sy.m3u)
//   --days   keep stations that passed radio-browser's check within this many days (default 7)
//   --force  write even if the new list is less than half the size of the current file
//
// On any error for a country, its existing file is left untouched and the exit code is 1.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const UA = "radio-player-playlist-builder/1.0";
const FALLBACK_SERVERS = ["de1.api.radio-browser.info", "de2.api.radio-browser.info", "fi1.api.radio-browser.info"];

const opts = { out: "public/playlists", days: 7, force: false };
const codes = [];
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
	const a = args[i];
	if (a === "--out") opts.out = args[++i];
	else if (a === "--days") opts.days = Number(args[++i]);
	else if (a === "--force") opts.force = true;
	else if (/^[a-z]{2}$/i.test(a)) codes.push(a.toUpperCase());
	else { console.error("Unknown argument:", a); process.exit(2); }
}
if (!codes.length || !opts.out || !(opts.days >= 0)) {
	console.error("usage: node scripts/build-playlist.mjs SY [LB ...] [--out dir] [--days n] [--force]");
	process.exit(2);
}

async function getJson(url, ms) {
	const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(ms) });
	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	return res.json();
}

function shuffle(a) {
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
}

// radio-browser asks clients to pick a random server from its list.
async function discoverServers() {
	try {
		const list = await getJson("https://all.api.radio-browser.info/json/servers", 20000);
		const names = [...new Set(list.map((s) => s.name).filter(Boolean))];
		if (names.length) return shuffle(names).concat(FALLBACK_SERVERS.filter((n) => !names.includes(n)));
	} catch (e) {
		console.warn("Server discovery failed:", e.message);
	}
	return FALLBACK_SERVERS;
}

async function fetchStations(hosts, cc) {
	let lastErr;
	for (const h of hosts) {
		try {
			const list = await getJson(`https://${h}/json/stations/bycountrycodeexact/${cc}?hidebroken=false&limit=10000`, 30000);
			if (!Array.isArray(list)) throw new Error("unexpected response");
			return list;
		} catch (e) {
			lastErr = e;
			console.warn(`${h}: ${e.message}`);
		}
	}
	throw lastErr || new Error("no servers");
}

const clean = (s) => String(s || "").replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();
const attr = (s) => clean(s).replace(/"/g, "'");
const streamUrl = (s) => clean(s.url_resolved || s.url);

// Fixed order (name, then link) so the file only changes when stations change.
// Plain code-point comparison: same result on any machine/locale.
function byNameThenUrl(a, b) {
	const x = clean(a.name).toLowerCase(), y = clean(b.name).toLowerCase();
	if (x !== y) return x < y ? -1 : 1;
	const u = streamUrl(a), v = streamUrl(b);
	return u < v ? -1 : u > v ? 1 : 0;
}

function select(list, days) {
	const cutoff = Date.now() - days * 86400000;
	const seen = new Set();
	return list
		.filter((s) => {
			if (!/^https?:\/\//i.test(streamUrl(s)) || !clean(s.name)) return false;
			return s.lastcheckok === 1 || Date.parse(s.lastcheckoktime_iso8601 || "") >= cutoff;
		})
		.sort(byNameThenUrl) // sort before de-duplicating so the same entry is always kept
		.filter((s) => {
			const url = streamUrl(s);
			if (seen.has(url)) return false;
			seen.add(url);
			return true;
		});
}

// No timestamps, so the file only changes when stations change.
function toM3U(stations, cc) {
	const lines = ["#EXTM3U", `# Generated from radio-browser.info (country ${cc}) by scripts/build-playlist.mjs. Edits are overwritten.`];
	for (const s of stations) {
		const a = [`tvg-id="${attr(s.stationuuid)}"`];
		if (/^https?:\/\//i.test(clean(s.favicon))) a.push(`tvg-logo="${attr(s.favicon)}"`);
		a.push(`group-title="${attr(s.country || cc)}"`);
		lines.push(`#EXTINF:-1 ${a.join(" ")},${clean(s.name)}`, streamUrl(s));
	}
	return lines.join("\n") + "\n";
}

async function countExisting(file) {
	try {
		return ((await readFile(file, "utf8")).match(/^#EXTINF/gm) || []).length;
	} catch {
		return 0;
	}
}

const hosts = await discoverServers();
await mkdir(opts.out, { recursive: true });
let failed = false;
for (const cc of codes) {
	const file = path.join(opts.out, cc.toLowerCase() + ".m3u");
	try {
		const all = await fetchStations(hosts, cc);
		const picked = select(all, opts.days);
		if (!picked.length) throw new Error("no usable stations");
		const before = await countExisting(file);
		if (!opts.force && before && picked.length < Math.ceil(before / 2)) {
			throw new Error(`only ${picked.length} stations vs ${before} now; refusing (use --force)`);
		}
		await writeFile(file, toM3U(picked, cc));
		console.log(`${cc}: ${picked.length} of ${all.length} stations -> ${file}`);
	} catch (e) {
		failed = true;
		console.error(`${cc}: ${e.message}; existing file kept`);
	}
}
process.exit(failed ? 1 : 0);
