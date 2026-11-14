const fs = require("fs"), vm = require("vm"), path = require("path");
const ROOT = path.resolve(__dirname, "..", "public");
// Run: node tests/app.test.js   (no network; fake DOM/audio/fetch)
let pass = 0, failN = 0;
function ok(c, msg) { if (c) { pass++; } else { failN++; console.log("FAIL:", msg); } }

/* ---------- fake DOM ---------- */
class CL { constructor(){ this.s = new Set(); } add(...a){ a.forEach(x=>this.s.add(x)); } remove(...a){ a.forEach(x=>this.s.delete(x)); }
	toggle(x,f){ if(f===undefined) f=!this.s.has(x); f?this.s.add(x):this.s.delete(x); return f; } contains(x){ return this.s.has(x); } }
class El {
	constructor(tag, id){ this.tagName=(tag||"div").toUpperCase(); this.id=id||""; this.attrs={}; this.children=[]; this.parentNode=null;
		this.classList=new CL(); this.listeners={}; this.style={ setProperty(){} }; this.hidden=false; this._text=""; this.dataset={}; this.offsetHeight=150; }
	set className(v){ this.classList=new CL(); String(v).split(/\s+/).filter(Boolean).forEach(c=>this.classList.add(c)); }
	get className(){ return [...this.classList.s].join(" "); }
	set textContent(v){ this._text=String(v); this.children=[]; } get textContent(){ return this._text + this.children.map(c=>c.textContent).join(""); }
	set innerHTML(v){ this._html=v; this.children=[]; } get innerHTML(){ return this._html||""; }
	setAttribute(k,v){ this.attrs[k]=String(v); } getAttribute(k){ return k in this.attrs ? this.attrs[k] : null; } removeAttribute(k){ delete this.attrs[k]; }
	appendChild(c){ if (c.isFrag){ c.children.forEach(x=>this.appendChild(x)); c.children=[]; return c; } c.parentNode=this; this.children.push(c); return c; }
	removeChild(c){ this.children=this.children.filter(x=>x!==c); c.parentNode=null; }
	replaceChild(n,o){ const i=this.children.indexOf(o); if(i>=0) this.children[i]=n; n.parentNode=this; }
	addEventListener(t,f){ (this.listeners[t]=this.listeners[t]||[]).push(f); }
	dispatch(t, extra){ (this.listeners[t]||[]).forEach(f=>f(Object.assign({ target:this, preventDefault(){} }, extra||{}))); }
	closest(sel){ let n=this; while(n){ if(sel.startsWith("button") && n.tagName==="BUTTON" && n.getAttribute("data-action")) return n; if(sel==="li.row"&&n.tagName==="LI") return n; n=n.parentNode; } return null; }
	scrollIntoView(){} blur(){}
	set src(v){ this.attrs.src=v; } get src(){ return this.attrs.src||""; }
}
class FakeAudio extends El {
	constructor(){ super("audio","audio"); this.paused=true; this.currentTime=0; this.error=null; this.plays=[]; this.playBehavior="ok"; }
	canPlayType(){ return this.native ? "maybe" : ""; }
	load(){} pause(){ if(!this.paused){ this.paused=true; setTimeout(()=>this.dispatch("pause"),0); } }
	play(){ this.plays.push(this.src); this.paused=false; this.dispatch("play");
		if (this.playBehavior==="notallowed"){ this.paused=true; const e=new Error("x"); e.name="NotAllowedError"; return Promise.reject(e); }
		return Promise.resolve(); }
}
function realCfg(keepExtras) {
	const c = vm.runInNewContext(fs.readFileSync(path.join(ROOT,"config.js"),"utf8")+";window.RADIO_CONFIG", { window:{} });
	if (!keepExtras) c.playlists = c.playlists.map(p => Object.assign({}, p, { extraStations: undefined }));
	return c;
}
function makeEnv(opts) {
	opts = opts || {};
	const ids = ["list","search","playlistSelect","reloadBtn","notice","noticeText","noticeBtn","loading","empty","count","player","npLogo","npName","npStatus","playBtn","prevBtn","nextBtn","appTitle","closeBtn","openExt"];
	const byId = {}; ids.forEach(i=>byId[i]=new El(i==="search"?"input":i==="list"?"ul":i.endsWith("Btn")?"button":"div", i));
	byId.search.value=""; byId.player.hidden=true;
	const holder=new El("div"); holder.appendChild(byId.npLogo);
	const audio = new FakeAudio(); audio.native=!!opts.native; byId.audio=audio;
	const chips=[new El("button"),new El("button")]; chips[0].attrs["data-filter"]="all"; chips[1].attrs["data-filter"]="fav";
	const ls = Object.assign({}, opts.ls||{}); const winL = {};
	const document = {
		getElementById: id=>byId[id], documentElement: new El("html"), head: new El("head"),
		createElement: t=>new El(t), createDocumentFragment: ()=>{ const f=new El("frag"); f.isFrag=true; return f; },
		querySelectorAll: s=> s===".chip"?chips:[], addEventListener(){}, title:""
	};
	const fetchLog=[];
	const window = {
		MediaSource: opts.mse ? function(){} : undefined, Hls: opts.Hls, RADIO_CONFIG: Object.assign(realCfg(opts.real), opts.cfg||{}),
		addEventListener:(t,f)=>{ (winL[t]=winL[t]||[]).push(f); }, console: { warn(){} }
	};
	const ctx = {
		window, document, navigator: { userAgent: opts.ua||"Mozilla/5.0 (iPhone; CPU iPhone OS 16_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1", language: opts.lang||"en-US", onLine: true, platform:"iPhone", maxTouchPoints:5 },
		location: { protocol: opts.protocol||"https:", search: opts.search||"" },
		localStorage: { getItem:k=>k in ls?ls[k]:null, setItem:(k,v)=>{ls[k]=String(v);} },
		fetch: (url)=>{ fetchLog.push(url); return opts.fetch(url); },
		setTimeout, clearTimeout, setInterval: ()=>0, Promise, URL, URLSearchParams, Array, Object, Date, String, JSON, Math, Error,
		AbortController, MediaMetadata: function(m){ Object.assign(this,m); }
	};
	ctx.navigator.mediaSession = { setActionHandler(){}, metadata:null, playbackState:"none" };
	ctx.window.MediaMetadata = ctx.MediaMetadata;
	window.localStorage = ctx.localStorage;
	vm.createContext(ctx);
	vm.runInContext(fs.readFileSync(path.join(ROOT,"app.js"),"utf8"), ctx);
	return { ctx, byId, audio, ls, fetchLog, winL, chips };
}
const tick = (ms)=>new Promise(r=>setTimeout(r, ms||0));
const res = (text, status)=>Promise.resolve({ ok:(status||200)<300, status:status||200, text:()=>Promise.resolve(text) });
function rows(env){ return env.byId.list.children; }
function rowName(li){ return li.children[0].children[1].children[0].textContent; }

