// The game library as the screens see it. One list of plain
// objects, the same shape for Steam and emulated games:
//   { id, appid, source: "steam"|"emu", system, rom, path, title, genre, installed, lastPlayed,
//     minutes, size, recent, added, native, upscalers, shots, trailer, trailerStart,
//     ach: [got, total] | null, art: { capsule, hero, logo, header, box, snap } }
// Real data: library.rs (Steam's files and the ROM folders), Steam store details for trailers,
// screenshots and genres (fetched once per game and cached in ~/.cache/vanta/store), and
// ~/.config/vanta/history.json for emulated play time. With VANTA_SAMPLE=1 (screenshot and
// flow-check tools) it shows a sample library (data/sample-library.json) instead.
pragma Singleton
import QtQuick
import dev.vanta.shell

QtObject {
    id: games

    readonly property Sys sys: Sys {}
    readonly property Library lib: Library {}
    readonly property var sampleData: {
        const text = sys.readText(sys.dataDir + "/sample-library.json")
        try { return JSON.parse(text) } catch (e) { return { systems: [], bios: {}, games: [] } }
    }
    readonly property var systems: sampleData.systems
    readonly property var biosLabel: sampleData.bios
    readonly property bool sample: lib.sample
    readonly property var account: { try { return JSON.parse(lib.accountJson) } catch (e) { return null } }
    // The Steam account whose owned games are listed: the current profile's, or the one just
    // signed in during setup.
    readonly property string steamId: (Profiles.current && Profiles.current.steam && Profiles.current.steam.steamId) || Steam.lastId
    property var store: ({})       // appid → store details
    property var history: ({})     // id → { last, minutes } for emulated games
    property var daily: ({})       // "2026-10-22" → minutes played that day (counted while a game runs)
    property var profiles: ({})    // id → per-game performance profile, applied at launch by vantad
    property var biosFound: ({})   // system → "found" | "missing" (real systems only)
    property var all: []
    property int revision: 0
    // Running game process (Steam's reaper or our emulator) for the game App.running points at.
    property var process: null

    readonly property string cacheDir: sys.env("XDG_CACHE_HOME") ? sys.env("XDG_CACHE_HOME") + "/vanta" : sys.home + "/.cache/vanta"
    readonly property string steamCdn: "https://shared.steamstatic.com/store_item_assets/steam/apps"
    readonly property string thumbs: "https://raw.githubusercontent.com/libretro-thumbnails"

    function systemOf(g) { return g && g.system ? systems.find(s => s.id === g.system) || null : null }
    function byId(id) { return all.find(g => g.id === id) || null }

    // Art the Steam client has on disk (library.rs), looked up once per game. It comes before
    // Steam's servers, so games show their art offline too.
    property var localArtFound: ({})
    function localArt(appid) {
        if (!(appid in localArtFound)) {
            try { localArtFound[appid] = JSON.parse(lib.localArt(appid)) } catch (e) { localArtFound[appid] = {} }
        }
        return localArtFound[appid]
    }

    function steamArt(appid) {
        const b = steamCdn + "/" + appid + "/"
        return { capsule: b + "library_600x900_2x.jpg", hero: b + "library_hero.jpg", logo: b + "logo.png", header: b + "header.jpg" }
    }
    function retroArt(g) {
        const sys = systemOf(g)
        if (!sys || !g.rom) return {}
        const name = encodeURIComponent(g.rom)
        const box = thumbs + "/" + sys.thumbs + "/master/Named_Boxarts/" + name + ".png"
        const snap = thumbs + "/" + sys.thumbs + "/master/Named_Snaps/" + name + ".png"
        return { capsule: box, box: box, snap: snap, hero: snap, header: snap, logo: "" }
    }

    // Official Steam screenshots: full size for the viewer, 600×338 for shelves.
    function screenshots(g, size) {
        if (!g.shots || !g.shots.length) return []
        return g.shots.map(f => f.indexOf("http") === 0
            ? (size === "full" ? f : f.replace(".1920x1080.", ".600x338."))
            : steamCdn + "/" + g.appid + "/" + (size === "full" ? f : f.replace(".1920x1080.", ".600x338.")))
    }

    function build() {
        const now = Date.now() / 1000
        let list = []
        if (sample) {
            list = sampleData.games.map(g => ({
                id: g.id, appid: g.appid || 0, source: g.source, system: g.system || "", rom: g.rom || "",
                title: g.title, genre: g.genre || "", installed: g.installed !== false,
                lastPlayed: g.last === null || g.last === undefined ? 0 : now - g.last * 86400,
                minutes: (g.hours || 0) * 60, size: g.size || "", recent: g.recent || 0,
                added: g.added === undefined ? 0 : now - g.added * 86400, native: !!g.native,
                upscalers: g.upscalers || [], shots: g.shots || [], trailer: g.trailer || "",
                trailerStart: g.trailerStart, ach: g.ach || null,
                art: g.appid ? steamArt(g.appid) : retroArt(g)
            }))
        } else {
            let real = []
            try { real = JSON.parse(lib.gamesJson) } catch (e) {}
            // Games the signed-in Steam account owns but hasn't installed (Steam.qml).
            const have = {}
            real.forEach(g => { if (g.appid) have[g.appid] = g })
            Steam.cachedOwned(steamId).forEach(o => {
                const g = have[o.appid]
                if (g) {
                    g.minutes = g.minutes || o.minutes
                    g.lastPlayed = g.lastPlayed || o.lastPlayed
                    return
                }
                real.push({ id: "steam-" + o.appid, appid: o.appid, source: "steam", title: o.name, installed: false,
                            lastPlayed: o.lastPlayed, minutes: o.minutes, sizeBytes: 0, art: localArt(o.appid) })
            })
            list = real.map(g => {
                const d = g.appid ? store[g.appid] : null
                const h = history[g.id] || {}
                const movie = d && d.movies && d.movies.length ? d.movies[0] : null
                return {
                    id: g.id, appid: g.appid || 0, source: g.source, system: g.system || "", rom: g.rom || "", path: g.path || "",
                    title: g.title, genre: d && d.genres ? d.genres.map(x => x.description).slice(0, 2).join(", ") : "",
                    installed: g.installed !== false, updating: !!g.updating,
                    lastPlayed: g.lastPlayed || h.last || 0, minutes: g.minutes || h.minutes || 0,
                    size: sizeText(g.sizeBytes), recent: 0, added: 0,
                    native: !!(d && d.platforms && d.platforms.linux), upscalers: [],
                    shots: d && d.screenshots ? d.screenshots.map(s => s.path_full.split("?")[0]) : [],
                    trailer: movie ? (movie.hls_h264 || (movie.mp4 && movie.mp4.max) || "") : "",
                    trailerStart: undefined,
                    ach: d && d.achievements && d.achievements.total ? [null, d.achievements.total] : null,
                    art: g.source === "steam" ? Object.assign(steamArt(g.appid), g.art || {}) : retroArt(g)
                }
            })
            // Recent games: last played first.
            list.filter(g => g.lastPlayed).sort((a, b) => b.lastPlayed - a.lastPlayed).slice(0, 7).forEach((g, i) => g.recent = i + 1)
        }
        all = list
        revision++
    }

    function sizeText(bytes) {
        if (!bytes) return ""
        const gb = bytes / 1e9
        return gb >= 100 ? Math.round(gb) + " GB" : gb >= 1 ? gb.toFixed(1) + " GB" : (bytes / 1e6).toFixed(0) + " MB"
    }

    function recent() {
        let list = all.filter(g => g.recent).sort((a, b) => a.recent - b.recent)
        if (!list.length) list = all.filter(g => g.installed).slice(0, 7)
        const r = App.running
        if (r) list = [byId(r.id) || r].concat(list.filter(g => g.id !== r.id))
        return list
    }
    function recentlyAdded() { return all.filter(g => g.added).sort((a, b) => b.added - a.added) }
    function emulated() { return all.filter(g => g.source === "emu") }

    function biosStatus(sys) {
        if (sample) return sys.bios
        if (sys.bios === "none" || sys.bios === "optional") return sys.bios
        return biosFound[sys.id] || "missing"
    }

    // ---------- Steam store details ----------
    property var queue: []
    readonly property Timer fetcher: Timer {
        interval: 350
        repeat: true
        onTriggered: {
            if (!games.queue.length) { stop(); return }
            const id = games.queue.shift()
            games.fetchStore(id)
        }
    }

    // Trailers, screenshots and genres come from the store, one game at a time (it limits how
    // fast it's asked). Installed games and the ten played most recently are fetched up front;
    // any other game when it's selected (wantStore). Answers are cached on disk.
    signal storeLoaded(int appid)

    function loadStore() {
        if (sample) return
        let real = []
        try { real = JSON.parse(lib.gamesJson) } catch (e) {}
        const owned = Steam.cachedOwned(steamId).slice().sort((a, b) => b.lastPlayed - a.lastPlayed)
        const next = Object.assign({}, store)
        const wanted = []
        const fetchNow = {}
        real.forEach(g => { if (g.appid) fetchNow[g.appid] = true })
        owned.slice(0, 10).forEach(g => fetchNow[g.appid] = true)
        for (const appid of Object.keys(fetchNow).concat(owned.map(g => String(g.appid)))) {
            if (next[appid]) continue
            const text = sys.readText(cacheDir + "/store/" + appid + ".json")
            if (text) { try { next[appid] = JSON.parse(text) } catch (e) {} }
            if (!next[appid] && fetchNow[appid] && queue.indexOf(Number(appid)) < 0) wanted.push(Number(appid))
        }
        const changed = Object.keys(next).length !== Object.keys(store).length
        store = next
        if (changed) build()
        queue = queue.concat(wanted)
        if (queue.length) fetcher.start()
    }

    // A game on screen without store details: fetch them next.
    function wantStore(g) {
        if (sample || !g || !g.appid || store[g.appid]) return
        queue = [g.appid].concat(queue.filter(id => id !== g.appid))
        fetcher.start()
    }

    function fetchStore(appid) {
        const xhr = new XMLHttpRequest()
        xhr.onreadystatechange = () => {
            if (xhr.readyState !== XMLHttpRequest.DONE || xhr.status !== 200) return
            try {
                const res = JSON.parse(xhr.responseText)[appid]
                if (!res || !res.success) return
                const d = res.data
                const keep = { genres: d.genres, screenshots: d.screenshots, movies: d.movies, platforms: d.platforms, achievements: d.achievements }
                sys.writeText(cacheDir + "/store/" + appid + ".json", JSON.stringify(keep))
                const next = Object.assign({}, store)
                next[appid] = keep
                store = next
                build()
                storeLoaded(appid)
            } catch (e) {}
        }
        xhr.open("GET", "https://store.steampowered.com/api/appdetails?appids=" + appid + "&l=english")
        xhr.send()
    }

    // ---------- BIOS files for emulators that need them ----------
    function checkBios() {
        const roots = [sys.home + "/Games/bios", sys.home + "/Emulation/bios"]
        const has = pattern => roots.some(r => JSON.parse(sys.glob(r + "/" + pattern)).length > 0)
        biosFound = {
            ps1: has("scph*.bin") || has("ps1/scph*.bin") ? "found" : "missing",
            ps2: has("ps2/*.bin") || has("SCPH*.bin") ? "found" : "missing",
            ps3: sys.exists(sys.home + "/.var/app/net.rpcs3.RPCS3/config/rpcs3/dev_flash/vsh") ? "found" : "missing",
            wiiu: sys.exists(sys.home + "/.var/app/info.cemu.Cemu/data/Cemu/keys.txt") ? "found" : "missing"
        }
    }

    // ---------- launching ----------
    // Emulators as Flatpaks, with RetroArch cores for the older systems.
    readonly property var emulators: ({
        nes: ["org.libretro.RetroArch", "mesen"], snes: ["org.libretro.RetroArch", "snes9x"],
        n64: ["org.libretro.RetroArch", "mupen64plus_next"], gba: ["org.libretro.RetroArch", "mgba"],
        nds: ["net.kuribo64.melonDS"], "3ds": ["org.azahar_emu.Azahar"], ps1: ["org.duckstation.DuckStation", "", ["-batch", "-fullscreen"]],
        ps2: ["net.pcsx2.PCSX2", "", ["-batch", "-fullscreen"]], psp: ["org.ppsspp.PPSSPP"], ps3: ["net.rpcs3.RPCS3", "", ["--no-gui"]],
        gc: ["org.DolphinEmu.dolphin-emu", "", ["-b", "-e"]], wiiu: ["info.cemu.Cemu", "", ["-f", "-g"]]
    })

    // Returns false when the game can't start (emulator not installed).
    function start(g) {
        if (g.source === "steam") {
            if (sample) return true
            if (App.kiosk) return false
            return lib.steam("rungameid/" + g.appid)
        }
        if (sample) return true
        const e = emulators[g.system]
        if (!e || !sys.which("flatpak")) return false
        let args = ["run", e[0]]
        if (e[1]) args = args.concat(["-L", sys.home + "/.var/app/org.libretro.RetroArch/config/retroarch/cores/" + e[1] + "_libretro.so"])
        args = args.concat(e[2] || []).concat([g.path])
        const pid = sys.spawn("flatpak", JSON.stringify(args))
        if (!pid) return false
        process = { pid: pid, game: g.id, since: Date.now() / 1000 }
        const h = Object.assign({}, history)
        h[g.id] = Object.assign({}, h[g.id] || {}, { last: Date.now() / 1000 })
        history = h
        sys.writeText(sys.configDir + "/history.json", JSON.stringify(history))
        return true
    }

    function install(g) { if (!sample && !App.kiosk && g.appid) lib.steam("install/" + g.appid) }
    function uninstall(g) { if (!sample && !App.kiosk && g.appid) lib.steam("uninstall/" + g.appid) }
    function focusGame(g) {}

    // Close the running game: Steam's reaper and everything under it, or the emulator.
    function stop(g) {
        if (sample) return
        const p = findProcess(g)
        if (p) sys.killTree(p)
    }

    function findProcess(g) {
        if (!g) return 0
        if (g.source === "emu") return process && process.game === g.id && sys.exists("/proc/" + process.pid) ? process.pid : 0
        const procs = JSON.parse(sys.processes())
        const hit = procs.find(p => p.cmd.indexOf("SteamLaunch AppId=" + g.appid + " ") >= 0 || p.cmd.endsWith("SteamLaunch AppId=" + g.appid))
        return hit ? hit.pid : 0
    }

    // Notice when the running game has ended, and count emulated play time.
    readonly property Timer watcher: Timer {
        interval: 3000
        repeat: true
        running: !!App.running && !games.sample
        onTriggered: {
            const g = App.running
            if (!g || App.busy) return
            if (games.findProcess(g)) {
                games.count(3)
                return
            }
            if (g.source === "emu" && games.process) {
                const h = Object.assign({}, games.history)
                const cur = h[g.id] || {}
                h[g.id] = { last: Date.now() / 1000, minutes: (cur.minutes || 0) + Math.round((Date.now() / 1000 - games.process.since) / 60) }
                games.history = h
                games.sys.writeText(games.sys.configDir + "/history.json", JSON.stringify(h))
                games.process = null
                games.build()
            }
            App.gameEnded()
        }
    }

    function profile(id) { return profiles[id] || {} }
    function setProfile(id, key, value) {
        const next = Object.assign({}, profiles)
        next[id] = Object.assign({}, next[id] || {})
        next[id][key] = value
        profiles = next
        sys.writeText(sys.configDir + "/game-profiles.json", JSON.stringify(profiles, null, 1))
    }

    // Play time per day for the Home widget. Steam keeps only totals, so Vanta counts its own.
    function dayKey(d) { return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate() }
    function count(seconds) {
        const k = dayKey(new Date())
        const next = Object.assign({}, daily)
        next[k] = (next[k] || 0) + seconds / 60
        daily = next
        if (Math.floor(next[k]) !== Math.floor(next[k] - seconds / 60)) sys.writeText(sys.configDir + "/playtime.json", JSON.stringify(daily))
    }
    // Hours per day for the last seven days, oldest first.
    function week() {
        if (sample) return [1.8, 0.6, 2.9, 1.4, 0, 3.7, 2.4]
        const out = []
        for (let i = 6; i >= 0; i--) {
            const d = new Date()
            d.setDate(d.getDate() - i)
            out.push((daily[dayKey(d)] || 0) / 60)
        }
        return out
    }

    readonly property Connections onLibrary: Connections {
        target: games.lib
        function onGamesJsonChanged() { games.build(); games.loadStore() }
    }
    // Store details and the owned list that failed while offline (right after start, before
    // Wi-Fi connects) are fetched again once the network is up.
    readonly property Connections onNetwork: Connections {
        target: System
        function onNetEpochChanged() {
            if (games.sample) return
            games.loadStore()
            if (games.steamId) { Steam.loadOwned(games.steamId); Steam.loadFriends(games.steamId) }
        }
    }
    readonly property Connections onOwned: Connections {
        target: Steam
        function onOwnedChanged() { if (!games.sample) { games.build(); games.loadStore() } }
    }
    onSteamIdChanged: if (!sample && steamId) { build(); Steam.loadOwned(steamId); Steam.loadFriends(steamId) }
    // Friends' status every two minutes.
    readonly property Timer friendsTimer: Timer {
        interval: 120000
        repeat: true
        running: !games.sample && games.steamId !== "" && Settings.steamFriends
        onTriggered: Steam.loadFriends(games.steamId)
    }

    Component.onCompleted: {
        try { history = JSON.parse(sys.readText(sys.configDir + "/history.json") || "{}") } catch (e) { history = {} }
        try { daily = JSON.parse(sys.readText(sys.configDir + "/playtime.json") || "{}") } catch (e) { daily = {} }
        try { profiles = JSON.parse(sys.readText(sys.configDir + "/game-profiles.json") || "{}") } catch (e) { profiles = {} }
        if (!sample) checkBios()
        build()
        loadStore()
        if (!sample && steamId) { Steam.loadOwned(steamId); Steam.loadFriends(steamId) }
    }
}
