// First-time setup (the mockup's screens/Setup.js), laid out like SteamOS's: the step title
// centred on the left, the choices in a full-height panel on the right. No step counter.
// Steps: language, network, time zone, updates, sign-in, controller, profile, done.
// It configures the real system as it goes and sticks: the language and time zone are set with
// localectl and timedatectl (System.qml), Wi-Fi joins through NetworkManager, OS updates are
// staged with rpm-ostree, Steam updates itself, and the profile and accounts are saved. It runs
// once; only Settings > System > Reset system brings it back.
import QtQuick
import dev.vanta.shell

Screen {
    id: page

    readonly property var steps: ["language", "network", "timezone", "updates", "account", "controller", "profile", "done"]
    property int step: params.step || 0
    readonly property string stepId: steps[step]
    property bool busy: false
    property string accountView: "choose"     // choose | steam | vanta
    property var accounts: ({ steam: null, vanta: null })
    property var draft: ({ name: "", color: Profiles.nextColor(), photo: "", fromSteam: false })
    property string joined: ""                // network joined during setup
    property string joining: ""

    readonly property bool canGoBack: step > 0 && stepId !== "updates" && stepId !== "done" && steps[step - 1] !== "updates"

    shell: ({
        topbar: false,
        hints: [["accept", I18n.t("select")]].concat(canGoBack || (stepId === "account" && accountView !== "choose") ? [["back", I18n.t("back")]] : [])
    })
    onShellChanged: if (App.screen === page) App.setHints(shell.hints)

    readonly property var titles: ({
        language: ["setupLanguage", "setupLanguageSub"], network: ["setupNetwork", "setupNetworkSub"],
        timezone: ["setupTimeZone", ""], updates: ["setupUpdates", "setupUpdatesSub"], account: ["setupAccount", "setupAccountSub"],
        controller: ["setupController", "setupControllerSub"], profile: ["setupProfile", "setupProfileSub"], done: ["setupDone", "setupDoneSub"]
    })

    function enter() { focusFirst() }

    // Focus the step's first choice (or its chosen one) once the panel has laid out.
    property bool pendingFocus: false
    function focusFirst() {
        pendingFocus = true
        focusFallback.restart()
    }
    function placeFocus() {
        if (!pendingFocus) return
        pendingFocus = false
        Nav.settle(body)
        const list = Nav.focusables().filter(it => Nav.contains(body, it))
        const first = list.find(it => it.selected === true) || Nav.orderFirst(list)
        if (first) Nav.focus(first, true)
    }
    Timer { id: focusFallback; interval: 120; onTriggered: page.placeFocus() }

    function go(n) {
        const forward = n > step
        accountView = "choose"
        step = n
        slide.from = forward ? 40 : -40
        slide.restart()
        focusFirst()
    }

    function onBack() {
        if (busy) return true
        if (stepId === "account" && accountView !== "choose") {
            accountView = "choose"
            focusFirst()
            return true
        }
        if (canGoBack) go(step - 1)
        return true
    }

    // ---------- network ----------
    readonly property var sampleNetworks: [
        { ssid: "Home-5G", signal: 90, secured: true }, { ssid: "Home-2.4G", signal: 70, secured: true },
        { ssid: "Upstairs", signal: 45, secured: true }, { ssid: "CoffeeShop-Guest", signal: 20, secured: false }
    ]
    readonly property var networks: App.real || System.networks.length ? System.networks : sampleNetworks
    function signalIcon(n) { return n >= 75 ? "wifi" : n >= 50 ? "network_wifi_3_bar" : n >= 30 ? "network_wifi_2_bar" : "network_wifi_1_bar" }

    function askPassword(n) {
        const kb = App.open("keyboard", { label: I18n.t("passwordFor", { ssid: n.ssid }), password: true, maxLength: 63 })
        kb.finished.connect(pw => { if (pw) join(n, pw) })
    }

    function join(n, password) {
        busy = true
        joining = n.ssid
        const done = (ok, wrong) => {
            busy = false
            joining = ""
            if (!ok) {
                App.alert("error", {
                    title: I18n.t("wifiFailTitle"), message: I18n.t("wifiFailBody", { ssid: n.ssid }),
                    code: I18n.t("errorCode", { code: wrong ? "NET-0x1F" : "NET-0x20" }),
                    actions: [{ id: "retry", label: I18n.t("tryAgain") }, { id: "cancel", label: I18n.t("cancel") }]
                }, id => { if (id === "retry") n.secured ? askPassword(n) : join(n) })
                return
            }
            joined = n.ssid
            Settings.wifi = true
            Sound.play("toggleOn")
            App.later(500, () => go(step + 1))
        }
        // WPA2 passwords are 8 to 63 characters. Development has no NetworkManager to ask.
        if (!App.real) App.later(1400, () => done(!password || password.length >= 8, true))
        else System.connect(n.ssid, password || "", done)
    }

    // ---------- updates ----------
    property string osState: "checking"      // checking | downloading | done | none | failed
    property real osProgress: 0
    property string steamState: "waiting"    // waiting | updating | done | missing
    property real steamProgress: 0

    function startUpdates() {
        busy = true
        osState = "checking"
        steamState = "waiting"
        if (!App.real) {
            // The mockup's simulated check and download, in uneven steps as real downloads go.
            App.later(1600, () => { osState = "downloading"; simulate("os") })
            return
        }
        System.checkUpdates()
    }
    function simulate(which) {
        const tick = () => {
            if (which === "os") {
                osProgress = Math.min(1, osProgress + 0.04 + Math.random() * 0.09)
                if (osProgress < 1) return App.later(160 + Math.random() * 220, tick)
                osState = "done"
                updateSteam()
            } else {
                steamProgress = Math.min(1, steamProgress + 0.08 + Math.random() * 0.12)
                if (steamProgress < 1) return App.later(140 + Math.random() * 180, tick)
                steamDone()
            }
        }
        tick()
    }
    Connections {
        target: System
        enabled: page.stepId === "updates" && App.real
        function onUpdateStateChanged() {
            const s = System.updateState
            if (s === "available") { page.osState = "downloading"; System.installUpdate() }
            else if (s === "ready") { page.osState = "done"; page.updateSteam() }
            else if (s === "none") { page.osState = "none"; page.updateSteam() }
            else if (s === "failed") { page.osState = "failed"; page.updateSteam() }
        }
    }
    // Steam comes preinstalled and updates itself on first start.
    function updateSteam() {
        steamState = "updating"
        if (!App.real) return simulate("steam")
        if (!App.sys.which("steam")) { steamState = "missing"; return finishUpdates() }
        App.sys.spawn("steam", JSON.stringify(["-silent"]))
        steamWait.start()
    }
    Timer {
        id: steamWait
        interval: 3000
        repeat: true
        property int tries: 0
        // The client's web helper starts once Steam has finished updating.
        onTriggered: {
            tries++
            const up = JSON.parse(App.sys.processes()).some(p => p.cmd.indexOf("steamwebhelper") >= 0)
            if (up || tries > 200) { stop(); page.steamDone() }
        }
    }
    function steamDone() {
        steamState = "done"
        finishUpdates()
    }
    function finishUpdates() {
        busy = false
        Sound.play("notify")
        App.later(0, () => Nav.focus(updatesNext, true))
    }

    // ---------- finish ----------
    function finishSetup() {
        const p = Profiles.add({ name: draft.name || I18n.t("defaultName"), color: draft.color, photo: draft.photo, steam: accounts.steam, vanta: accounts.vanta })
        Profiles.use(p.id)
        Settings.setupDone = true
        Settings.save()
        App.go("home", {}, { replace: true })
        App.welcome()
    }

    // ---------- layout ----------
    Item {
        id: frame
        anchors { fill: parent; bottomMargin: Theme.hintH }

        Item {
            id: aside
            width: parent.width - panel.width
            height: parent.height
            Column {
                anchors.centerIn: parent
                width: Math.min(30 * Theme.rem, parent.width - 2 * Theme.gutter)
                spacing: Theme.s3
                VText {
                    id: title
                    width: parent.width
                    horizontalAlignment: Text.AlignHCenter
                    text: I18n.t(page.titles[page.stepId][0])
                    size: Theme.t2xl
                    weight: Font.DemiBold
                    color: Theme.fg
                    wrapMode: Text.Wrap
                    elide: Text.ElideNone
                    font.letterSpacing: -0.02 * Theme.t2xl
                }
                VText {
                    width: parent.width
                    horizontalAlignment: Text.AlignHCenter
                    visible: text !== ""
                    text: page.titles[page.stepId][1] ? I18n.t(page.titles[page.stepId][1]) : ""
                    color: Theme.fg3
                    wrapMode: Text.Wrap
                    elide: Text.ElideNone
                }
            }
        }

        Rectangle {
            id: panel
            x: parent.width - width
            width: Math.max(24 * Theme.rem, parent.width * 0.42)
            height: parent.height
            color: Theme.panel
            Rectangle { width: 1; height: parent.height; color: Theme.line }

            VScroll {
                id: scroll
                anchors.fill: parent
                contentHeight: body.height + Theme.s5 + Theme.s6
                Column {
                    id: body
                    readonly property bool focusGroup: true
                    onPositioningComplete: if (page.pendingFocus) App.later(0, page.placeFocus)
                    x: Theme.s4
                    y: Theme.s5
                    width: panel.width - 2 * Theme.s4
                    transform: Translate { id: slideX }

                    // 1. Language: moving over a language previews it; choosing it continues.
                    Repeater {
                        model: page.stepId === "language" ? I18n.languages : []
                        VListItem {
                            required property var modelData
                            label: modelData.name
                            check: true
                            selected: Settings.language === modelData.code
                            onFocusIn: Settings.language = modelData.code
                            onActivated: {
                                Settings.language = modelData.code
                                page.go(page.step + 1)
                            }
                        }
                    }

                    // 2. Network
                    VListItem {
                        visible: page.stepId === "network" && System.wired
                        label: I18n.t("wiredNetwork")
                        icon: "desktop"
                        detail: I18n.t("connected")
                        check: true
                        selected: true
                        onActivated: page.go(page.step + 1)
                    }
                    VListItem {
                        visible: page.stepId === "network" && System.scanning && page.networks.length === 0
                        label: I18n.t("searchingNetworks")
                        busy: true
                        focusable: false
                    }
                    Repeater {
                        model: page.stepId === "network" ? page.networks : []
                        VListItem {
                            required property var modelData
                            readonly property bool isJoined: page.joined === modelData.ssid || (!!modelData.active && !page.joining)
                            label: modelData.ssid
                            icon: page.signalIcon(modelData.signal)
                            detail: page.joining === modelData.ssid ? I18n.t("connecting") : isJoined ? I18n.t("connected") : modelData.secured ? I18n.t("secured") : I18n.t("openNetwork")
                            busy: page.joining === modelData.ssid
                            check: true
                            selected: isJoined
                            onActivated: {
                                if (page.busy) return
                                if (isJoined) return page.go(page.step + 1)
                                if (modelData.secured) page.askPassword(modelData)
                                else page.join(modelData)
                            }
                        }
                    }

                    // 3. Time zone (the detected one selected)
                    Repeater {
                        model: page.stepId === "timezone" ? Region.timeZones() : []
                        VListItem {
                            required property var modelData
                            label: modelData.label
                            check: true
                            selected: modelData.value === Region.zone
                            onActivated: {
                                Settings.tzAuto = modelData.value === Region.detectedZone
                                Settings.timeZone = modelData.value
                                page.go(page.step + 1)
                            }
                        }
                    }

                    // 4. Updates: Vanta OS, then Steam
                    Rectangle {
                        visible: page.stepId === "updates"
                        width: parent.width
                        height: visible ? upd.height + 2 * Theme.s5 : 0
                        radius: Theme.rLg
                        color: Theme.panel
                        border.width: 1
                        border.color: Theme.line
                        Column {
                            id: upd
                            x: Theme.s5
                            y: Theme.s5
                            width: parent.width - 2 * Theme.s5
                            spacing: Theme.s4
                            VProgress {
                                size: "lg"
                                indeterminate: page.osState === "checking" || (App.real && page.osState === "downloading")
                                value: page.osState === "done" || page.osState === "none" ? 1 : page.osProgress
                                tone: page.osState === "done" || page.osState === "none" ? "good" : "accent"
                                showValue: !App.real
                                label: page.osState === "checking" ? I18n.t("checkingUpdates")
                                     : page.osState === "downloading" ? I18n.t("downloadingUpdate", { version: App.real ? "" : "0.1.1" }).trim()
                                     : page.osState === "done" ? I18n.t(App.real ? "updateStaged" : "updateInstalled", { version: "0.1.1" })
                                     : page.osState === "none" ? I18n.t("latest") : I18n.t("updateFailed")
                            }
                            VProgress {
                                size: "lg"
                                indeterminate: page.steamState === "waiting" || (App.real && page.steamState === "updating")
                                value: page.steamState === "done" ? 1 : page.steamProgress
                                tone: page.steamState === "done" ? "good" : "accent"
                                showValue: !App.real
                                label: page.steamState === "waiting" ? I18n.t("steamWaitingUpdate") : page.steamState === "updating" ? I18n.t("updatingSteam")
                                     : page.steamState === "missing" ? I18n.t("steamMissing") : I18n.t("steamUpToDate")
                            }
                        }
                    }

                    // 5. Sign in: Steam, a Vanta account, or later. Either or both can be linked.
                    VListItem {
                        id: steamRow
                        visible: page.stepId === "account" && page.accountView === "choose"
                        label: I18n.t("signInSteam")
                        detail: page.accounts.steam ? I18n.t("signedInAs", { name: page.accounts.steam.persona }) : I18n.t("steamOptionDetail")
                        chevron: !page.accounts.steam
                        check: !!page.accounts.steam
                        selected: !!page.accounts.steam
                        onActivated: if (!page.accounts.steam) { page.accountView = "steam" }
                    }
                    VListItem {
                        visible: page.stepId === "account" && page.accountView === "choose"
                        label: I18n.t("vantaAccount")
                        detail: page.accounts.vanta ? page.accounts.vanta.email : I18n.t("vantaOptionDetail")
                        chevron: !page.accounts.vanta
                        check: !!page.accounts.vanta
                        selected: !!page.accounts.vanta
                        onActivated: if (!page.accounts.vanta) { page.accountView = "vanta" }
                    }
                    Loader {
                        width: parent.width
                        active: page.stepId === "account" && page.accountView === "steam"
                        sourceComponent: SteamSignIn {
                            onDone: account => {
                                page.accounts = Object.assign({}, page.accounts, { steam: account })
                                // Steam's name and picture become the profile defaults; both can still be changed.
                                page.draft = Object.assign({}, page.draft, { name: page.draft.name || account.persona, photo: page.draft.photo || account.avatar || "", fromSteam: true })
                                page.accountView = "choose"
                                page.focusFirst()
                            }
                        }
                    }
                    Loader {
                        width: parent.width
                        active: page.stepId === "account" && page.accountView === "vanta"
                        onLoaded: page.focusFirst()
                        sourceComponent: VantaSignIn {
                            onDone: account => {
                                page.accounts = Object.assign({}, page.accounts, { vanta: account })
                                page.accountView = "choose"
                                page.focusFirst()
                            }
                        }
                    }

                    // 6. Controller: the card shows the controller's own buttons and reacts to presses.
                    Rectangle {
                        id: padCard
                        visible: page.stepId === "controller"
                        width: parent.width
                        height: visible ? padCol.height + 2 * Theme.s5 : 0
                        radius: Theme.rLg
                        color: Theme.panel
                        border.width: 1
                        border.color: Theme.line
                        Column {
                            id: padCol
                            x: Theme.s5
                            y: Theme.s5
                            width: parent.width - 2 * Theme.s5
                            spacing: Theme.s4
                            Icon { name: "gamepad"; size: 1.6 * Theme.rem; color: Theme.fg3 }
                            VText {
                                width: parent.width
                                text: App.pads && App.pads.names ? App.pads.names.split(", ")[0] : I18n.t("builtIn")
                                size: Theme.tLg
                                weight: Font.DemiBold
                                color: Theme.fg
                                wrapMode: Text.Wrap
                            }
                            Flow {
                                width: parent.width
                                spacing: Theme.s3
                                Repeater {
                                    model: ["accept", "back", "options", "prevTab", "nextTab", "qam", "mainMenu"]
                                    Glyph { required property string modelData; action: modelData; glyphHeight: 2 * Theme.rem }
                                }
                            }
                        }
                        SequentialAnimation on scale {
                            id: padPress
                            running: false
                            NumberAnimation { to: 0.97; duration: 60 }
                            NumberAnimation { to: 1; duration: 140; easing.type: Easing.OutCubic }
                        }
                        Connections {
                            target: App.pads
                            enabled: page.stepId === "controller"
                            function onAction() { padPress.restart() }
                        }
                    }
                    Item { width: 1; height: page.stepId === "controller" ? Theme.s2 : 0 }
                    VListItem {
                        visible: page.stepId === "controller"
                        label: I18n.t("testHaptics")
                        icon: "vibrate"
                        chevron: true
                        onActivated: Haptics.play("test", { force: true })
                    }

                    // 7. Profile
                    Item {
                        visible: page.stepId === "profile"
                        width: parent.width
                        height: visible ? 5 * Theme.rem + Theme.s3 : 0
                        Avatar {
                            x: Theme.s4
                            size: 5 * Theme.rem
                            profile: ({ name: page.draft.name || I18n.t("defaultName"), color: page.draft.color, photo: page.draft.photo })
                        }
                    }
                    Row {
                        visible: page.stepId === "profile" && page.draft.fromSteam
                        x: Theme.s4
                        spacing: Theme.s2
                        bottomPadding: Theme.s2
                        Icon { name: "cloud_download"; color: Theme.fg3 }
                        VText { text: I18n.t("importedFromSteam"); size: Theme.tSm; color: Theme.fg3; anchors.verticalCenter: parent.verticalCenter }
                    }
                    VTextField {
                        visible: page.stepId === "profile"
                        label: I18n.t("name")
                        value: page.draft.name
                        placeholder: I18n.t("defaultName")
                        onEdited: t => page.draft = Object.assign({}, page.draft, { name: t })
                    }
                    VText {
                        visible: page.stepId === "profile"
                        x: Theme.s4
                        topPadding: Theme.s4
                        bottomPadding: Theme.s1
                        text: I18n.t("picture").toUpperCase()
                        size: Theme.tXs
                        weight: Font.DemiBold
                        color: Theme.fg3
                        font.letterSpacing: 0.06 * Theme.tXs
                    }
                    PictureChooser {
                        visible: page.stepId === "profile"
                        draft: page.draft
                        onChanged: page.draft = Object.assign({}, page.draft, { color: draft.color, photo: draft.photo })
                    }

                    // 8. Done
                    Column {
                        visible: page.stepId === "done"
                        width: parent.width
                        topPadding: Theme.s2
                        bottomPadding: Theme.s2
                        spacing: Theme.s4
                        Avatar {
                            size: Math.max(6 * Theme.rem, Math.min(9 * Theme.rem, Theme.width * 0.12))
                            profile: ({ name: page.draft.name || I18n.t("defaultName"), color: page.draft.color, photo: page.draft.photo })
                        }
                        VText { text: page.draft.name || I18n.t("defaultName"); size: Theme.tXl; weight: Font.DemiBold; color: Theme.fg }
                        Repeater {
                            model: [page.accounts.steam ? "Steam · " + page.accounts.steam.persona : "",
                                    page.accounts.vanta ? I18n.t("vantaAccount") + " · " + page.accounts.vanta.email : ""].filter(x => x)
                            Row {
                                required property string modelData
                                spacing: Theme.s2
                                Icon { name: "check"; size: 1.1 * Theme.rem; color: Theme.accentHi; anchors.verticalCenter: parent.verticalCenter }
                                VText { text: modelData; size: Theme.tSm; color: Theme.fg3; anchors.verticalCenter: parent.verticalCenter }
                            }
                        }
                    }

                    // Actions under each step
                    Item { width: 1; height: Theme.s5; visible: actions.visible }
                    Flow {
                        id: actions
                        readonly property bool focusGroup: true
                        visible: ["network", "updates", "controller", "profile", "done"].indexOf(page.stepId) >= 0 || (page.stepId === "account" && page.accountView === "choose")
                        width: parent.width
                        spacing: Theme.s3
                        VButton {
                            visible: page.stepId === "network"
                            label: I18n.t("later")
                            variant: "ghost"
                            onActivated: if (!page.busy) page.go(page.step + 1)
                        }
                        VButton {
                            id: updatesNext
                            visible: page.stepId === "updates"
                            label: I18n.t("continue")
                            variant: "primary"
                            disabled: page.busy
                            onActivated: page.go(page.step + 1)
                        }
                        VButton {
                            visible: page.stepId === "account"
                            readonly property bool linked: !!page.accounts.steam || !!page.accounts.vanta
                            label: linked ? I18n.t("continue") : I18n.t("later")
                            variant: linked ? "primary" : "ghost"
                            onActivated: page.go(page.step + 1)
                        }
                        VButton {
                            visible: page.stepId === "controller" || page.stepId === "profile"
                            label: I18n.t("continue")
                            variant: "primary"
                            onActivated: page.go(page.step + 1)
                        }
                        VButton {
                            visible: page.stepId === "done"
                            label: I18n.t("getStarted")
                            variant: "primary"
                            size: "lg"
                            onActivated: page.finishSetup()
                        }
                    }
                }
            }
        }
    }

    NumberAnimation { id: slide; target: slideX; property: "x"; to: 0; duration: Theme.tSlow; easing.type: Easing.BezierSpline; easing.bezierCurve: Theme.easeOut }

    onAccountViewChanged: focusFirst()
    onStepIdChanged: {
        if (stepId === "network") System.scan()
        if (stepId === "updates") startUpdates()
    }
    Component.onCompleted: if (stepId === "network") System.scan()
}