const M3U = "﻿#EXTM3U\r\n" +
	'#EXTINF:-1 tvg-id="a" tvg-logo="http://logo/a.png" group-title="Syria",Radio Sham FM, Damascus 92.3 (الشام)\r\n' +
	"https://s1.example/sham.mp3\r\n" +
	'#EXTINF:-1 tvg-name="Quoted, Name" group-title="Syria",\n' +
	"https://s2.example/q.aac\n" +
	"#EXTVLCOPT:http-user-agent=x\n" +
	'#EXTINF:-1 group-title="Syria",radio sham fm,  damascus 92.3 (الشام)\n' +
	"http://backup.example:8000/sham\n" +
	'#EXTINF:-1,Rtmp Only\nrtmp://bad.example/live\n' +
	'#EXTINF:-1,HLS Station\nhttps://h.example/live/index.m3u8?token=1\n' +
	"https://bare.example/stream/live\n";

(async () => {
	/* 1. Parsing / rendering */
	let env = makeEnv({ fetch: ()=>res(M3U) });
	await tick(20);
	const names = rows(env).map(rowName);
	ok(names.length === 4, "4 stations after dedupe/rtmp filter, got " + names.length + " " + JSON.stringify(names));
	ok(names.includes("Radio Sham FM, Damascus 92.3 (الشام)"), "full name with comma kept");
	ok(names.includes("Quoted, Name"), "tvg-name fallback when name empty");
	ok(names.includes("bare.example/stream/live"), "name from URL when no EXTINF");
	ok(!names.includes("Rtmp Only"), "rtmp filtered");
	const sham = rows(env).find(r=>rowName(r).startsWith("Radio Sham"))._station;
	ok(sham.urls.length === 2, "duplicate name merged into backup links");
	ok(rows(env)[0].children[0].children[1].children.length === 1, "group subtitle hidden when all same group");
	ok(env.byId.loading.hidden === true, "loading hidden");
	ok(env.byId.notice.hidden === true, "no notice on success");
	ok(env.ls["radio.pl.sy"], "playlist cached");
	ok(env.byId.count.textContent === "4 stations", "count text");

	/* 2. Search (Arabic normalization) */
	env.byId.search.value = "الشام"; env.byId.search.dispatch("input"); await tick(150);
	ok(rows(env).length === 1, "arabic search");
	env.byId.search.value = "zzz"; env.byId.search.dispatch("input"); await tick(150);
	ok(rows(env).length === 0 && env.byId.empty.hidden === false, "no results message");
	env.byId.search.value = ""; env.byId.search.dispatch("input"); await tick(150);

	/* 3. Favorites */
	const favBtn = rows(env)[0].children[1];
	env.byId.list.dispatch("click", { target: favBtn });
	ok(favBtn.textContent === "★" && JSON.parse(env.ls["radio.favs"])[rows(env)[0]._station.key] === 1, "favorite saved");
	env.chips[1].dispatch("click"); ok(rows(env).length === 1, "favorites filter");
	env.chips[0].dispatch("click"); ok(rows(env).length === 4, "all filter");

	/* 4. Play success: secure link first, sync play() inside tap */
	const shamRow = rows(env).find(r=>r._station === sham);
	env.byId.list.dispatch("click", { target: shamRow.children[0] });
	ok(env.audio.plays.length === 1 && env.audio.plays[0] === "https://s1.example/sham.mp3", "play called synchronously with secure link first");
	ok(env.byId.npName.textContent === sham.name, "player shows full name");
	ok(env.byId.player.className.includes("is-connecting"), "connecting state");
	env.audio.dispatch("playing");
	ok(env.byId.player.className.includes("is-playing") && shamRow.classList.contains("is-playing"), "playing state + active row");
	ok(JSON.parse(env.ls["radio.last"]).name === sham.name, "last station remembered");

	/* 5. Stop */
	env.byId.playBtn.dispatch("click"); await tick(10);
	ok(env.byId.player.className.includes("is-stopped") && !env.audio.getAttribute("src"), "stop tears down stream");

	/* 6. Failure -> retries -> backup link -> final error (insecure upgrade) */
	env = makeEnv({ fetch: ()=>res(M3U), cfg: { retriesPerUrl: 1 } });
	await tick(20);
	const s2 = rows(env).find(r=>r._station.key.startsWith("radio sham"));
	env.byId.list.dispatch("click", { target: s2.children[0] });
	env.audio.error = { code: 2 }; env.audio.dispatch("error");
	ok(env.byId.npStatus.textContent.includes("retrying (1)"), "retry message");
	await tick(1600);
	ok(env.audio.plays.length === 2 && env.audio.plays[1] === "https://s1.example/sham.mp3", "retried same link");
	env.audio.dispatch("error");
	ok(env.audio.plays.length === 3 && env.audio.plays[2] === "https://backup.example:8000/sham", "moved to upgraded backup link");
	env.audio.dispatch("error"); await tick(1600);
	env.audio.dispatch("error");
	ok(env.byId.player.className.includes("is-error"), "final error state");
	ok(env.byId.npStatus.textContent.includes("Can't reach"), "network error message: " + env.byId.npStatus.textContent);
	ok(env.byId.openExt.hidden === true, "no open-in-browser link when an https link existed");
	env.audio.dispatch("error");
	ok(env.byId.player.className.includes("is-error"), "duplicate error ignored");

	/* 7. Only-http station -> insecure message */
	const http = "#EXTM3U\n#EXTINF:-1,Old Radio\nhttp://old.example:8000/live\n";
	env = makeEnv({ fetch: ()=>res(http), cfg: { retriesPerUrl: 0 } });
	await tick(20);
	env.byId.list.dispatch("click", { target: rows(env)[0].children[0] });
	ok(env.audio.plays[0] === "https://old.example:8000/live", "http upgraded on https page");
	ok(env.byId.openExt.hidden === false && env.byId.openExt.href === "http://old.example:8000/live", "open-in-browser shown immediately while connecting");
	env.audio.error = { code: 4 }; env.audio.dispatch("error");
	ok(env.audio.plays.length === 1 && env.byId.player.className.includes("is-error"), "https upgrade not retried");
	const failLs = Object.assign({}, env.ls);
	ok(env.byId.npStatus.textContent.includes("insecure"), "insecure message: " + env.byId.npStatus.textContent);
	ok(env.byId.openExt.hidden === false && env.byId.openExt.href === "http://old.example:8000/live", "open-in-browser link with original http url");
	env.byId.playBtn.dispatch("click");
	ok(env.audio.plays.length === 2 && env.byId.openExt.hidden === false, "play button forces new attempt, link still offered");
	/* close player */
	env.audio.dispatch("playing"); env.byId.closeBtn.dispatch("click"); await tick(10);
	ok(env.byId.player.hidden === true && !env.audio.getAttribute("src") && JSON.parse(env.ls["radio.last"]) === null, "close stops, hides player, forgets station");
	ok(!rows(env)[0].classList.contains("active"), "no active row after close");
	env.byId.list.dispatch("click", { target: rows(env)[0].children[0] });
	ok(env.byId.player.hidden === false, "player reappears when a station is picked");

	/* 7b. remembered https failure, open link, expiry, short timeout */
	ok(JSON.parse(failLs["radio.httpsFail"])["https://old.example:8000/live"] > 0, "https failure remembered");
	ok(!JSON.parse(env.ls["radio.httpsFail"])["https://old.example:8000/live"], "forgotten after it played");
	env = makeEnv({ fetch: ()=>res(http), ls: failLs }); await tick(20);
	env.byId.list.dispatch("click", { target: rows(env)[0].children[0] });
	ok(env.audio.plays.length === 0 && env.byId.player.className.includes("is-error") && env.byId.openExt.hidden === false, "remembered failure: instant error + link, no attempt");
	env.byId.playBtn.dispatch("click");
	ok(env.audio.plays.length === 1 && env.byId.player.className.includes("is-connecting"), "play button tries anyway");
	env.byId.openExt.dispatch("click"); await tick(5);
	ok(!env.audio.getAttribute("src") && env.byId.npStatus.textContent === "Opened in a new tab." && env.byId.openExt.hidden === true, "open link stops in-app attempt");
	env = makeEnv({ fetch: ()=>res(http), ls: failLs, cfg: { httpsFailMemoryHours: 0 } }); await tick(20);
	env.byId.list.dispatch("click", { target: rows(env)[0].children[0] });
	ok(env.audio.plays.length === 1, "expired memory -> tries again");
	env = makeEnv({ fetch: ()=>res(http), cfg: { httpsUpgradeTimeoutMs: 50, connectTimeoutMs: 100000 } }); await tick(20);
	env.byId.list.dispatch("click", { target: rows(env)[0].children[0] }); await tick(120);
	ok(env.byId.player.className.includes("is-error") && env.byId.openExt.hidden === false, "https try uses short timeout");
	env = makeEnv({ fetch: ()=>res(M3U) }); await tick(20);
	env.byId.list.dispatch("click", { target: rows(env)[0].children[0] });
	ok(env.byId.openExt.hidden === true, "no link for stations with https links");

	/* 8. http page keeps http */
	env = makeEnv({ fetch: ()=>res(http), protocol: "http:" }); await tick(20);
	env.byId.list.dispatch("click", { target: rows(env)[0].children[0] });
	ok(env.audio.plays[0] === "http://old.example:8000/live", "http kept on http page");

	/* 9. Connect timeout */
	env = makeEnv({ fetch: ()=>res(http), protocol: "http:", cfg: { connectTimeoutMs: 50, retriesPerUrl: 0 } }); await tick(20);
	env.byId.list.dispatch("click", { target: rows(env)[0].children[0] }); await tick(120);
	ok(env.byId.npStatus.textContent.includes("not responding"), "timeout message: " + env.byId.npStatus.textContent);

	/* 10. NotAllowedError -> tap to play */
	env = makeEnv({ fetch: ()=>res(http), protocol: "http:" }); await tick(20);
	env.audio.playBehavior = "notallowed";
	env.byId.list.dispatch("click", { target: rows(env)[0].children[0] }); await tick(10);
	ok(env.byId.npStatus.textContent === "Tap play to start", "autoplay blocked message");

	/* 11. System pause (lock screen / headphones) */
	env = makeEnv({ fetch: ()=>res(http), protocol: "http:" }); await tick(20);
	env.byId.list.dispatch("click", { target: rows(env)[0].children[0] }); env.audio.dispatch("playing");
	await tick(1100); env.audio.paused = true; env.audio.dispatch("pause");
	ok(env.byId.player.className.includes("is-stopped"), "external pause -> stopped");

	/* 11b. Server drops stream: pause (ended=true) then ended -> reconnect, not stop */
	env = makeEnv({ fetch: ()=>res(http), protocol: "http:" }); await tick(20);
	env.byId.list.dispatch("click", { target: rows(env)[0].children[0] }); env.audio.dispatch("playing");
	await tick(1100); env.audio.paused = true; env.audio.ended = true; env.audio.dispatch("pause"); env.audio.dispatch("ended");
	ok(env.byId.npStatus.textContent.includes("retrying"), "dropped stream reconnects: " + env.byId.npStatus.textContent);
	env.audio.ended = false; await tick(1600);
	ok(env.audio.plays.length === 2, "reconnected after drop");

	/* 12. Offline -> wait -> online resumes */
	env = makeEnv({ fetch: ()=>res(http), protocol: "http:" }); await tick(20);
	env.byId.list.dispatch("click", { target: rows(env)[0].children[0] }); env.audio.dispatch("playing");
	env.ctx.navigator.onLine = false; env.audio.error = { code: 2 }; env.audio.dispatch("error");
	ok(env.byId.player.className.includes("is-offline"), "offline state");
	env.ctx.navigator.onLine = true; env.winL.online.forEach(f=>f());
	ok(env.audio.plays.length === 2, "resumed when online");

	/* 13. Playlist: mirror fallback, then cache fallback, then error */
	env = makeEnv({ fetch: (u)=> u === "playlists/sy.m3u" ? Promise.reject(new TypeError("net")) : res(M3U) }); await tick(20);
	ok(rows(env).length === 4 && env.fetchLog.length === 2, "mirror used when primary fails");
	const cachedLs = env.ls;
	env = makeEnv({ fetch: ()=>Promise.reject(new TypeError("net")) });
	Object.assign(env.ls, cachedLs); // simulate saved copy (set after init, so reload)
	env.byId.reloadBtn.dispatch("click"); await tick(20);
	ok(rows(env).length === 4 && env.byId.notice.hidden === false && env.byId.noticeText.textContent.includes("saved copy"), "cached copy shown");
	env = makeEnv({ fetch: ()=>res("not a playlist") }); await tick(20);
	ok(env.byId.noticeText.textContent.includes("empty"), "empty playlist message");
	env = makeEnv({ fetch: ()=>res("", 404) }); await tick(20);
	ok(env.byId.noticeText.textContent.includes("Couldn't load"), "404 message");

	/* 14. Arabic UI + RTL */
	env = makeEnv({ fetch: ()=>res(M3U), lang: "ar-SY" }); await tick(20);
	ok(env.ctx.document.documentElement.dir === "rtl" && env.byId.count.textContent === "4 محطة", "arabic + rtl");

	/* 15. Next/prev wrap */
	env = makeEnv({ fetch: ()=>res(M3U) }); await tick(20);
	const list = rows(env).map(r=>r._station);
	env.byId.prevBtn.dispatch("click");
	ok(env.byId.npName.textContent === list[list.length-1].name, "prev with no station -> last");
	env.byId.nextBtn.dispatch("click");
	ok(env.byId.npName.textContent === list[0].name, "next wraps to first");

	/* 16. Multiple playlists + ?url= */
	env = makeEnv({ fetch: ()=>res(M3U), cfg: { playlists: [{ id:"a", name:"A", urls:["a.m3u"] }, { id:"b", name:"B", url:"b.m3u" }] }, search: "?p=b" }); await tick(20);
	ok(env.byId.playlistSelect.hidden === false && env.fetchLog[0] === "b.m3u", "picker shown, ?p= respected");
	env = makeEnv({ fetch: ()=>res(M3U), search: "?url=https%3A%2F%2Fx.example%2Fl.m3u" }); await tick(20);
	ok(env.fetchLog[0] === "https://x.example/l.m3u", "?url= custom playlist");

	/* 17. Remembered station restored on startup */
	env = makeEnv({ fetch: ()=>res(M3U), ls: { "radio.last": JSON.stringify({ key:"hls station", name:"HLS Station", urls:["https://old/link.m3u8"] }) } });
	ok(env.byId.player.hidden === false && env.byId.npStatus.textContent === "Tap play to start", "last station shown on startup");
	await tick(20);
	ok(env.ctx.window.RADIO_CONFIG && env.audio.plays.length === 0, "no autoplay on startup");

	/* 18. hls.js path on Chrome Android */
	const hlsLog = [];
	function FakeHls(){ this.h = {}; hlsLog.push("new"); }
	FakeHls.isSupported = ()=>true;
	FakeHls.Events = { ERROR:"e", MANIFEST_PARSED:"m" }; FakeHls.ErrorTypes = { NETWORK_ERROR:"n", MEDIA_ERROR:"md" };
	FakeHls.prototype.on = function(k,f){ this.h[k]=f; };
	FakeHls.prototype.attachMedia = function(){ hlsLog.push("attach"); };
	FakeHls.prototype.loadSource = function(u){ hlsLog.push("load "+u); const s=this; setTimeout(()=>s.h.m(),0); };
	FakeHls.prototype.destroy = function(){ hlsLog.push("destroy"); };
	FakeHls.prototype.recoverMediaError = function(){ hlsLog.push("recover"); };
	env = makeEnv({ fetch: ()=>res(M3U), ua: "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36", mse: true, Hls: FakeHls }); await tick(20);
	const hr = rows(env).find(r=>r._station.name === "HLS Station");
	env.byId.list.dispatch("click", { target: hr.children[0] }); await tick(20);
	ok(hlsLog.includes("load https://h.example/live/index.m3u8?token=1") && env.audio.plays.length === 1, "hls.js used and play() called");
	ok(env.byId.npName.textContent === "HLS Station", "restored station refreshed from list");
	const inst = hlsLog.length;
	env.audio.dispatch("playing");
	// media error -> recover once, then fail
	hr._station; env.ctx.window.Hls = FakeHls;
	env = makeEnv({ fetch: ()=>res(M3U), native: true }); await tick(20);
	const hr2 = rows(env).find(r=>r._station.name === "HLS Station");
	env.byId.list.dispatch("click", { target: hr2.children[0] });
	ok(env.audio.plays[0] === "https://h.example/live/index.m3u8?token=1" && env.audio.getAttribute("src"), "iPhone plays HLS natively");

	/* 18b. Generated playlist (public/playlists/sy.m3u) loads first and gets overrides + extras */
	const GEN = fs.readFileSync(path.join(ROOT, "playlists", "sy.m3u"), "utf8");
	env = makeEnv({ real: true, fetch: (u)=> u === "playlists/sy.m3u" ? res(GEN) : Promise.reject(new Error("should not be used")) }); await tick(20);
	ok(env.fetchLog.length === 1 && env.fetchLog[0] === "playlists/sy.m3u", "local generated playlist used first");
	ok(rows(env).length >= 20, "generated playlist + extras: " + rows(env).length + " stations");
	const gst = n => rows(env).map(r=>r._station).find(s=>s.name === n);
	ok(gst("Farah FM") && gst("Farah FM").urls.join() === "https://radio.farah.fm/;?type=http", "overrides apply to generated playlist");
	ok(gst("Rozana Radio"), "extras apply to generated playlist");

	/* 19. Real Syria playlist + stationOverrides from config.js */
	const REAL = fs.readFileSync(path.join(__dirname, "fixtures", "sy.m3u"), "utf8");
	env = makeEnv({ real: true, fetch: ()=>res(REAL) }); await tick(20);
	const st = n => rows(env).map(r=>r._station).find(s=>s.name === n);
	const stv = st("Syria TV - راديو تلفزيون سوريا"), farah = st("Farah FM");
	ok(rows(env).length === 25, "real playlist + 5 extras -> 25 stations, got " + rows(env).length);
	ok(st("Rozana Radio") && st("Rozana Radio").urls.join() === "https://stream.radio.co/sea7ed1c60/listen", "extra station added");
	ok(st("Nojoom Fm Syria - نجوم أف أم سوريا") && st("إذاعة شرق المتوسط -East Mediterranean Radio"), "extra full names kept");
	ok(rows(env)[0].children[0].children[1].children.length === 1, "no group subtitles because of extras");
	ok(stv && JSON.stringify(stv.urls) === '["https://stream1.syria.fm/syriatvlive/syriatv_audio/playlist.m3u8"]', "Syria TV replaced: " + JSON.stringify(stv && stv.urls));
	ok(farah && JSON.stringify(farah.urls) === '["https://radio.farah.fm/;?type=http"]', "Farah replaced: " + JSON.stringify(farah && farah.urls));
	env.byId.list.dispatch("click", { target: rows(env).find(r=>r._station===farah).children[0] });
	ok(env.audio.plays[0] === "https://radio.farah.fm/;?type=http", "Farah plays override link");
	env.byId.list.dispatch("click", { target: rows(env).find(r=>r._station===stv).children[0] });
	ok(env.audio.plays[1] === "https://stream1.syria.fm/syriatvlive/syriatv_audio/playlist.m3u8", "Syria TV plays override link natively on iPhone");
	ok(st("Orman Radio Jabal Alarab").urls.join() === "https://stream.rcast.net/1014006", "Orman override");
	ok(st("Radio Yeraz").urls.join() === "https://stream.rcast.net/245900", "Yeraz override");
	/* prepend / hidden / rename / case-insensitive key */
	env = makeEnv({ real: true, fetch: ()=>res(REAL), cfg: { stationOverrides: {
		"  SHAM   fm ": { urls: ["https://new.example/sham"], name: "Sham FM (fixed)" },
		"Radio Yeraz": { hidden: true } } } }); await tick(20);
	const sh = rows(env).map(r=>r._station).find(s=>s.name === "Sham FM (fixed)");
	ok(sh && sh.urls[0] === "https://new.example/sham" && sh.urls.length === 3, "prepend keeps originals as fallback: " + JSON.stringify(sh && sh.urls));
	ok(!rows(env).some(r=>r._station.name === "Radio Yeraz") && rows(env).length === 24, "hidden station removed");
	ok(rows(env).map(r=>r._station).some(s=>s.name === "Farah FM" && s.urls[0] === "https://radio.farah.fm/"), "no override -> original link kept");
	/* extras survive a failed playlist; merge with same-name station; extras-only list */
	env = makeEnv({ real: true, fetch: ()=>Promise.reject(new TypeError("net")) }); await tick(20);
	ok(rows(env).length === 5 && env.byId.noticeText.textContent.includes("Couldn't load"), "extras shown when playlist fails");
	env = makeEnv({ fetch: ()=>res(REAL), cfg: { playlists: [{ id:"sy", name:"S", urls:["x.m3u"], extraStations:[{ name:"FARAH fm", url:"https://alt.example/farah" }] }], stationOverrides: {} } }); await tick(20);
	ok(st("Farah FM").urls.join() === "https://radio.farah.fm/,https://alt.example/farah" && rows(env).length === 20, "same-name extra becomes backup link");
	env = makeEnv({ fetch: ()=>res(REAL), cfg: { playlists: [{ id:"mine", name:"Mine", extraStations:[{ name:"A", urls:["https://a.example/s"] }] }] } }); await tick(20);
	ok(rows(env).length === 1 && env.fetchLog.length === 0 && env.byId.notice.hidden === true, "extras-only playlist, no fetch");

	console.log(`\n${pass} passed, ${failN} failed`);
	process.exit(failN ? 1 : 0);
})().catch(e=>{ console.error(e); process.exit(1); });
