(function () {
	"use strict";

	/* ---------- Config ---------- */
	var CFG = Object.assign({
		appTitle: "Radio",
		language: "auto",
		playlists: [],
		hlsLibraryUrl: "https://cdn.jsdelivr.net/npm/hls.js@1/dist/hls.min.js",
		playlistTimeoutMs: 15000,
		connectTimeoutMs: 20000,
		stallTimeoutMs: 15000,
		retriesPerUrl: 2,
		retriesAfterPlaying: 6,
		httpsUpgradeTimeoutMs: 8000,
		httpsUpgradeRetries: 0,
		httpsFailMemoryHours: 24
	}, window.RADIO_CONFIG || {});

	/* ---------- Text ---------- */
	var STR = {
		en: {
			loading: "Loading stations…", search: "Search stations", all: "All", favorites: "Favorites",
			reload: "Reload stations", playlist: "Playlist", connecting: "Connecting…", buffering: "Buffering…",
			playing: "Live", stopped: "Stopped — tap play", retrying: "Connection problem, retrying ({n})…",
			tryingAlt: "Trying another link…", offline: "No internet connection. Waiting…",
			tapToPlay: "Tap play to start", err_network: "Can't reach this station right now.",
			err_unsupported: "This station's stream format isn't supported on this device.",
			err_insecure: "This station only offers an insecure (http) stream, which browsers block on secure websites.",
			err_timeout: "The station is not responding.", err_generic: "This station can't be played right now.",
			tapRetry: "Tap play to try again, or choose another station.",
			plFail: "Couldn't load the station list. Check the internet connection.",
			plCached: "Showing a saved copy of the station list (from {d}).",
			plEmpty: "The station list is empty.", noResults: "No stations match your search.",
			noFavs: "No favorites yet. Tap the ☆ next to a station to add it.", tryAgain: "Try again",
			addFav: "Add to favorites", removeFav: "Remove from favorites", play: "Play", stop: "Stop",
			prev: "Previous station", next: "Next station", stations: "{n} stations",
			noConfig: "No playlists configured in config.js.", custom: "Custom",
			openExt: "Open in browser", openHint: "You can open it directly in the browser instead.", closePlayer: "Close player",
			openedExt: "Opened in a new tab."
		},
		ar: {
			loading: "جارٍ تحميل المحطات…", search: "ابحث عن محطة", all: "الكل", favorites: "المفضلة",
			reload: "تحديث المحطات", playlist: "القائمة", connecting: "جارٍ الاتصال…", buffering: "جارٍ التحميل…",
			playing: "بث مباشر", stopped: "متوقف — اضغط للتشغيل", retrying: "مشكلة في الاتصال، إعادة المحاولة ({n})…",
			tryingAlt: "تجربة رابط آخر…", offline: "لا يوجد اتصال بالإنترنت. بانتظار الاتصال…",
			tapToPlay: "اضغط زر التشغيل للبدء", err_network: "تعذّر الوصول إلى هذه المحطة حالياً.",
			err_unsupported: "صيغة بث هذه المحطة غير مدعومة على هذا الجهاز.",
			err_insecure: "هذه المحطة تبث عبر رابط غير آمن (http) تحظره المتصفحات في المواقع الآمنة.",
			err_timeout: "المحطة لا تستجيب.", err_generic: "لا يمكن تشغيل هذه المحطة حالياً.",
			tapRetry: "اضغط تشغيل للمحاولة مجدداً، أو اختر محطة أخرى.",
			plFail: "تعذّر تحميل قائمة المحطات. تحقق من الاتصال بالإنترنت.",
			plCached: "تُعرض نسخة محفوظة من قائمة المحطات (من {d}).",
			plEmpty: "قائمة المحطات فارغة.", noResults: "لا توجد محطات مطابقة لبحثك.",
			noFavs: "لا توجد محطات مفضلة بعد. اضغط ☆ بجانب المحطة لإضافتها.", tryAgain: "حاول مجدداً",
			addFav: "إضافة إلى المفضلة", removeFav: "إزالة من المفضلة", play: "تشغيل", stop: "إيقاف",
			prev: "المحطة السابقة", next: "المحطة التالية", stations: "{n} محطة",
			noConfig: "لا توجد قوائم في config.js.", custom: "مخصصة",
			openExt: "فتح في المتصفح", openHint: "يمكنك فتحها مباشرة في المتصفح بدلاً من ذلك.", closePlayer: "إغلاق المشغل",
			openedExt: "فُتحت في نافذة جديدة."
		}
	};
	var lang = CFG.language === "auto" ? (navigator.language || "en").slice(0, 2).toLowerCase() : CFG.language;
	if (!STR[lang]) lang = "en";
	function t(key, vars) {
		var s = STR[lang][key] || STR.en[key] || key;
		if (vars) Object.keys(vars).forEach(function (k) { s = s.split("{" + k + "}").join(vars[k]); });
		return s;
	}

	/* ---------- Icons ---------- */
	var ICON = {
		play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M8 5.14v13.72a1 1 0 0 0 1.52.85l10.8-6.86a1 1 0 0 0 0-1.7L9.52 4.29A1 1 0 0 0 8 5.14z"/></svg>',
		pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1.2" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1.2" fill="currentColor"/></svg>',
		spinner: '<svg class="spin" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-dasharray="40 100"/></svg>',
		prev: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6 5h2.5v14H6zM20 5v14L9 12z"/></svg>',
		next: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M15.5 5H18v14h-2.5zM4 5v14l11-7z"/></svg>',
		close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" d="M6 6l12 12M18 6L6 18"/></svg>',
		reload: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" d="M20 12a8 8 0 1 1-2.34-5.66M20 4v5h-5"/></svg>'
	};

	/* ---------- Storage (safe in private mode) ---------- */
	var store = {
		get: function (k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
		set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* quota / private mode */ } }
	};

	/* ---------- DOM ---------- */
	function $(id) { return document.getElementById(id); }
	var el = {
		audio: $("audio"), list: $("list"), search: $("search"), select: $("playlistSelect"),
		reload: $("reloadBtn"), notice: $("notice"), noticeText: $("noticeText"), noticeBtn: $("noticeBtn"),
		loading: $("loading"), empty: $("empty"), count: $("count"), player: $("player"),
		npLogo: $("npLogo"), npName: $("npName"), npStatus: $("npStatus"),
		play: $("playBtn"), prev: $("prevBtn"), next: $("nextBtn"), title: $("appTitle"),
		close: $("closeBtn"), ext: $("openExt")
	};

	/* ---------- State ---------- */
	var state = {
		playlists: [], playlist: null, stations: [], view: [], filter: "all", showGroups: false,
		station: null, cands: [], ci: 0, attempt: 0, hadPlayed: false,
		token: 0, wantPlay: false, status: "idle", waitingOnline: false,
		internalAt: 0, hls: null, timers: {}, lastTime: 0, lastProgressAt: 0, activeRow: null, loadSeq: 0
	};
	var favs = store.get("radio.favs", {}) || {};
	var rowsByKey = {};
	var badLogos = {};

	/* ---------- Helpers ---------- */
	var UA = navigator.userAgent || "";
	var IS_IOS = /iP(hone|ad|od)/.test(UA) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
	var IS_SAFARI = /Safari/.test(UA) && !/Chrome|Chromium|CriOS|FxiOS|EdgiOS|Edg\/|OPR|Android/.test(UA);
	var SECURE = location.protocol === "https:";

	function keyOf(name) { return name.toLowerCase().replace(/\s+/g, " ").trim(); }
	function searchNorm(s) {
		return (s || "").toLowerCase()
			.replace(/[ً-ْـ]/g, "")
			.replace(/[أإآٱ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي")
			.replace(/\s+/g, " ").trim();
	}
	function isHlsUrl(u) { return /\.m3u8(\?|#|$)/i.test(u); }
	function secureUrl(u) { return SECURE ? u.replace(/^http:\/\//i, "https://") : u; }
	function initialOf(name) { var c = Array.from((name || "?").trim())[0] || "?"; return c.toUpperCase(); }
	function canNativeHls() { try { return !!el.audio.canPlayType("application/vnd.apple.mpegurl"); } catch (e) { return false; } }
	function hasMSE() { return !!(window.MediaSource || window.ManagedMediaSource || window.WebKitMediaSource); }
	function useHlsJs() {
		if (canNativeHls() && (IS_IOS || IS_SAFARI || !hasMSE())) return false;
		return hasMSE();
	}

	/* ---------- M3U parsing ---------- */
	function parseExtinf(line) {
		var body = line.replace(/^#EXTINF:/i, "");
		var inQ = false, idx = -1;
		for (var i = 0; i < body.length; i++) {
			var c = body[i];
			if (c === '"') inQ = !inQ;
			else if (c === "," && !inQ) { idx = i; break; }
		}
		var attrsPart = idx >= 0 ? body.slice(0, idx) : body;
		var name = idx >= 0 ? body.slice(idx + 1).trim() : "";
		var attrs = {};
		attrsPart.replace(/([\w-]+)="([^"]*)"/g, function (_, k, v) { attrs[k.toLowerCase()] = v.trim(); return ""; });
		return {
			name: name || attrs["tvg-name"] || "",
			logo: attrs["tvg-logo"] || attrs.logo || "",
			group: attrs["group-title"] || ""
		};
	}
	function nameFromUrl(u) {
		try { var x = new URL(u); return x.hostname + (x.pathname.length > 1 ? x.pathname : ""); } catch (e) { return u; }
	}
	function parseM3U(text) {
		var lines = String(text || "").replace(/^﻿/, "").split(/\r?\n|\r/);
		var out = [], meta = null;
		lines.forEach(function (raw) {
			var line = raw.trim();
			if (!line) return;
			if (/^#EXTINF/i.test(line)) { meta = parseExtinf(line); return; }
			if (/^#EXTGRP:/i.test(line)) { if (meta && !meta.group) meta.group = line.slice(8).trim(); return; }
			if (line.charAt(0) === "#") return;
			if (/^https?:\/\//i.test(line)) {
				out.push({
					name: (meta && meta.name) || nameFromUrl(line),
					logo: (meta && meta.logo) || "",
					group: (meta && meta.group) || "",
					url: line
				});
			}
			meta = null;
		});
		return out;
	}
	// Stations added in config (playlist.extraStations) -> same shape as parsed M3U entries.
	function extraEntries(list) {
		var out = [];
		(list || []).forEach(function (s) {
			if (!s || !s.name) return;
			[].concat(s.urls || s.url || []).forEach(function (u) {
				if (/^https?:\/\//i.test(u)) out.push({ name: String(s.name).trim(), logo: s.logo || "", group: s.group || "", url: u });
			});
		});
		return out;
	}

	// Per-station fixes from config (stationOverrides), matched by name.
	var OVERRIDES = {};
	Object.keys(CFG.stationOverrides || {}).forEach(function (n) { OVERRIDES[keyOf(n)] = CFG.stationOverrides[n] || {}; });
	function applyOverride(st) {
		var o = OVERRIDES[st.key];
		if (!o) return st;
		if (o.hidden) return null;
		var extra = [].concat(o.urls || o.url || []).filter(Boolean);
		if (extra.length) {
			st.urls = o.replace ? extra.slice() : extra.concat(st.urls.filter(function (u) { return extra.indexOf(u) < 0; }));
		}
		if (o.name) st.name = o.name;
		if (o.logo) st.logo = o.logo;
		return st;
	}

	// Same-name entries become one station with backup links.
	function buildStations(entries) {
		var map = {}, list = [];
		entries.forEach(function (e) {
			var k = keyOf(e.name);
			var st = map[k];
			if (!st) {
				st = map[k] = { key: k, name: e.name, logo: e.logo, group: e.group, urls: [] };
				list.push(st);
			}
			if (!st.logo && e.logo) st.logo = e.logo;
			if (st.urls.indexOf(e.url) < 0) st.urls.push(e.url);
		});
		list = list.map(applyOverride).filter(Boolean);
		list.forEach(function (s) { s.search = searchNorm(s.name + " " + s.group); });
		list.sort(function (a, b) {
			try { return a.name.localeCompare(b.name, [lang, "ar", "en"], { sensitivity: "base", numeric: true }); }
			catch (e) { return a.name < b.name ? -1 : a.name > b.name ? 1 : 0; }
		});
		return list;
	}

	/* ---------- Playlist loading ---------- */
	function fetchText(url, ms) {
		var ctrl = window.AbortController ? new AbortController() : null;
		return new Promise(function (resolve, reject) {
			var timer = setTimeout(function () {
				try { if (ctrl) ctrl.abort(); } catch (e) { /* ignore */ }
				reject(new Error("timeout"));
			}, ms);
			fetch(url, { cache: "no-cache", credentials: "omit", signal: ctrl ? ctrl.signal : undefined })
				.then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.text(); })
				.then(function (tx) { clearTimeout(timer); resolve(tx); }, function (e) { clearTimeout(timer); reject(e); });
		});
	}

	function loadPlaylist(pl) {
		var seq = ++state.loadSeq;
		var cacheKey = "radio.pl." + pl.id;
		var urls = pl.urls.slice();
		hideNotice();
		el.reload.classList.add("busy");
		el.loading.hidden = state.stations.length > 0;

		var i = 0, lastErr = null;
		function next() {
			if (i >= urls.length) return Promise.reject(lastErr || new Error("no url"));
			var url = urls[i++];
			return fetchText(url, CFG.playlistTimeoutMs).then(function (text) {
				var entries = parseM3U(text);
				if (!entries.length) throw new Error("empty");
				var st = buildStations(entries.concat(pl.extra));
				store.set(cacheKey, { t: Date.now(), text: text });
				return st;
			}).catch(function (e) {
				if (window.console) console.warn("Playlist failed:", url, e);
				lastErr = e;
				return next();
			});
		}

		next().then(function (stations) {
			if (seq !== state.loadSeq) return;
			applyStations(stations);
		}, function (err) {
			if (seq !== state.loadSeq) return;
			var cached = store.get(cacheKey, null);
			var fromCache = cached && cached.text ? parseM3U(cached.text) : [];
			var stations = buildStations(fromCache.concat(pl.extra));
			if (fromCache.length) {
				applyStations(stations);
				showNotice(t("plCached", { d: new Date(cached.t).toLocaleString() }), true, true);
			} else if (!urls.length) {
				applyStations(stations); // list made only from extraStations
			} else {
				applyStations(stations);
				showNotice(t(err && err.message === "empty" ? "plEmpty" : "plFail"), true);
			}
		}).then(function () {
			if (seq !== state.loadSeq) return;
			el.reload.classList.remove("busy");
			el.loading.hidden = true;
		});
	}

	function applyStations(stations) {
		state.stations = stations;
		var groups = {};
		stations.forEach(function (s) { if (s.group) groups[s.group] = 1; });
		state.showGroups = Object.keys(groups).length > 1;
		// Refresh remembered station with current links (if not playing).
		if (state.station && !state.wantPlay) {
			var found = stations.filter(function (s) { return s.key === state.station.key; })[0];
			if (found) { state.station = found; showPlayer(found); }
		}
		render();
		if (useHlsJs() && stations.some(function (s) { return s.urls.some(isHlsUrl); })) {
			loadHlsLib().catch(function () { /* handled on play */ });
		}
	}

	function showNotice(text, retry, info) {
		el.noticeText.textContent = text;
		el.noticeBtn.hidden = !retry;
		el.notice.classList.toggle("info", !!info);
		el.notice.hidden = false;
	}
	function hideNotice() { el.notice.hidden = true; }

	/* ---------- Rendering ---------- */
	function makeLogo(st, cls) {
		var wrap = document.createElement("span");
		wrap.className = cls;
		var ini = document.createElement("span");
		ini.className = "initial";
		ini.setAttribute("aria-hidden", "true");
		ini.textContent = initialOf(st.name);
		wrap.appendChild(ini);
		var src = st.logo ? secureUrl(st.logo) : "";
		if (src && !badLogos[src]) {
			var img = document.createElement("img");
			img.alt = "";
			img.decoding = "async";
			img.setAttribute("loading", "lazy");
			img.setAttribute("referrerpolicy", "no-referrer");
			img.onload = function () { wrap.classList.add("has-img"); };
			img.onerror = function () { badLogos[src] = 1; if (img.parentNode) img.parentNode.removeChild(img); };
			img.src = src;
			wrap.appendChild(img);
		}
		return wrap;
	}

	function setFavBtn(btn, on) {
		btn.textContent = on ? "★" : "☆";
		btn.setAttribute("aria-pressed", on ? "true" : "false");
		btn.setAttribute("aria-label", on ? t("removeFav") : t("addFav"));
	}

	function buildRow(s) {
		var li = document.createElement("li");
		li.className = "row";
		var main = document.createElement("button");
		main.type = "button";
		main.className = "row-main";
		main.setAttribute("data-action", "play");
		main.appendChild(makeLogo(s, "logo"));
		var txt = document.createElement("span");
		txt.className = "row-text";
		var nm = document.createElement("span");
		nm.className = "row-name";
		nm.dir = "auto";
		nm.textContent = s.name;
		txt.appendChild(nm);
		if (state.showGroups && s.group) {
			var sub = document.createElement("span");
			sub.className = "row-sub";
			sub.dir = "auto";
			sub.textContent = s.group;
			txt.appendChild(sub);
		}
		main.appendChild(txt);
		var eq = document.createElement("span");
		eq.className = "eq";
		eq.setAttribute("aria-hidden", "true");
		eq.innerHTML = "<i></i><i></i><i></i>";
		main.appendChild(eq);
		var fav = document.createElement("button");
		fav.type = "button";
		fav.className = "fav";
		fav.setAttribute("data-action", "fav");
		setFavBtn(fav, !!favs[s.key]);
		li.appendChild(main);
		li.appendChild(fav);
		li._station = s;
		rowsByKey[s.key] = li;
		return li;
	}

	function render() {
		var q = searchNorm(el.search.value);
		var all = state.stations;
		var view = all.filter(function (s) {
			if (state.filter === "fav" && !favs[s.key]) return false;
			return !q || s.search.indexOf(q) >= 0;
		});
		state.view = view;
		rowsByKey = {};
		state.activeRow = null;
		var frag = document.createDocumentFragment();
		view.forEach(function (s) { frag.appendChild(buildRow(s)); });
		el.list.textContent = "";
		el.list.appendChild(frag);
		el.empty.hidden = view.length > 0 || !all.length;
		if (!view.length && all.length) el.empty.textContent = state.filter === "fav" && !q ? t("noFavs") : t("noResults");
		el.count.textContent = all.length ? t("stations", { n: view.length }) : "";
		updateActiveRow();
	}

	function updateActiveRow() {
		var key = state.station ? state.station.key : null;
		if (state.activeRow && state.activeRow._station.key !== key) {
			state.activeRow.classList.remove("active", "is-playing");
		}
		var row = key ? rowsByKey[key] : null;
		if (row) {
			row.classList.add("active");
			row.classList.toggle("is-playing", state.status === "playing");
		}
		state.activeRow = row || null;
	}

	function scrollToRow(key) {
		var row = rowsByKey[key];
		if (!row) return;
		try { row.scrollIntoView({ block: "nearest", behavior: "smooth" }); } catch (e) { row.scrollIntoView(false); }
	}

	function syncPlayerHeight() {
		var h = el.player.hidden ? 0 : el.player.offsetHeight;
		document.documentElement.style.setProperty("--player-h", h + "px");
	}

	function showPlayer(st) {
		el.player.hidden = false;
		el.npName.textContent = st.name;
		var logo = makeLogo(st, "logo np-logo");
		logo.id = "npLogo";
		el.npLogo.parentNode.replaceChild(logo, el.npLogo);
		el.npLogo = logo;
		syncPlayerHeight();
	}

	function setStatus(kind, text) {
		state.status = kind;
		// http-only station: offer the browser fallback while trying and after failing.
		var extUrl = (kind === "connecting" || kind === "error" || kind === "offline") ? state.extUrl : null;
		el.ext.hidden = !extUrl;
		if (extUrl) el.ext.href = extUrl;
		el.player.className = "player is-" + kind;
		el.npStatus.textContent = text || "";
		var icon = (kind === "playing" || kind === "buffering") ? ICON.pause
			: (kind === "connecting" || kind === "offline") ? ICON.spinner : ICON.play;
		if (el.play._icon !== icon) { el.play.innerHTML = icon; el.play._icon = icon; }
		el.play.setAttribute("aria-label", state.wantPlay ? t("stop") : t("play"));
		document.title = state.station ? state.station.name + " · " + CFG.appTitle : CFG.appTitle;
		updateActiveRow();
		if ("mediaSession" in navigator) {
			try { navigator.mediaSession.playbackState = state.wantPlay ? "playing" : "paused"; } catch (e) { /* ignore */ }
		}
		syncPlayerHeight();
	}

	/* ---------- HLS library (lazy) ---------- */
	var hlsPromise = null;
	function loadHlsLib() {
		if (window.Hls) return Promise.resolve(window.Hls);
		if (hlsPromise) return hlsPromise;
		hlsPromise = new Promise(function (resolve, reject) {
			var s = document.createElement("script");
			s.src = CFG.hlsLibraryUrl;
			s.async = true;
			s.onload = function () { window.Hls ? resolve(window.Hls) : reject(new Error("Hls missing")); };
			s.onerror = function () { hlsPromise = null; reject(new Error("Hls load failed")); };
			document.head.appendChild(s);
		});
		return hlsPromise;
	}

	/* ---------- Playback engine ---------- */
	function clearTimers() {
		clearTimeout(state.timers.connect);
		clearTimeout(state.timers.retry);
		state.timers = {};
	}

	function teardownMedia() {
		state.internalAt = Date.now();
		if (state.hls) { try { state.hls.destroy(); } catch (e) { /* ignore */ } state.hls = null; }
		var a = el.audio;
		try { a.pause(); } catch (e) { /* ignore */ }
		if (a.getAttribute("src")) {
			a.removeAttribute("src");
			try { a.load(); } catch (e) { /* ignore */ }
		}
	}

	function buildCandidates(st) {
		var seen = {}, out = [];
		st.urls.forEach(function (u) {
			var up = SECURE && /^http:\/\//i.test(u);
			var c = { url: up ? secureUrl(u) : u, upgraded: up };
			if (!seen[c.url]) { seen[c.url] = 1; out.push(c); }
		});
		// Links that are already secure first.
		return out.filter(function (c) { return !c.upgraded; }).concat(out.filter(function (c) { return c.upgraded; }));
	}

	// On https pages: the first http link if the station has no https links at all.
	function httpOnlyUrl(st) {
		if (!SECURE || !st || !st.urls || !st.urls.length) return null;
		var http = st.urls.filter(function (u) { return /^http:\/\//i.test(u); });
		return http.length === st.urls.length ? http[0] : null;
	}

	// Remember https versions that failed, to skip the wait next time.
	var httpsFails = store.get("radio.httpsFail", {}) || {};
	function recentlyFailed(cands) {
		var now = Date.now(), ttl = CFG.httpsFailMemoryHours * 3600000;
		return cands.length > 0 && cands.every(function (c) {
			return c.upgraded && httpsFails[c.url] && now - httpsFails[c.url] < ttl;
		});
	}
	function rememberFail(cands) {
		var now = Date.now();
		cands.forEach(function (c) { if (c.upgraded) httpsFails[c.url] = now; });
		store.set("radio.httpsFail", httpsFails);
	}
	function forgetFail(url) {
		if (!httpsFails[url]) return;
		delete httpsFails[url];
		store.set("radio.httpsFail", httpsFails);
	}

	// force = try even if the https version failed recently (play button).
	function playStation(st, force) {
		state.token++;
		clearTimers();
		state.station = st;
		state.cands = buildCandidates(st);
		state.ci = 0;
		state.attempt = 0;
		state.hadPlayed = false;
		state.waitingOnline = false;
		state.wantPlay = true;
		state.extUrl = httpOnlyUrl(st);
		store.set("radio.last", { key: st.key, name: st.name, logo: st.logo, group: st.group, urls: st.urls });
		showPlayer(st);
		updateMediaSession(st);
		if (!state.cands.length) { state.wantPlay = false; setStatus("error", t("err_generic")); return; }
		if (!force && recentlyFailed(state.cands)) {
			teardownMedia();
			state.wantPlay = false;
			setStatus("error", t("err_insecure") + " " + t("openHint"));
			return;
		}
		startCandidate(); // must stay synchronous for iOS (user gesture)
	}

	function startCandidate() {
		var tok = ++state.token;
		var c = state.cands[state.ci];
		clearTimers();
		teardownMedia();
		setStatus("connecting", state.attempt > 0 ? t("retrying", { n: state.attempt }) : state.ci > 0 ? t("tryingAlt") : t("connecting"));
		var wait = c.upgraded && !state.hadPlayed ? CFG.httpsUpgradeTimeoutMs : CFG.connectTimeoutMs;
		state.timers.connect = setTimeout(function () { fail(tok, "timeout"); }, wait);

		if (isHlsUrl(c.url) && useHlsJs()) {
			loadHlsLib().then(function (Hls) {
				if (tok !== state.token) return;
				if (Hls.isSupported()) playHls(Hls, c.url, tok); else playNative(c.url, tok);
			}, function () {
				if (tok === state.token) playNative(c.url, tok);
			});
		} else {
			playNative(c.url, tok);
		}
	}

	function playNative(url, tok) {
		el.audio.src = url;
		try { el.audio.load(); } catch (e) { /* ignore */ }
		doPlay(tok);
	}

	function playHls(Hls, url, tok) {
		var hls = new Hls({ enableWorker: true, lowLatencyMode: false });
		var recovered = false;
		state.hls = hls;
		hls.on(Hls.Events.ERROR, function (_, data) {
			if (tok !== state.token || !data || !data.fatal) return;
			if (data.type === Hls.ErrorTypes.MEDIA_ERROR && !recovered) {
				recovered = true;
				try { hls.recoverMediaError(); return; } catch (e) { /* fall through */ }
			}
			fail(tok, data.type === Hls.ErrorTypes.NETWORK_ERROR ? "network" : "generic");
		});
		hls.on(Hls.Events.MANIFEST_PARSED, function () { if (tok === state.token) doPlay(tok); });
		hls.attachMedia(el.audio);
		hls.loadSource(url);
	}

	function doPlay(tok) {
		var p;
		try { p = el.audio.play(); } catch (e) { fail(tok, "generic"); return; }
		if (p && typeof p.catch === "function") {
			p.catch(function (err) {
				if (tok !== state.token) return;
				var name = err && err.name;
				if (name === "AbortError") return; // superseded by a newer load
				if (name === "NotAllowedError") {  // browser requires a tap
					state.token++;
					clearTimers();
					teardownMedia();
					state.wantPlay = false;
					setStatus("stopped", t("tapToPlay"));
					return;
				}
				fail(tok, "generic");
			});
		}
	}

	function fail(tok, reason) {
		if (tok !== state.token || !state.wantPlay) return;
		var myTok = ++state.token;
		clearTimers();
		teardownMedia();
		if (window.console) console.warn("Stream failed:", reason, state.cands[state.ci] && state.cands[state.ci].url);

		if (navigator.onLine === false) {
			state.waitingOnline = true;
			setStatus("offline", t("offline"));
			return;
		}
		var c = state.cands[state.ci];
		var max = state.hadPlayed ? CFG.retriesAfterPlaying : (c.upgraded ? CFG.httpsUpgradeRetries : CFG.retriesPerUrl);
		if (reason !== "unsupported" && state.attempt < max) {
			state.attempt++;
			setStatus("connecting", t("retrying", { n: state.attempt }));
			state.timers.retry = setTimeout(function () {
				if (myTok === state.token) startCandidate();
			}, Math.min(1500 * state.attempt, 8000));
			return;
		}
		if (state.ci < state.cands.length - 1) {
			state.ci++;
			state.attempt = 0;
			startCandidate();
			return;
		}
		state.wantPlay = false;
		var allUpgraded = state.cands.every(function (x) { return x.upgraded; });
		if (allUpgraded && !state.hadPlayed) {
			// Browsers block http audio inside https pages, but a new tab can play it.
			rememberFail(state.cands);
			setStatus("error", t("err_insecure") + " " + t("openHint"));
		} else {
			setStatus("error", t("err_" + reason) + " " + t("tapRetry"));
		}
	}

	function stop() {
		state.wantPlay = false;
		state.waitingOnline = false;
		state.token++;
		clearTimers();
		teardownMedia();
		setStatus("stopped", t("stopped"));
	}

	function closePlayer() {
		stop();
		state.station = null;
		state.extUrl = null;
		store.set("radio.last", null);
		el.player.hidden = true;
		document.title = CFG.appTitle;
		if ("mediaSession" in navigator) {
			try { navigator.mediaSession.metadata = null; navigator.mediaSession.playbackState = "none"; } catch (e) { /* ignore */ }
		}
		updateActiveRow();
		syncPlayerHeight();
	}

	function togglePlay() {
		if (!state.station) {
			var list = state.view.length ? state.view : state.stations;
			if (list.length) playStation(list[0]);
			return;
		}
		if (state.wantPlay) stop(); else playStation(state.station, true);
	}

	function step(dir) {
		var list = state.view.length ? state.view : state.stations;
		if (!list.length) return;
		var i = -1;
		if (state.station) {
			for (var j = 0; j < list.length; j++) if (list[j].key === state.station.key) { i = j; break; }
		}
		var n = i < 0 ? (dir > 0 ? 0 : list.length - 1) : (i + dir + list.length) % list.length;
		playStation(list[n]);
		scrollToRow(list[n].key);
	}

	function mediaErrReason() {
		var e = el.audio.error;
		if (!e) return "generic";
		if (e.code === 2) return "network";
		if (e.code === 3) return "unsupported";
		return "generic";
	}

	/* ---------- Audio element events ---------- */
	function bindAudio() {
		var a = el.audio;
		a.addEventListener("playing", function () {
			if (!state.wantPlay) return;
			clearTimeout(state.timers.connect);
			state.attempt = 0;
			state.hadPlayed = true;
			var c = state.cands[state.ci];
			if (c && c.upgraded) forgetFail(c.url);
			state.lastTime = a.currentTime;
			state.lastProgressAt = Date.now();
			setStatus("playing", t("playing"));
		});
		a.addEventListener("waiting", function () {
			if (state.wantPlay && state.status === "playing") setStatus("buffering", t("buffering"));
		});
		a.addEventListener("error", function () {
			if (!state.wantPlay || (!a.getAttribute("src") && !state.hls)) return;
			fail(state.token, mediaErrReason());
		});
		a.addEventListener("ended", function () {
			if (state.wantPlay) fail(state.token, "network");
		});
		// Paused by the system (lock screen, headphones unplugged, phone call…).
		// A dropped stream also fires "pause" (with ended = true) before "ended"; let "ended" reconnect.
		a.addEventListener("pause", function () {
			if (Date.now() - state.internalAt < 1000 || !state.wantPlay || a.ended) return;
			state.wantPlay = false;
			state.token++;
			clearTimers();
			setStatus("stopped", t("stopped"));
		});
		// Resumed by the system (older lock screens without Media Session)
		a.addEventListener("play", function () {
			if (state.wantPlay || !state.station || Date.now() - state.internalAt < 1000) return;
			if (!a.getAttribute("src") && !state.hls) return;
			state.wantPlay = true;
			var tok = ++state.token;
			setStatus("connecting", t("connecting"));
			state.timers.connect = setTimeout(function () { fail(tok, "timeout"); }, CFG.connectTimeoutMs);
		});

		// Watchdog: reconnect if audio stops moving.
		setInterval(function () {
			if (!state.wantPlay || (state.status !== "playing" && state.status !== "buffering")) return;
			var now = Date.now(), ct = a.currentTime;
			if (ct > state.lastTime + 0.05 || ct < state.lastTime - 1) {
				state.lastTime = ct;
				state.lastProgressAt = now;
				if (state.status === "buffering" && !a.paused) setStatus("playing", t("playing"));
				return;
			}
			if (now - state.lastProgressAt > CFG.stallTimeoutMs) fail(state.token, "timeout");
		}, 2000);
	}

	/* ---------- Media Session (lock screen / headphones) ---------- */
	function updateMediaSession(st) {
		if (!("mediaSession" in navigator) || !window.MediaMetadata) return;
		try {
			navigator.mediaSession.metadata = new MediaMetadata({
				title: st.name,
				artist: state.playlist ? state.playlist.name : "",
				album: CFG.appTitle,
				artwork: st.logo ? [{ src: secureUrl(st.logo) }] : [{ src: "icon.svg", type: "image/svg+xml" }]
			});
		} catch (e) { /* ignore */ }
	}
	function setupMediaSession() {
		if (!("mediaSession" in navigator)) return;
		var h = {
			play: function () { if (state.station && !state.wantPlay) playStation(state.station); },
			pause: stop,
			stop: stop,
			previoustrack: function () { step(-1); },
			nexttrack: function () { step(1); }
		};
		Object.keys(h).forEach(function (k) {
			try { navigator.mediaSession.setActionHandler(k, h[k]); } catch (e) { /* unsupported action */ }
		});
	}

	/* ---------- UI events ---------- */
	function bindUI() {
		el.list.addEventListener("click", function (e) {
			var btn = e.target.closest ? e.target.closest("button[data-action]") : null;
			if (!btn) return;
			var li = btn.parentNode;
			var s = li && li._station;
			if (!s) return;
			if (btn.getAttribute("data-action") === "fav") {
				if (favs[s.key]) delete favs[s.key]; else favs[s.key] = 1;
				store.set("radio.favs", favs);
				setFavBtn(btn, !!favs[s.key]);
				if (state.filter === "fav") render();
				return;
			}
			if (state.station && state.station.key === s.key && state.wantPlay) return;
			playStation(s);
		});

		var searchTimer;
		el.search.addEventListener("input", function () {
			clearTimeout(searchTimer);
			searchTimer = setTimeout(render, 120);
		});
		el.search.addEventListener("keydown", function (e) {
			if (e.key === "Enter") el.search.blur();
		});

		Array.prototype.forEach.call(document.querySelectorAll(".chip"), function (chip) {
			chip.addEventListener("click", function () {
				state.filter = chip.getAttribute("data-filter");
				Array.prototype.forEach.call(document.querySelectorAll(".chip"), function (c) {
					c.classList.toggle("active", c === chip);
				});
				render();
			});
		});

		el.play.addEventListener("click", togglePlay);
		el.close.addEventListener("click", closePlayer);
		// Let the link open the tab first, then stop the in-app attempt.
		el.ext.addEventListener("click", function () {
			setTimeout(function () {
				if (state.wantPlay) stop();
				setStatus("stopped", t("openedExt"));
			}, 0);
		});
		el.prev.addEventListener("click", function () { step(-1); });
		el.next.addEventListener("click", function () { step(1); });
		el.reload.addEventListener("click", function () { loadPlaylist(state.playlist); });
		el.noticeBtn.addEventListener("click", function () { loadPlaylist(state.playlist); });
		el.select.addEventListener("change", function () {
			var pl = state.playlists[el.select.selectedIndex];
			if (!pl) return;
			state.playlist = pl;
			store.set("radio.playlist", pl.id);
			state.stations = [];
			render();
			loadPlaylist(pl);
		});

		document.addEventListener("keydown", function (e) {
			var tag = (e.target && e.target.tagName) || "";
			if (/INPUT|SELECT|TEXTAREA|BUTTON/.test(tag)) return;
			if (e.key === " " || e.key === "Spacebar") { e.preventDefault(); togglePlay(); }
		});

		window.addEventListener("offline", function () {
			if (state.wantPlay) setStatus("offline", t("offline"));
		});
		window.addEventListener("online", function () {
			if (state.wantPlay && (state.waitingOnline || state.status === "offline")) {
				state.waitingOnline = false;
				state.attempt = 0;
				startCandidate();
			}
			if (!state.stations.length && state.playlist) loadPlaylist(state.playlist);
		});

		if (window.ResizeObserver) new ResizeObserver(syncPlayerHeight).observe(el.player);
		window.addEventListener("resize", syncPlayerHeight);
		window.addEventListener("orientationchange", syncPlayerHeight);
	}

	/* ---------- Init ---------- */
	function normalizePlaylists() {
		var list = (CFG.playlists || []).map(function (p, i) {
			if (!p) return null;
			var urls = [].concat(p.urls || p.url || []).filter(Boolean);
			var extra = extraEntries(p.extraStations);
			return urls.length || extra.length ? { id: String(p.id || "pl" + i), name: p.name || "Playlist " + (i + 1), urls: urls, extra: extra } : null;
		}).filter(Boolean);
		var custom = null;
		try { custom = new URLSearchParams(location.search).get("url"); } catch (e) { /* ignore */ }
		if (custom && /^https?:\/\//i.test(custom)) {
			list.unshift({ id: "custom-" + keyOf(custom).replace(/[^a-z0-9]+/g, "-").slice(0, 60), name: t("custom"), urls: [custom], extra: [], forced: true });
		}
		return list;
	}

	function init() {
		var root = document.documentElement;
		root.lang = lang;
		root.dir = lang === "ar" ? "rtl" : "ltr";
		el.title.textContent = CFG.appTitle;
		document.title = CFG.appTitle;
		Array.prototype.forEach.call(document.querySelectorAll("[data-i18n]"), function (n) {
			n.textContent = t(n.getAttribute("data-i18n"));
		});
		el.search.placeholder = t("search");
		el.search.setAttribute("aria-label", t("search"));
		el.select.setAttribute("aria-label", t("playlist"));
		el.reload.innerHTML = ICON.reload;
		el.reload.setAttribute("aria-label", t("reload"));
		el.prev.innerHTML = ICON.prev;
		el.prev.setAttribute("aria-label", t("prev"));
		el.next.innerHTML = ICON.next;
		el.next.setAttribute("aria-label", t("next"));
		el.close.innerHTML = ICON.close;
		el.close.setAttribute("aria-label", t("closePlayer"));
		el.ext.textContent = t("openExt");

		bindAudio();
		bindUI();
		setupMediaSession();

		state.playlists = normalizePlaylists();
		if (!state.playlists.length) {
			el.loading.hidden = true;
			showNotice(t("noConfig"), false);
			return;
		}

		var wanted = null;
		try { wanted = new URLSearchParams(location.search).get("p"); } catch (e) { /* ignore */ }
		var saved = store.get("radio.playlist", null);
		var pick = state.playlists.filter(function (p) { return p.forced; })[0]
			|| state.playlists.filter(function (p) { return p.id === wanted; })[0]
			|| state.playlists.filter(function (p) { return p.id === saved; })[0]
			|| state.playlists[0];
		state.playlist = pick;

		if (state.playlists.length > 1) {
			state.playlists.forEach(function (p) {
				var o = document.createElement("option");
				o.textContent = p.name;
				o.selected = p === pick;
				el.select.appendChild(o);
			});
			el.select.hidden = false;
		}

		var last = store.get("radio.last", null);
		if (last && last.key && last.name && last.urls && last.urls.length) {
			state.station = last;
			showPlayer(last);
			setStatus("stopped", t("tapToPlay"));
		}

		loadPlaylist(pick);
	}

	init();
})();
