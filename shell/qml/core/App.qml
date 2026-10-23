// Router and wiring. Main.qml hands it the layers and component tables;
// screens and overlays call it for navigation, popups and system actions.
//
// Screens: App.go(name, params). Each screen is a QML item with `shell` ({ title, hints,
// topbar, hintbar, strip, topbarNav }) and optional enter(), onBack(), onOptions(), onTab(d).
// Overlays (panels, dialogs, keyboard, ...) are opened with App.open(name, props) and close
// themselves; App keeps the stack so navigation can close them all.
//
// `real` is true inside the Vanta session (VANTA_SESSION=1). Outside it (development), commands
// that change the machine (power, Wi-Fi, time zone, language) are printed instead of run.
// Everything shown is always read from the machine: Wi-Fi networks, the Steam library and
// account, storage, updates. `sample` (VANTA_SAMPLE=1, set only by the screenshot and flow-check
// tools) swaps in a sample library, networks and simulated sign-ins instead.
pragma Singleton
import QtQuick
import dev.vanta.shell

QtObject {
    id: app

    readonly property Sys sys: Sys {}
    readonly property bool real: sys.env("VANTA_SESSION") === "1"
    readonly property bool sample: sys.env("VANTA_SAMPLE") === "1"
    // The shell alone without gamescope (vanta-kiosk): no Steam client, since its windows would
    // cover the shell and games can't run.
    readonly property bool kiosk: sys.env("VANTA_KIOSK") === "1"
    // Vanta accounts need the account service (VANTA_ACCOUNT_URL), which isn't running yet; until
    // it is, the option isn't offered.
    readonly property bool vantaAccounts: sample || sys.env("VANTA_ACCOUNT_URL") !== ""

    // Set by Main.qml
    property var stage: null
    property var layer: null
    property var toasts: null
    property var topBar: null
    property var screens: ({})
    property var overlayKinds: ({})
    property var pads: null

    property var screen: null
    property var stack: []
    property var overlays: []
    property bool busy: false
    property var running: null
    property bool inGame: false
    property var lastGame: null
    property var sleeping: null

    // The shell bars (Main.qml binds them)
    property string shellTitle: ""
    property var shellHints: []
    property bool topbarShown: true
    property bool hintbarShown: true
    property bool shellHidden: false
    property real shellStrip: 0
    property bool shellScrolled: false

    // ---------- timers ----------
    function later(ms, fn) {
        const t = Qt.createQmlObject("import QtQuick; Timer { repeat: false }", app, "later")
        t.interval = Math.max(0, ms)
        t.triggered.connect(() => { t.destroy(); fn() })
        t.start()
        return t
    }

    // ---------- system commands ----------
    // Changes the machine: runs inside the Vanta session, printed in development.
    function system(tag, program, args) {
        if (!real) {
            console.log("vanta (dev, not run): " + program + " " + args.join(" "))
            later(300, () => sys.finished(tag, 0, "", ""))
            return
        }
        sys.exec(tag, program, JSON.stringify(args))
    }
    // Reads from the machine: always runs.
    function query(tag, program, args) { sys.exec(tag, program, JSON.stringify(args)) }

    // ---------- screens ----------
    function go(name, params, opts) {
        params = params || {}
        opts = opts || {}
        closeAll()
        const key = name + JSON.stringify(params)
        if (screen && screen.navKey === key && !opts.transition) return
        if (opts.replace) stack = []
        if (!opts.fromBack) {
            const s = stack.slice()
            const i = s.findIndex(x => x.key === key)
            if (i >= 0) s.length = i
            s.push({ key: key, name: name, params: params })
            stack = s
        }
        const old = screen
        Music.claimed = false
        const next = screens[name].createObject(stage, { app: app, params: params })
        next.navKey = key
        next.screenName = name
        screen = next
        const fade = !!old && !opts.instant
        if (old) {
            old.enabled = false
            old.z = 0
            if (fade) {
                old.leave()
                later(Theme.tBase + 60, () => old.destroy())
            } else old.destroy()
        }
        next.z = 1
        if (fade) next.enter_fade()
        if (!Music.claimed) Music.release()
        applyShell(next)
        Nav.setRoot(next, () => { if (!(next.onBack && next.onBack())) app.back() })
        // Focus once the page has its size and layout.
        later(0, () => {
            if (screen !== next) return
            if (next.enter) next.enter()
            if (!Nav.current) Nav.focusFirst()
        })
    }

    function back() {
        if (stack.length < 2) return
        const s = stack.slice()
        s.pop()
        stack = s
        const prev = s[s.length - 1]
        go(prev.name, prev.params, { fromBack: true })
    }

    // Rebuild the current screen in place (after a library or language change).
    function refresh(params) {
        const cur = stack[stack.length - 1]
        if (!cur) return
        if (params) cur.params = params
        screen.navKey = ""
        go(cur.name, cur.params, { fromBack: true, instant: true })
    }

    function applyShell(s) {
        const sh = s.shell || {}
        if (!inGame) shellHidden = false
        shellTitle = sh.title || ""
        topbarShown = sh.topbar !== false
        Nav.chrome = sh.topbar === false ? null : topBar
        Nav.chromeNav = sh.topbarNav !== false
        shellStrip = sh.strip || 0
        setHints(sh.hints || [], sh.hintbar === false)
        shellScrolled = false
    }

    function setHints(hints, hidden) {
        shellHints = hints
        hintbarShown = !hidden && hints.length > 0
    }

    function locked() { return !!screen && (screen.screenName === "setup" || screen.screenName === "users") }

    // ---------- overlays ----------
    function open(kind, props) {
        const o = overlayKinds[kind].createObject(layer, Object.assign({ app: app }, props || {}))
        overlays = overlays.concat([o])
        o.closed.connect(() => { overlays = overlays.filter(x => x !== o) })
        if (o.open) o.open()
        return o
    }
    function top() { return overlays.length ? overlays[overlays.length - 1] : null }
    function closeAll() { overlays.slice().reverse().forEach(o => o.close(true)) }

    function toast(text, opts) { if (toasts) toasts.show(text, opts || {}) }

    // "Are you sure?" with Cancel focused. onYes runs only on confirm.
    function confirm(opts, onYes, onNo) {
        let done = false
        const finish = v => { if (done) return; done = true; if (v && onYes) onYes(); if (!v && onNo) onNo() }
        const d = open("dialog", {
            title: opts.title, body: opts.body || "",
            actions: [
                { label: opts.cancelLabel || I18n.t("cancel"), variant: "secondary", run: () => finish(false) },
                { label: opts.confirmLabel || I18n.t("ok"), variant: opts.danger ? "danger" : "primary", run: () => finish(true) }
            ]
        })
        d.closed.connect(() => later(0, () => finish(false)))
        return d
    }

    // Error and status popups. onDone gets the action id, or null for B.
    function alert(tone, opts, onDone) {
        let done = false
        const finish = id => { if (done) return; done = true; if (onDone) onDone(id) }
        const acts = (opts.actions && opts.actions.length ? opts.actions : [{ id: "ok", label: I18n.t("ok") }])
            .map((a, i) => ({ label: a.label, variant: a.variant || (i === 0 ? "primary" : "secondary"), run: () => finish(a.id || a.label) }))
        const icons = { error: "error", warning: "warning", info: "info", success: "check_circle" }
        const d = open("dialog", { title: opts.title, body: opts.message || "", code: opts.code || "", actions: acts, icon: icons[tone], tone: tone })
        d.closed.connect(() => later(0, () => finish(null)))
        return d
    }

    // ---------- menus ----------
    function toggleMainMenu() {
        if (locked() || busy) return
        const t = top()
        closeAll()
        if (!(t && t.isMainMenu)) open("mainMenu")
    }

    // From the top bar: open Quick access on a page; the same button again closes it.
    function openQuickAccess(tab) {
        if (locked() || busy) return
        const t = top()
        closeAll()
        if (t && t.isQuickAccess && t.tab === tab) return
        open("quickAccess", { tab: tab })
    }

    function toggleQuickAccess() {
        if (locked() || busy) return
        const t = top()
        closeAll()
        if (!(t && t.isQuickAccess)) open("quickAccess", {})
    }

    function openPower() {
        closeAll()
        open("dialog", {
            title: I18n.t("power"), stack: true,
            actions: [
                { label: I18n.t("sleep"), icon: "moon", run: () => request("sleep") },
                { label: I18n.t("switchUser"), icon: "user", run: () => request("switchUser") },
                { label: I18n.t("restart"), icon: "restart", run: () => request("restart") },
                { label: I18n.t("switchDesktop"), icon: "desktop", run: () => System.desktopMode() },
                { label: I18n.t("shutDown"), icon: "power", run: () => request("shutDown") },
                { label: I18n.t("cancel"), variant: "ghost" }
            ]
        })
    }

    // ---------- games ----------
    function openGame(g) {
        lastGame = g
        go("game", { id: g.id })
    }

    function launch(g) {
        if (busy) return
        if (!g.installed) {
            Games.install(g)
            toast(I18n.t("addedToDownloads", { game: g.title }), { icon: "download" })
            return
        }
        if (running && running.id !== g.id) {
            toast(I18n.t("exitFirst", { game: running.title }), { icon: "info", tone: "bad" })
            return
        }
        closeAll()
        busy = true
        lastGame = g
        Music.release()
        open("launch", { game: g })
    }

    // The launch overlay has handed over to the game.
    function launched(g) {
        busy = false
        running = g
        inGame = true
        shellHidden = true
    }

    // The game ended on its own (or was closed from the menu).
    function gameEnded() {
        const g = running
        running = null
        if (inGame) leaveGameView()
        else if (g) refresh()
    }

    function resume() {
        if (!running) return
        closeAll()
        if (!inGame) {
            inGame = true
            shellHidden = true
            Games.focusGame(running)
        }
    }

    // Show the Vanta UI over the running game.
    function leaveGameView(noRefresh) {
        if (!inGame) return
        inGame = false
        shellHidden = false
        if (!noRefresh) refresh()
    }

    function exitGame() {
        const g = running
        if (!g) return
        confirm({ title: I18n.t("exitQ", { game: g.title }), body: I18n.t("exitBody"), confirmLabel: I18n.t("exitGame"), danger: true }, () => {
            Games.stop(g)
            running = null
            if (inGame) leaveGameView()
            else refresh()
            toast(I18n.t("closed", { game: g.title }), { icon: "exit", sound: "back" })
        })
    }

    // ---------- power ----------
    function request(kind) {
        if (kind === "switchUser" && running) return switchUser()
        const g = running
        const copy = {
            sleep: ["sleepQ", g ? I18n.t("sleepBodyGame", { game: g.title }) : "", "sleep", false],
            restart: ["restartQ", g ? I18n.t("powerBodyGame", { game: g.title }) : "", "restart", true],
            shutDown: ["shutDownQ", g ? I18n.t("powerBodyGame", { game: g.title }) : "", "shutDown", true],
            switchUser: ["switchUserQ", "", "switchUser", false]
        }[kind]
        confirm({ title: I18n.t(copy[0]), body: copy[1], confirmLabel: I18n.t(copy[2]), danger: copy[3] }, () => app[kind]())
    }

    function sleep() {
        closeAll()
        Music.release()
        const black = open("black", {})
        if (real) later(650, () => sys.exec("power", "systemctl", JSON.stringify(["suspend"])))
        // On resume (any input, or the system waking) the screen comes back.
        sleeping = () => {
            sleeping = null
            Sound.play("boot")
            Haptics.play("notify")
            black.fadeOut()
            if (!inGame && screen && screen.game) Music.select(screen.game)
        }
    }

    function switchUser() {
        if (running) {
            toast(I18n.t("exitFirst", { game: running.title }), { icon: "info", tone: "bad" })
            return
        }
        go("users", {}, { replace: true })
    }

    function restart() { powerOff("reboot") }
    function shutDown() { powerOff("poweroff") }

    // A moment of black, then the system restarts or powers off. In development the screen comes
    // back on "Who's playing?" (after any button, for shut down),.
    function powerOff(how) {
        running = null
        inGame = false
        shellHidden = false
        Music.release()
        const black = open("black", {})
        later(900, () => {
            if (real) { sys.exec("power", "systemctl", JSON.stringify([how])); return }
            const wake = () => { go("users", {}, { replace: true }); black.fadeOut() }
            if (how === "reboot") return wake()
            sleeping = () => { sleeping = null; Sound.play("boot"); Haptics.play("boot"); wake() }
        })
    }

    // Reset system: a factory reset of the whole device (vanta-factory-reset in the image: users'
    // files, Steam, networks, Bluetooth, system settings), done early in the next boot. Then
    // first boot setup and first-time setup run again. In development only the shell's own
    // settings are erased.
    function resetSystem() {
        closeAll()
        Music.release()
        const black = open("black", {})
        later(900, () => {
            if (real) {
                sys.exec("power", "systemctl", JSON.stringify(["start", "--no-block", "vanta-factory-reset.service"]))
                return
            }
            sys.remove(sys.configDir)
            Settings.reload()
            Profiles.reload()
            Settings.setupDone = false
            go("setup", {}, { replace: true })
            black.fadeOut()
        })
    }

    // End of first-time setup: the logo and jingle, then the tour of Home.
    function welcome() {
        busy = true
        const w = open("welcome", {})
        w.closed.connect(() => { busy = false; later(100, () => open("tour", {})) })
    }

    function tour() {
        go("home")
        later(500, () => open("tour", {}))
    }

    // ---------- input ----------
    // Every console action from the keyboard (Main.qml) or a controller (gamepad.rs).
    function handle(action, repeat) {
        if (sleeping) { sleeping(); return }
        if (busy) return
        const t = top()
        if (t && t.handleAction && t.handleAction(action)) return
        // While a game is on screen it gets the input; only the system buttons reach Vanta.
        if (inGame && !t && ["mainMenu", "qam", "power"].indexOf(action) < 0) return
        switch (action) {
        case "up": case "down": case "left": case "right":
            Nav.move(action)
            break
        case "accept":
            Nav.accept()
            break
        case "back":
            if (Nav.scopes.length > 1 || stack.length > 1 || (screen && screen.onBack)) {
                Sound.play("back")
                Haptics.play("back")
            }
            Nav.back()
            break
        case "options":
            if (Nav.scopes.length === 1 && screen && screen.onOptions && !Nav.inChrome(Nav.current)) screen.onOptions()
            else Nav.options()
            break
        case "qam":
            toggleQuickAccess()
            break
        case "mainMenu":
            if (inGame && !t) { leaveGameView(true); later(10, toggleMainMenu); break }
            toggleMainMenu()
            break
        case "prevTab": case "nextTab": {
            const d = action === "nextTab" ? 1 : -1
            if (t && t.stepTab) t.stepTab(d)
            else if (Nav.scopes.length === 1 && screen && screen.onTab) screen.onTab(d)
            break
        }
        case "home":
            if (locked()) break
            if (inGame) leaveGameView(true)
            go("home")
            break
        case "power":
            if (!locked()) openPower()
            break
        }
    }
}
