// The shell window: one page at a time under a
// shared top bar and hint bar, an overlay layer for panels and dialogs, and toasts.
// Input: the keyboard here and controllers in gamepad.rs both become console actions that
// App.handle() routes (up/down/left/right, accept, back, options, qam, mainMenu, tabs, home, power).
import QtQuick
import QtQuick.Window
import QtQuick.Shapes
import dev.vanta.shell

Window {
    id: window

    width: 1280
    height: 800
    visible: true
    visibility: Qt.platform.os === "linux" && Qt.application.arguments.indexOf("--window") < 0 && !App.sys.screenshotPath ? Window.FullScreen : Window.Windowed
    color: Theme.bg
    title: App.sys.osName
    // In the Vanta session nothing closes the shell (the compositor's close request included).
    onClosing: close => { if (App.real) close.accepted = false }

    FontLoader { source: "file://" + App.sys.dataDir + "/fonts/Figtree.ttf" }

    // Root font size: clamp(13px, 0.5vw + 9.5px, 20px), 8% larger on handhelds, times the
    // player's UI scale (Settings > Display).
    function scaleType() {
        Theme.width = width
        Theme.height = height
        Theme.rem = Math.max(13, Math.min(20, width * 0.005 + 9.5)) * (System.handheld ? 1.08 : 1) * (Settings.uiScale || 100) / 100
    }
    onWidthChanged: scaleType()
    Connections { target: System; function onHandheldChanged() { window.scaleType() } }
    Connections { target: Settings; function onUiScaleChanged() { window.scaleType() } }
    onHeightChanged: scaleType()

    Gamepads {
        id: pads
        onAction: (name, repeat) => {
            Nav.device = "gamepad"
            App.handle(name, repeat)
        }
        onPadConnected: (name, family) => {
            App.toast(I18n.t("controllerConnected", { name: name || "Gamepad" }), { icon: "gamepad" })
            Notifications.add(I18n.t("controllerConnected", { name: name || "Gamepad" }), "", "gamepad")
        }
        onPadDisconnected: name => App.toast(I18n.t("controllerDisconnected"), { icon: "gamepad", tone: "bad" })
    }

    Item {
        id: root
        anchors.fill: parent
        focus: true

        readonly property var keyActions: ({
            [Qt.Key_Up]: "up", [Qt.Key_Down]: "down", [Qt.Key_Left]: "left", [Qt.Key_Right]: "right",
            [Qt.Key_Return]: "accept", [Qt.Key_Enter]: "accept", [Qt.Key_Space]: "accept",
            [Qt.Key_Escape]: "back", [Qt.Key_Backspace]: "back", [Qt.Key_X]: "options", [Qt.Key_Q]: "qam",
            [Qt.Key_M]: "mainMenu", [Qt.Key_BracketLeft]: "prevTab", [Qt.Key_BracketRight]: "nextTab",
            [Qt.Key_PageUp]: "prevTab", [Qt.Key_PageDown]: "nextTab", [Qt.Key_H]: "home", [Qt.Key_P]: "power"
        })

        Keys.onPressed: event => {
            event.accepted = true
            if (App.sleeping) { App.sleeping(); return }
            const top = App.top()
            if (top && top.handleKey && top.handleKey(event)) {
                Nav.device = "keyboard"
                return
            }
            if (event.modifiers & (Qt.ControlModifier | Qt.AltModifier | Qt.MetaModifier)) return
            const action = keyActions[event.key]
            if (!action) return
            Nav.device = "keyboard"
            App.handle(action, event.isAutoRepeat)
        }

        // The mouse takes over focus only after it really moves (40 px), so a resting cursor never
        // steals focus from the controller or keyboard.
        HoverHandler {
            property point last: Qt.point(-1, -1)
            property real travel: 0
            onPointChanged: {
                const p = point.position
                if (last.x >= 0) travel += Math.abs(p.x - last.x) + Math.abs(p.y - last.y)
                last = p
                if (travel > 40 && Nav.device !== "pointer") {
                    travel = 0
                    Nav.device = "pointer"
                }
            }
        }
        PointHandler {
            acceptedDevices: PointerDevice.TouchScreen
            onActiveChanged: if (active) Nav.device = "touch"
        }

        // Background: the page colour with a faint lift in the top-left corner.
        Rectangle { anchors.fill: parent; color: Theme.bg }
        Shape {
            width: parent.width * 0.8 * 2
            height: parent.height * 0.6 * 2
            x: -width / 2
            y: -height / 2
            ShapePath {
                strokeColor: "transparent"
                fillGradient: RadialGradient {
                    centerX: window.width * 0.8; centerY: window.height * 0.6
                    centerRadius: window.width * 0.8
                    focalX: centerX; focalY: centerY
                    GradientStop { position: 0; color: "#1a212b" }
                    GradientStop { position: 0.65; color: "transparent" }
                }
                PathRectangle { width: window.width * 0.8 * 2; height: window.height * 0.6 * 2 }
            }
            transform: Scale { yScale: 0.75; origin.y: window.height * 0.6 }
        }

        Item {
            id: stage
            anchors.fill: parent
        }

        // Development: the "game" is its hero art, full screen,. In the Vanta
        // session the game's own window covers the shell.
        Item {
            anchors.fill: parent
            z: 15
            visible: App.inGame && Games.sample && !!App.running
            Rectangle { anchors.fill: parent; color: "#000000" }
            HeroArt { anchors.fill: parent; game: App.running }
            Rectangle {
                x: Theme.gutter
                anchors.bottom: parent.bottom
                anchors.bottomMargin: Theme.s5
                width: hintRow.width + 1.6 * Theme.rem
                height: hintRow.height + Theme.rem
                radius: Theme.rMd
                color: Qt.rgba(26 / 255, 29 / 255, 35 / 255, 0.8)
                Row {
                    id: hintRow
                    anchors.centerIn: parent
                    spacing: Theme.s2
                    Glyph { action: "mainMenu"; glyphHeight: 1.5 * Theme.tSm; anchors.verticalCenter: parent.verticalCenter }
                    VText { text: I18n.t("vantaMenu"); size: Theme.tSm; weight: Font.DemiBold; anchors.verticalCenter: parent.verticalCenter }
                }
            }
        }

        // The shell: one top bar and one hint bar for the whole app.
        Item {
            id: shell
            anchors.fill: parent
            z: 10
            opacity: App.shellHidden ? 0 : 1
            enabled: !App.shellHidden
            Behavior on opacity { NumberAnimation { duration: Theme.tBase } }

            VTopBar {
                id: topBar
                anchors { left: parent.left; right: parent.right; top: parent.top }
                title: App.shellTitle
                scrolled: App.shellScrolled
                strip: App.shellStrip
                opacity: App.topbarShown ? 1 : 0
                visible: opacity > 0
                Behavior on opacity { NumberAnimation { duration: Theme.tBase } }
            }
            VHintBar {
                anchors { left: parent.left; right: parent.right; bottom: parent.bottom }
                hints: App.shellHints
                opacity: App.hintbarShown ? 1 : 0
                visible: opacity > 0
                Behavior on opacity { NumberAnimation { duration: Theme.tBase } }
            }
        }

        Item {
            id: layer
            anchors.fill: parent
            z: 20
        }

        Toasts {
            id: toasts
            z: 40
            anchors { right: parent.right; rightMargin: Theme.gutter; bottom: parent.bottom; bottomMargin: Theme.hintH + Theme.s3 }
        }

        // Screen brightness where there's no backlight to set: a black layer over everything.
        Rectangle {
            anchors.fill: parent
            z: 100
            color: "#000000"
            opacity: System.backlight ? 0 : (100 - Settings.brightness) / 100 * 0.75
            Behavior on opacity { NumberAnimation { duration: Theme.tFast } }
        }
    }

    Component { id: homeScreen; Home {} }
    Component { id: libraryScreen; LibraryPage {} }
    Component { id: gameScreen; Game {} }
    Component { id: settingsScreen; SettingsPage {} }
    Component { id: usersScreen; Users {} }
    Component { id: setupScreen; Setup {} }

    Component { id: dialogOverlay; VDialog {} }
    Component { id: menuOverlay; DropdownMenu {} }
    Component { id: keyboardOverlay; Keyboard {} }
    Component { id: mainMenuOverlay; MainMenu {} }
    Component { id: quickAccessOverlay; QuickAccess {} }
    Component { id: launchOverlay; Launch {} }
    Component { id: blackOverlay; Black {} }
    Component { id: welcomeOverlay; Welcome {} }
    Component { id: tourOverlay; Tour {} }
    Component { id: lightboxOverlay; Lightbox {} }
    Component { id: profileOverlay; ProfileEditor {} }
    Component { id: photosOverlay; PhotoPicker {} }
    Component { id: cropOverlay; PhotoCrop {} }
    Component { id: signInOverlay; SignInPanel {} }
    Component { id: propertiesOverlay; GameProperties {} }
    Component { id: downloadsOverlay; Downloads {} }
    Component { id: storageOverlay; StoragePanel {} }
    Component { id: updateOverlay; Update {} }

    // VANTA_SCREENSHOT=/path.png: save one frame once art has had time to load, then quit.
    // VANTA_PAGE=home|library|settings|...: start there (development).
    Timer {
        running: App.sys.screenshotPath !== ""
        interval: parseInt(App.sys.env("VANTA_SHOT_DELAY")) || 5000
        onTriggered: window.contentItem.grabToImage(r => {
            r.saveToFile(App.sys.screenshotPath)
            Qt.quit()
        })
    }

    Component.onCompleted: {
        scaleType()
        System.displayW = Screen.width * Screen.devicePixelRatio
        System.displayH = Screen.height * Screen.devicePixelRatio
        System.refresh = Math.round(Screen.refreshRate) || 60
        App.stage = stage
        App.layer = layer
        App.toasts = toasts
        App.topBar = topBar
        App.pads = pads
        App.screens = { home: homeScreen, library: libraryScreen, game: gameScreen, settings: settingsScreen, users: usersScreen, setup: setupScreen }
        App.overlayKinds = {
            dialog: dialogOverlay, menu: menuOverlay, keyboard: keyboardOverlay, mainMenu: mainMenuOverlay,
            quickAccess: quickAccessOverlay, launch: launchOverlay, black: blackOverlay, welcome: welcomeOverlay,
            tour: tourOverlay, lightbox: lightboxOverlay, profile: profileOverlay, photos: photosOverlay,
            crop: cropOverlay, signIn: signInOverlay, properties: propertiesOverlay,
            downloads: downloadsOverlay, storage: storageOverlay, update: updateOverlay
        }
        pads.start()
        const page = App.sys.env("VANTA_PAGE")
        const pageParams = page === "game" ? { id: App.sys.env("VANTA_GAME") || Games.all[0].id }
            : page === "setup" ? { step: parseInt(App.sys.env("VANTA_STEP")) || 0 } : {}
        if (page && page in App.screens) App.go(page, pageParams, { replace: true })
        else if (!Settings.setupDone || !Profiles.list.length) App.go("setup", {}, { replace: true })
        else App.go("users", {}, { replace: true })
        const overlay = App.sys.env("VANTA_OVERLAY")
        if (overlay) App.later(300, () => App.open(overlay, {}))
        // VANTA_KEYS="down down accept wait:800 back": console actions played in order (testing).
        // VANTA_PAD=ps|xbox|nintendo|deck shows that controller's prompts.
        const pad = App.sys.env("VANTA_PAD")
        if (pad) App.later(0, () => { Nav.device = "gamepad"; Settings.glyphs = { ps: "PlayStation", xbox: "Xbox", nintendo: "Nintendo", deck: "Steam Deck" }[pad] || "Automatic" })
        let at = 600
        for (const step of App.sys.env("VANTA_KEYS").split(/\s+/).filter(s => s)) {
            if (step.indexOf("wait:") === 0) { at += parseInt(step.slice(5)); continue }
            App.later(at, () => App.handle(step, false))
            at += 350
        }
    }
}
