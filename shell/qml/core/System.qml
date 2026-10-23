// The device and what it can do, and the settings that change the
// real system. Everything goes through the system's own tools:
//   Wi-Fi and radios: nmcli · Bluetooth: bluetoothctl · volume: wpctl (PipeWire)
//   brightness: logind SetBrightness on the backlight · time: timedatectl · language: localectl
//   TDP, performance profile, CPU scheduler: steamosctl (Valve's steamos-manager, which drives
//   PowerStation and tuned on handhelds) · updates: rpm-ostree · desktop mode: steamos-session-select
// Capabilities are read from the hardware: the battery from sysfs, VRR and HDR from the
// display's EDID, TDP control and its range from steamos-manager. Settings only offer what
// applies; controls the device can't support stay visible but disabled, with the reason underneath.
// Frame limit, upscaling, overlay, VRR/HDR switching and GameMode are saved here and applied per
// game at launch by vantad (not written yet).
pragma Singleton
import QtQuick
import dev.vanta.shell

QtObject {
    id: sys

    readonly property Sys os: Sys {}

    // ---------- device ----------
    property string productName: ""
    property string chip: ""
    property string memory: ""
    property string gpu: "amd"          // amd | nvidia | intel
    property int displayW: 1280
    property int displayH: 800
    property int refresh: 60
    property bool vrrCapable: false
    property bool hdrCapable: false
    property bool hasBattery: false
    property real battery: 1
    property bool charging: false
    property string backlight: ""
    property int backlightMax: 0
    property bool powerStation: false   // TDP can be set (steamos-manager reports a range)
    property var perfProfiles: []        // what steamosctl offers, e.g. power-saver, balanced
    property var cpuSchedulers: []
    property var tdpRange: ({ min: 5, max: 30 })
    property var storageInfo: ({ free: 0, total: 0 })
    property string osVersion: "0.1.0"
    property string imageRef: "ghcr.io/hello3928/vanta-os:stable"

    // ---------- network ----------
    property string wifiSsid: ""
    property int wifiSignal: 0
    property bool wired: false
    property var networks: []          // [{ ssid, signal, secured, active }]
    property bool scanning: false
    property bool hasWifi: true        // a Wi-Fi adapter is present (from nmcli's device list)
    // Without a running NetworkManager (development) there's nothing to ask, so the bar shows connected.
    property bool hasNetworkManager: false
    // Connected (or no NetworkManager to ask). netEpoch counts reconnections: what failed to load
    // while offline (art, store details) tries again when it changes.
    readonly property bool online: !hasNetworkManager || wired || wifiSsid !== ""
    property int netEpoch: 0
    onOnlineChanged: if (online) netEpoch++

    // ---------- updates ----------
    // updateState: "" | checking | available | none | failed (the check) | downloading (the whole
    // install) | ready | installFailed. While downloading, updateStage is preparing | downloading
    // | installing, read from rpm-ostree's output as it prints it.
    property string updateState: ""
    property string updateVersion: ""  // the available image's version, from rpm-ostree's check
    property string updateStage: ""
    property string updateError: ""    // "busy" (another update is running) or rpm-ostree's last error line
    property int updateLayers: 0       // image layers to fetch, and fetched so far
    property int updateFetched: 0
    property real updateTotal: 0       // bytes to fetch, from rpm-ostree's "layers needed" lines
    property real updateDone: 0        // bytes in the layers fetched so far
    property real updatePending: 0     // size of the layer being fetched
    // rpm-ostree only reports whole layers, and a layer can be over a gigabyte. Between its lines
    // the bytes received on the network (all interfaces, so an estimate) fill in the bar.
    property real updateRx: 0
    property real updateRxStart: 0
    property real updateSpeed: 0       // bytes per second
    readonly property real updateDownloaded: updateTotal ? Math.min(updateTotal, Math.max(updateDone, Math.min(updateRx, updatePending ? updateDone + updatePending : updateTotal))) : 0
    readonly property real updateProgress: updateTotal ? updateDownloaded / updateTotal : updateLayers ? updateFetched / updateLayers : 0
    // A stand-in rpm-ostree for testing the update screen (tools/wsl/fake-rpm-ostree.sh). With
    // it set, updates run outside the Vanta session too.
    readonly property string rpmOstree: os.env("VANTA_RPM_OSTREE") || "rpm-ostree"

    readonly property var deviceNames: ({
        "RC72LA": "ROG Ally X", "RC71L": "ROG Ally", "Jupiter": "Steam Deck", "Galileo": "Steam Deck OLED",
        "83E1": "Legion Go", "83L3": "Legion Go S"
    })
    readonly property var tdpRanges: ({
        "ROG Ally X": { min: 5, max: 30 }, "ROG Ally": { min: 5, max: 30 }, "Steam Deck": { min: 3, max: 15 },
        "Steam Deck OLED": { min: 3, max: 15 }, "Legion Go": { min: 5, max: 30 }, "Legion Go S": { min: 5, max: 30 }
    })
    readonly property string deviceName: productName || I18n.t("device")
    // A handheld PC we know by name (Steam Deck, ROG Ally, Legion Go): the UI is drawn a little larger.
    readonly property bool handheld: Object.values(deviceNames).indexOf(productName) >= 0
    readonly property string displayLine: displayW + "×" + displayH + " · " + refresh + " Hz" + (vrrCapable ? " · VRR" : "") + (hdrCapable ? " · HDR" : "")

    // Why a device-level control is unavailable, or "" when it works.
    function unsupported(feature) {
        if (feature === "tdp") return powerStation ? "" : I18n.t("capNoTdp")
        if (feature === "vrr") return vrrCapable ? "" : I18n.t("capNoVrr")
        if (feature === "hdr") return hdrCapable ? "" : I18n.t("capNoHdr")
        return ""
    }

    // Frame limits that divide the refresh rate cleanly, as on Steam Deck.
    function frameOptions() {
        const hz = refresh
        const set = [30]
        if (hz === 120) set.push(40)
        if (hz === 90) set.push(45)
        if (hz >= 120) set.push(60)
        if (hz > 60 && Number.isInteger(hz / 2) && set.indexOf(hz / 2) < 0) set.push(hz / 2)
        if (set.indexOf(hz) < 0) set.push(hz)
        return ["Off"].concat(set.sort((a, b) => a - b).map(String))
    }

    // FSR 1 render scales (AMD's published ratios), applied by gamescope.
    function renderSize(mode) {
        const s = { Quality: 1.5, Balanced: 1.7, Performance: 2 }[mode]
        return s ? Math.round(displayW / s) + "×" + Math.round(displayH / s) : ""
    }

    // How a game runs: native (Linux build), proton (Windows build) or emulator.
    function runtimeOf(g) { return g.source === "emu" ? "emulator" : g.native ? "native" : "proton" }

    // The game's own upscalers. DLSS needs an NVIDIA GPU; FSR and XeSS run on any GPU.
    function gameUpscalers(g) {
        return (g.upscalers || []).map(n => ({ name: n, works: n.indexOf("DLSS") !== 0 || gpu === "nvidia" }))
    }

    // ---------- reading the hardware ----------
    function readDevice() {
        const product = os.readText("/sys/class/dmi/id/product_name").trim()
        productName = deviceNames[product] || product
        const cpu = /model name\s*:\s*(.+)/.exec(os.readText("/proc/cpuinfo"))
        const vendors = JSON.parse(os.glob("/sys/class/drm/card*/device/vendor")).map(p => os.readText(p).trim())
        gpu = vendors.indexOf("0x10de") >= 0 ? "nvidia" : vendors.indexOf("0x1002") >= 0 ? "amd" : vendors.indexOf("0x8086") >= 0 ? "intel" : "amd"
        const gpuName = { nvidia: "NVIDIA", amd: "AMD Radeon", intel: "Intel" }[gpu]
        chip = (cpu ? cpu[1].replace(/\s+/g, " ").replace(/ \d+-Core Processor$/, "").trim() : "") + (gpu === "nvidia" ? " · " + gpuName : "")
        const mem = /MemTotal:\s*(\d+)/.exec(os.readText("/proc/meminfo"))
        memory = mem ? Math.round(parseInt(mem[1]) / 1048576) + " GB" : ""
        tdpRange = tdpRanges[productName] || { min: 5, max: 30 }
        const lights = JSON.parse(os.glob("/sys/class/backlight/*"))
        if (lights.length) {
            backlight = lights[0].split("/").pop()
            backlightMax = parseInt(os.readText(lights[0] + "/max_brightness")) || 0
        }
        readEdid()
        readBattery()
        storageInfo = JSON.parse(os.storage(os.home))
        const rel = /IMAGE_VERSION="?([^"\n]+)/.exec(os.readText("/etc/os-release"))
        if (rel) osVersion = rel[1]
    }

    // VRR: the EDID's range limits with continuous frequency. HDR: a CTA HDR static metadata block.
    function readEdid() {
        const outputs = JSON.parse(os.glob("/sys/class/drm/card*-*"))
        for (const o of outputs) {
            if (os.readText(o + "/status").trim() !== "connected") continue
            const hex = os.readHex(o + "/edid")
            if (hex.length < 256) continue
            const b = i => parseInt(hex.substr(i * 2, 2), 16)
            const continuous = (b(0x18) & 1) === 1
            for (let d = 0x36; d < 0x7e; d += 18) {
                if (b(d) === 0 && b(d + 1) === 0 && b(d + 3) === 0xfd) {
                    const min = b(d + 5), max = b(d + 6)
                    if (continuous && max - min >= 20) vrrCapable = true
                }
            }
            for (let ext = 1; ext * 128 < hex.length / 2; ext++) {
                const base = ext * 128
                if (b(base) !== 0x02) continue
                const end = base + b(base + 2)
                for (let i = base + 4; i < end && i < base + 127;) {
                    const tag = b(i) >> 5, len = b(i) & 31
                    if (tag === 7 && b(i + 1) === 0x06) hdrCapable = true
                    i += len + 1
                }
            }
        }
    }

    function readBattery() {
        const bats = JSON.parse(os.glob("/sys/class/power_supply/BAT*"))
        hasBattery = bats.length > 0
        if (!hasBattery) return
        battery = (parseInt(os.readText(bats[0] + "/capacity")) || 100) / 100
        charging = os.readText(bats[0] + "/status").trim() === "Charging"
    }

    readonly property Timer poll: Timer {
        interval: 30000
        running: true
        repeat: true
        onTriggered: { sys.readBattery(); sys.readWifi() }
    }
    // Wi-Fi usually connects a few seconds after the shell starts. `nmcli monitor` prints a line
    // on every change in NetworkManager, so the shell knows at once instead of at the next poll.
    readonly property Timer wifiChanged: Timer { interval: 300; onTriggered: sys.readWifi() }

    // ---------- network ----------
    // nmcli's terse output escapes ':' inside fields as '\:'.
    function fields(line) {
        const out = []
        let cur = ""
        for (let i = 0; i < line.length; i++) {
            const c = line[i]
            if (c === "\\" && i + 1 < line.length) { cur += line[++i]; continue }
            if (c === ":") { out.push(cur); cur = ""; continue }
            cur += c
        }
        out.push(cur)
        return out
    }

    function readWifi() {
        App.query("wifi-state", "nmcli", ["-t", "-f", "TYPE,STATE,CONNECTION", "device"])
        App.query("wifi-active", "nmcli", ["-t", "-f", "ACTIVE,SSID,SIGNAL", "device", "wifi"])
    }

    function scan() {
        scanning = true
        App.query("wifi-scan", "nmcli", ["-t", "-f", "IN-USE,SSID,SIGNAL,SECURITY", "device", "wifi", "list", "--rescan", "yes"])
    }

    // done(ok, wrongPassword, message)
    property var connectDone: null
    function connect(ssid, password, done) {
        connectDone = done
        const args = ["device", "wifi", "connect", ssid]
        if (password) args.push("password", password)
        App.system("wifi-connect", "nmcli", args)
    }

    function forgetNetworks() {
        App.query("wifi-saved", "nmcli", ["-t", "-f", "NAME,TYPE", "connection", "show"])
    }

    // ---------- updates ----------
    function checkUpdates() {
        updateState = "checking"
        App.query("update-check", rpmOstree, ["upgrade", "--check"])
    }
    function installUpdate() {
        updateState = "downloading"
        updateStage = "preparing"
        updateError = ""
        updateLayers = updateFetched = 0
        updateTotal = updateDone = updatePending = updateRx = updateSpeed = 0
        updateRxStart = rxBytes()
        if (!App.real && rpmOstree === "rpm-ostree") return App.system("update-install", "rpm-ostree", ["upgrade"])
        // rpm-ostree's C parts buffer their output when it goes to a pipe; stdbuf makes them
        // print each line as it happens.
        if (os.which("stdbuf")) App.sys.stream("update-install", "stdbuf", JSON.stringify(["-oL", "-eL", rpmOstree, "upgrade"]))
        else App.sys.stream("update-install", rpmOstree, JSON.stringify(["upgrade"]))
    }
    // Bytes received on every network interface but loopback.
    function rxBytes() {
        return JSON.parse(os.glob("/sys/class/net/*/statistics/rx_bytes"))
            .filter(p => p.indexOf("/lo/") < 0)
            .reduce((n, p) => n + (parseFloat(os.readText(p)) || 0), 0)
    }
    // "215.3 MB", "1.2 GB", "512 bytes" (GLib's sizes, as rpm-ostree prints them) in bytes.
    function parseSize(text) {
        const m = /([\d.]+)\s*([kKMGT]i?B|bytes?)/.exec(text)
        if (!m) return 0
        const unit = m[2][0].toLowerCase()
        const base = m[2][1] === "i" ? 1024 : 1000
        return parseFloat(m[1]) * Math.pow(base, { b: 0, k: 1, m: 2, g: 3, t: 4 }[unit])
    }
    function updateLine(text) {
        let m
        if ((m = /layers needed:\s*(\d+)\s*\(([^)]+)\)/.exec(text))) {
            updateLayers += parseInt(m[1])
            updateTotal += parseSize(m[2])
        } else if (/^\s*(\[\d+\/\d+\]\s*)?Fetching\b/.test(text)) {
            // "Fetching layer 3f2a… (215.3 MB)... done": the line can arrive when the layer
            // starts or when it ends.
            updateStage = "downloading"
            updateDone += updatePending
            const size = parseSize((/\(([^)]+)\)/.exec(text) || ["", ""])[1])
            if (/done\s*$/.test(text)) { updateDone += size; updatePending = 0; updateFetched++ }
            else updatePending = size
        } else if (/Staging deployment|Writing objects|Checking out|Merging|Pruning/i.test(text)) {
            updateDone += updatePending
            updatePending = 0
            updateStage = "installing"
        }
    }
    readonly property Timer updateMeter: Timer {
        interval: 1000
        repeat: true
        running: sys.updateState === "downloading" && sys.updateStage === "downloading"
        onTriggered: {
            const rx = sys.rxBytes() - sys.updateRxStart
            const step = Math.max(0, rx - sys.updateRx)
            sys.updateSpeed = sys.updateSpeed ? sys.updateSpeed * 0.7 + step * 0.3 : step
            sys.updateRx = rx
        }
    }
    onUpdateStateChanged: if (updateState === "ready" && !App.overlays.some(o => o.isUpdate)) App.toast(I18n.t("restartToUpdate"), { icon: "restart" })
    function rollback() { App.system("rollback", "rpm-ostree", ["rollback"]) }

    function desktopMode() {
        if (!App.real || !os.which("steamos-session-select")) {
            App.toast(I18n.t("notAvailable"), { icon: "desktop" })
            return
        }
        App.system("desktop", "steamos-session-select", ["plasma"])
    }

    // ---------- applying settings ----------
    function applyBrightness() {
        if (!backlight || !backlightMax) return
        const v = Math.round(backlightMax * Settings.brightness / 100)
        App.system("brightness", "busctl", ["call", "org.freedesktop.login1", "/org/freedesktop/login1/session/auto",
                   "org.freedesktop.login1.Session", "SetBrightness", "ssu", "backlight", backlight, String(v)])
    }

    function applyTdp() {
        if (!powerStation) return
        const watts = Settings.tdpLimit ? Settings.tdp : tdpRange.max
        App.system("tdp", "steamosctl", ["set-tdp-limit", String(watts)])
    }

    // The closest name steamos-manager offers for a setting's value.
    function pick(list, words) {
        for (const w of words) {
            const hit = list.find(x => x.indexOf(w) >= 0)
            if (hit) return hit
        }
        return ""
    }
    function words(out) { return (out.match(/[a-z][a-z0-9_-]+/g) || []) }

    readonly property var locales: ({ en: "en_US", es: "es_ES", fr: "fr_FR", de: "de_DE", "pt-BR": "pt_BR", ja: "ja_JP" })
    function applyLocale() {
        const base = locales[Settings.language] || "en_US"
        const code = Settings.region ? base.split("_")[0] + "_" + Settings.region : base
        App.system("locale", "localectl", ["set-locale", "LANG=" + code + ".UTF-8"])
    }

    readonly property Connections effects: Connections {
        target: Settings
        function onVolumeChanged() { App.system("volume", "wpctl", ["set-volume", "@DEFAULT_AUDIO_SINK@", (Settings.volume / 100).toFixed(2)]) }
        function onBrightnessChanged() { sys.applyBrightness() }
        function onWifiChanged() { App.system("radio", "nmcli", ["radio", "wifi", Settings.wifi ? "on" : "off"]) }
        function onBluetoothChanged() { App.system("bt", "bluetoothctl", ["power", Settings.bluetooth ? "on" : "off"]) }
        function onAirplaneChanged() {
            App.system("radio", "nmcli", ["radio", "all", Settings.airplane ? "off" : "on"])
            if (Settings.airplane) App.system("bt", "bluetoothctl", ["power", "off"])
        }
        function onEppChanged() {
            const want = { "Power saver": ["power-saver", "low-power", "quiet", "power"], Balanced: ["balanced"], Performance: ["performance"] }[Settings.epp]
            const p = sys.pick(sys.perfProfiles, want) || want[0]
            App.system("epp", "steamosctl", ["set-performance-profile", p])
        }
        function onSchedulerChanged() {
            const s = Settings.scheduler === "scx_lavd" ? sys.pick(sys.cpuSchedulers, ["lavd"])
                : sys.cpuSchedulers.find(x => x.indexOf("lavd") < 0 && x.indexOf("bpfland") < 0) || ""
            if (s) App.system("scheduler", "steamosctl", ["set-cpu-scheduler", s])
        }
        function onTdpChanged() { sys.applyTdp() }
        function onTdpLimitChanged() { sys.applyTdp() }
        function onTimeAutoChanged() { App.system("ntp", "timedatectl", ["set-ntp", Settings.timeAuto ? "true" : "false"]) }
        function onTimeZoneChanged() { if (Settings.timeZone) App.system("tz", "timedatectl", ["set-timezone", Settings.timeZone]) }
        function onLanguageChanged() { sys.applyLocale() }
        function onRegionChanged() { sys.applyLocale(); Region.measure() }
    }

    readonly property Connections replies: Connections {
        target: App.sys
        function onLine(tag, text) {
            if (tag === "update-install") sys.updateLine(text)
            else if (tag === "nm-monitor") sys.wifiChanged.restart()
        }
        function onFinished(tag, code, out, err) {
            if (tag === "wifi-state") {
                sys.hasNetworkManager = code === 0
                sys.wired = out.split("\n").some(l => { const f = sys.fields(l); return f[0] === "ethernet" && f[1].indexOf("connected") === 0 })
                sys.hasWifi = out.split("\n").some(l => sys.fields(l)[0] === "wifi")
            } else if (tag === "wifi-active") {
                const act = out.split("\n").map(sys.fields).find(f => f[0] === "yes")
                sys.wifiSsid = act ? act[1] : ""
                sys.wifiSignal = act ? parseInt(act[2]) || 0 : 0
            } else if (tag === "wifi-scan") {
                sys.scanning = false
                const seen = {}
                sys.networks = out.split("\n").map(sys.fields).filter(f => f.length >= 4 && f[1])
                    .map(f => ({ ssid: f[1], signal: parseInt(f[2]) || 0, secured: !!f[3] && f[3] !== "--", active: f[0] === "*" }))
                    .sort((a, b) => (b.active - a.active) || (b.signal - a.signal))
                    .filter(n => seen[n.ssid] ? false : (seen[n.ssid] = true))
            } else if (tag === "wifi-connect") {
                const done = sys.connectDone
                sys.connectDone = null
                const wrong = /secrets were required|802-1x|password/i.test(err)
                if (done) done(code === 0, wrong, err.trim())
                sys.readWifi()
            } else if (tag === "wifi-saved") {
                out.split("\n").map(sys.fields).filter(f => f[1] === "802-11-wireless")
                    .forEach(f => App.system("wifi-forget", "nmcli", ["connection", "delete", f[0]]))
            } else if (tag === "update-check") {
                // rpm-ostree: 0 = an update is available, 77 = already up to date. The new image's
                // version is on its "Version:" line.
                const ver = /Version:\s*(\S+)/.exec(out)
                sys.updateVersion = ver ? ver[1] : ""
                sys.updateState = code === 0 ? "available" : code === 77 ? "none" : "failed"
            } else if (tag === "update-install") {
                if (code === 0) {
                    sys.updateStage = ""
                    sys.updateState = /No upgrade available/i.test(out) ? "none" : "ready"
                    return
                }
                const lines = (err || out).trim().split("\n")
                sys.updateError = /transaction in progress|already running|another transaction/i.test(err) ? "busy" : lines[lines.length - 1].replace(/^error:\s*/i, "")
                sys.updateStage = ""
                sys.updateState = "installFailed"
            } else if (tag === "tdp-max" && code === 0) {
                const n = parseFloat((out.match(/[\d.]+/) || [""])[0])
                if (n > 0) {
                    sys.tdpRange = { min: sys.tdpRange.min, max: Math.round(n) }
                    sys.powerStation = true
                }
            } else if (tag === "tdp-min" && code === 0) {
                const n = parseFloat((out.match(/[\d.]+/) || [""])[0])
                if (n > 0) sys.tdpRange = { min: Math.round(n), max: sys.tdpRange.max }
            } else if (tag === "perf-profiles" && code === 0) {
                sys.perfProfiles = sys.words(out)
            } else if (tag === "cpu-schedulers" && code === 0) {
                sys.cpuSchedulers = sys.words(out)
            } else if (tag === "volume-read" && code === 0) {
                const m = /Volume:\s*([\d.]+)/.exec(out)
                if (m) { Settings.loaded = false; Settings.volume = Math.round(parseFloat(m[1]) * 20) * 5; Settings.loaded = true }
            } else if (tag === "image") {
                try {
                    const d = JSON.parse(out).deployments.find(x => x.booted)
                    if (d && d["container-image-reference"]) sys.imageRef = d["container-image-reference"].replace(/^ostree-[a-z-]+:(docker:\/\/)?/, "")
                } catch (e) {}
            }
        }
    }

    Component.onCompleted: {
        readDevice()
        readWifi()
        // stdbuf: nmcli buffers what it prints to a pipe.
        if (os.which("stdbuf")) App.sys.stream("nm-monitor", "stdbuf", JSON.stringify(["-oL", "nmcli", "monitor"]))
        else App.sys.stream("nm-monitor", "nmcli", JSON.stringify(["monitor"]))
        App.query("tdp-min", "steamosctl", ["get-tdp-limit-min"])
        App.query("tdp-max", "steamosctl", ["get-tdp-limit-max"])
        App.query("perf-profiles", "steamosctl", ["get-available-performance-profiles"])
        App.query("cpu-schedulers", "steamosctl", ["get-available-cpu-schedulers"])
        App.query("volume-read", "wpctl", ["get-volume", "@DEFAULT_AUDIO_SINK@"])
        App.query("image", "rpm-ostree", ["status", "--json"])
    }
}
