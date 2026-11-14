/*
 * Radio player configuration — edit this file only.
 *
 * playlists: each entry shows up in the playlist picker (picker is hidden when there is only one).
 *   id    – short unique id (used in the link: index.html?p=sy)
 *   name  – label shown in the picker
 *   urls  – one or more M3U links; tried in order (later ones are mirrors/fallbacks).
 *           Relative paths work too, e.g. "playlists/my-list.m3u" stored next to index.html.
 *           Can be left out to make a list from extraStations only.
 *   extraStations – stations to add to this list: { name, urls: [...], logo (optional) }.
 *           They still show if the M3U can't be loaded.
 *
 * You can also open a one-off playlist: index.html?url=https://example.com/list.m3u
 */
window.RADIO_CONFIG = {
	appTitle: "Radio",
	language: "auto",          // "auto" (follows the phone language), "en" or "ar"

	/*
	 * Fix or adjust individual stations from any playlist. Key = station name exactly as in the playlist
	 * (case and extra spaces don't matter).
	 *   urls    – links to use; tried before the playlist's own links
	 *   replace – true = drop the playlist's links completely (use when they are known to be broken)
	 *   name    – show a different name     logo – use a different logo     hidden – true = hide the station
	 */
	stationOverrides: {
		"Syria TV - راديو تلفزيون سوريا": {
			// playlist link has an invalid https certificate
			urls: ["https://stream1.syria.fm/syriatvlive/syriatv_audio/playlist.m3u8"],
			replace: true
		},
		"Farah FM": {
			// playlist link points to the website, not the audio stream
			urls: ["https://radio.farah.fm/;?type=http"],
			replace: true
		},
		"Orman Radio Jabal Alarab": {
			// playlist link is http-only (blocked on https sites)
			urls: ["https://stream.rcast.net/1014006"],
			replace: true
		},
		"Radio Yeraz": {
			// playlist link is http-only (blocked on https sites)
			urls: ["https://stream.rcast.net/245900"],
			replace: true
		}
	},

	playlists: [
		{
			id: "sy",
			name: "Syria",
			urls: [
				// Built daily from radio-browser.info by .github/workflows/update-playlists.yml
				"playlists/sy.m3u",
				// Third-party backups
				"https://raw.githubusercontent.com/AlonDrilich/radio-playlists/main/countries/sy.m3u",
				"https://cdn.jsdelivr.net/gh/AlonDrilich/radio-playlists@main/countries/sy.m3u"
			],
			extraStations: [
				{ name: "Nojoom Fm Syria - نجوم أف أم سوريا", urls: ["https://cast5.servcast.net/proxy/estechararadio/stream"] },
				{ name: "Ninar FM", urls: ["https://ninarfm.grtvstream.com:8896/;"] },
				{ name: "Rozana Radio", urls: ["https://stream.radio.co/sea7ed1c60/listen"] },
				{ name: "Version FM", urls: ["https://versionfm.com/live/stream"] },
				{ name: "إذاعة شرق المتوسط -East Mediterranean Radio", urls: ["https://stream.zeno.fm/t9moejb7abbuv"] }
			]
		}
		// Example of adding another list (uncomment and adjust):
		// ,{
		//   id: "lb",
		//   name: "Lebanon",
		//   urls: ["https://raw.githubusercontent.com/AlonDrilich/radio-playlists/main/countries/lb.m3u"]
		// }
	],

	// HLS (.m3u8) support for non-Apple browsers. Apple devices play HLS natively.
	// You may download this file and point to a local copy, e.g. "vendor/hls.min.js".
	hlsLibraryUrl: "https://cdn.jsdelivr.net/npm/hls.js@1/dist/hls.min.js",

	playlistTimeoutMs: 15000,  // max wait for the station list
	connectTimeoutMs: 20000,   // max wait for a station to start
	stallTimeoutMs: 15000,     // reconnect if audio is frozen this long
	retriesPerUrl: 2,          // retries per stream link before trying the next link
	retriesAfterPlaying: 6,    // more patience for a station that was already playing (network blips)

	// http-only stations: browsers block them inside https sites, so the player quickly tries an https
	// version and otherwise offers "Open in browser" (the button is also shown while it tries).
	httpsUpgradeTimeoutMs: 8000, // how long to try the https version
	httpsUpgradeRetries: 0,      // extra tries for the https version
	httpsFailMemoryHours: 24     // skip the https try for stations where it failed recently
};
