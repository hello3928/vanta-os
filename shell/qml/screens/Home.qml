// Home: hero art for the selected game, Recent games, widgets,
// Recently added and Emulation. The selected game's trailer becomes the music and, after a
// moment, the moving background. X opens the trailer full screen: the hero's clip opens to the
// whole screen, so the art and video never move, rescale or restart.
import QtQuick
import QtMultimedia
import dev.vanta.shell

Screen {
    id: home

    property var game: null
    property bool expanded: false
    // What the tour points at.
    property alias tourRecent: recentRow
    property alias tourWidgets: widgets
    readonly property var recent: { Games.revision; return Games.recent() }
    readonly property var added: { Games.revision; return Games.recentlyAdded() }
    readonly property var emu: { Games.revision; return Games.emulated() }

    shell: ({
        title: "",
        hints: [["accept", I18n.t("open")]].concat(Games.all.length ? [["options", I18n.t("trailer")]] : [])
               .concat([["qam", I18n.t("quickAccess")], ["mainMenu", I18n.t("menu")]])
    })

    function enter() {
        const last = App.lastGame
        let tile = null
        for (let i = 0; i < recentRep.count; i++) if (last && recentRep.itemAt(i).game.id === last.id) tile = recentRep.itemAt(i)
        tile = tile || recentRep.itemAt(0)
        if (tile) {
            Nav.focus(tile, true)
            render(tile.game, true)
        }
        Music.attach(video, game)
    }

    // Wait for the selection to settle before swapping the hero, so fast scrolling stays calm.
    function show(g) {
        pending.game = g
        pending.restart()
    }
    Timer {
        id: pending
        property var game: null
        interval: 120
        onTriggered: home.render(game, false)
    }

    // Store details (the trailer) for a game that had none yet: play it once it's here.
    Connections {
        target: Games
        function onStoreLoaded(appid) {
            if (!home.game || home.game.appid !== appid) return
            home.game = Games.byId(home.game.id)
            Music.select(home.game)
        }
    }

    function render(g, instant) {
        if (!g || (game && g.id === game.id)) return
        game = g
        Games.wantStore(g)
        if (!instant) Music.select(g)
        hero.show(g)
        if (instant) {
            intro.apply(g)
            return
        }
        swap.target = g
        swap.restart()
    }

    function onOptions() { expand() }
    function onTab(d) { if (d > 0 && !expanded) App.go("library") }
    function onBack() {
        if (expanded) {
            collapse(true)
            return true
        }
        return false
    }

    function expand() {
        if (expanded) return
        if (!game || !game.trailer) {
            nudge.restart()
            return
        }
        scroll.scrollTo(null, 0)
        expanded = true
        App.shellHidden = true
        Music.expanded = true
        Music.select(game, !Music.playing)
        Sound.play("open")
        Haptics.play("select")
        Nav.pushScope(player, { onBack: () => home.collapse(true), initial: playButton })
    }

    function collapse(silent) {
        if (!expanded) return
        expanded = false
        Nav.popScope(player)
        if (!silent) {
            Sound.play("close")
            Haptics.play("back")
        }
        App.shellHidden = false
        Music.expanded = false
    }

    function badgeFor(g) {
        if (App.running && App.running.id === g.id) return { text: I18n.t("running"), tone: "accent", icon: "play" }
        if (g.source === "emu") return { text: g.system.toUpperCase() }
        if (!g.installed) return { text: I18n.t("notInstalled"), icon: "download" }
        return null
    }

    VScroll {
        id: scroll
        anchors.fill: parent
        pageScroll: true
        interactive: !home.expanded
        contentHeight: content.y + content.height + Theme.hintH + Theme.s5
        onContentYChanged: App.shellScrolled = contentY > 4

        // The hero is always full screen height and shown through a clip.
        Item {
            id: heroClip
            width: home.width
            height: home.expanded ? home.height : Theme.heroH
            clip: true
            z: home.expanded ? 3 : 0
            Behavior on height { NumberAnimation { duration: Theme.tSlow; easing.type: Easing.BezierSpline; easing.bezierCurve: Theme.easeOut } }

            Item {
                id: hero
                width: home.width
                height: home.height
                property bool flip: false
                function show(g) {
                    const next = flip ? layerA : layerB
                    if (next.game && next.game.id === g.id) return
                    next.game = g
                }
                HeroArt {
                    id: layerA
                    anchors.fill: parent
                    opacity: hero.flip ? 0 : 1
                    onReadyChanged: if (ready && hero.flip && game) hero.flip = false
                    Behavior on opacity { NumberAnimation { duration: 450; easing.type: Easing.BezierSpline; easing.bezierCurve: Theme.easeInOut } }
                }
                HeroArt {
                    id: layerB
                    anchors.fill: parent
                    opacity: hero.flip ? 1 : 0
                    onReadyChanged: if (ready && !hero.flip && game) hero.flip = true
                    Behavior on opacity { NumberAnimation { duration: 450; easing.type: Easing.BezierSpline; easing.bezierCurve: Theme.easeInOut } }
                }
                VideoOutput {
                    id: video
                    anchors.fill: parent
                    fillMode: VideoOutput.PreserveAspectCrop
                    opacity: Music.visible && home.game && Music.game && Music.game.id === home.game.id ? 1 : 0
                    Behavior on opacity { NumberAnimation { duration: opacity > 0 ? 360 : 900; easing.type: Easing.OutCubic } }
                }
            }

            // Shade: dark at the top for the bar, into the page colour at the bottom, and darker on
            // the left under the logo. It ends in solid page colour, so the clip always cuts
            // through solid colour.
            Item {
                anchors.fill: parent
                opacity: home.expanded ? 0 : 1
                Behavior on opacity { NumberAnimation { duration: Theme.tBase } }
                Rectangle {
                    id: shade
                    readonly property real solid: 1 - 16 / height
                    width: parent.width
                    height: Theme.heroH + 8
                    gradient: Gradient {
                        GradientStop { position: 0.0; color: Qt.rgba(26 / 255, 29 / 255, 35 / 255, 0.5) }
                        GradientStop { position: 0.18; color: "transparent" }
                        GradientStop { position: 0.35; color: "transparent" }
                        GradientStop { position: 0.70; color: Qt.rgba(26 / 255, 29 / 255, 35 / 255, 0.6) }
                        GradientStop { position: Math.max(0.71, shade.solid); color: Theme.bg }
                        GradientStop { position: 1.0; color: Theme.bg }
                    }
                }
                Rectangle {
                    width: parent.width
                    height: Theme.heroH
                    gradient: Gradient {
                        orientation: Gradient.Horizontal
                        GradientStop { position: 0.0; color: Qt.rgba(26 / 255, 29 / 255, 35 / 255, 0.65) }
                        GradientStop { position: 0.55; color: "transparent" }
                    }
                }
            }

            // Full-screen trailer: logo, Play, progress, prompts.
            Item {
                id: player
                anchors.fill: parent
                opacity: home.expanded ? 1 : 0
                visible: opacity > 0
                transform: Translate { y: home.expanded ? 0 : 12; Behavior on y { NumberAnimation { duration: Theme.tSlow; easing.type: Easing.OutCubic } } }
                Behavior on opacity { NumberAnimation { duration: home.expanded ? Theme.tSlow : Theme.tFast } }
                Rectangle {
                    anchors.fill: parent
                    gradient: Gradient {
                        GradientStop { position: 0.6; color: "transparent" }
                        GradientStop { position: 1.0; color: Qt.rgba(0, 0, 0, 0.75) }
                    }
                }
                Column {
                    x: Theme.gutter
                    width: parent.width - 2 * Theme.gutter
                    anchors.bottom: parent.bottom
                    anchors.bottomMargin: Theme.hintH + Theme.s5
                    spacing: Theme.s4
                    GameLogo {
                        game: home.game
                        width: Math.min(22 * Theme.rem, parent.width * 0.6)
                        height: 6 * Theme.rem
                        shadow: 0.6
                    }
                    VButton {
                        id: playButton
                        label: home.game && !home.game.installed ? I18n.t("install") : I18n.t("play")
                        icon: home.game && !home.game.installed ? "download" : "play"
                        variant: home.game && !home.game.installed ? "primary" : "play"
                        size: "lg"
                        activateSound: ""
                        onActivated: {
                            const g = home.game
                            home.collapse(true)
                            App.launch(g)
                        }
                        onEdge: dir => { if (dir === "down") home.collapse() }
                    }
                    Rectangle {
                        width: parent.width
                        height: 3
                        radius: 2
                        color: Qt.rgba(1, 1, 1, 0.18)
                        Rectangle {
                            width: parent.width * Music.progress
                            height: parent.height
                            radius: 2
                            color: "#ffffff"
                        }
                    }
                }
                VHintBar {
                    anchors { left: parent.left; right: parent.right; bottom: parent.bottom }
                    plain: true
                    hints: [["accept", home.game && !home.game.installed ? I18n.t("install") : I18n.t("play")], ["back", I18n.t("back")]]
                }
            }
        }

        Column {
            id: content
            width: home.width
            y: Theme.barH
            opacity: home.expanded ? 0 : 1
            enabled: !home.expanded
            Behavior on opacity { NumberAnimation { duration: Theme.tBase } }
            transform: Translate { id: bounce }

            // Logo and details, swapped with a quick fade.
            Item {
                id: intro
                width: parent.width
                height: Math.max(Theme.heroH - Theme.barH - 12.5 * Theme.rem, introCol.height + Theme.s4 + Theme.s2)
                function apply(g) {
                    logo.game = g
                    const running = App.running && App.running.id === g.id
                    const days = I18n.daysSince(g.lastPlayed)
                    const parts = []
                    if (running) parts.push({ text: I18n.t("running"), live: true })
                    parts.push({ text: days === null ? I18n.t("notPlayed") : I18n.t("lastPlayedWhen", { when: I18n.relDays(days) }) })
                    if (g.minutes) parts.push({ text: I18n.t("hoursPlayed", { n: Math.round(g.minutes / 60) }) })
                    meta.model = parts
                }
                // No games yet: where they come from.
                Column {
                    visible: home.recent.length === 0
                    x: Theme.gutter
                    width: Math.min(34 * Theme.rem, parent.width - 2 * Theme.gutter)
                    anchors.bottom: parent.bottom
                    anchors.bottomMargin: Theme.s2
                    spacing: Theme.s3
                    VText { text: I18n.t("homeEmptyTitle"); size: Theme.tXl; weight: Font.DemiBold; color: Theme.fg }
                    VText { width: parent.width; text: I18n.t("homeEmptyBody"); color: Theme.fg2; wrapMode: Text.Wrap }
                    VButton {
                        visible: !(Profiles.current && Profiles.current.steam)
                        label: I18n.t("signInSteam")
                        variant: "primary"
                        onActivated: App.go("settings", { section: "accounts" })
                    }
                }
                Column {
                    id: introCol
                    visible: home.recent.length > 0
                    x: Theme.gutter
                    width: parent.width - 2 * Theme.gutter
                    anchors.bottom: parent.bottom
                    anchors.bottomMargin: Theme.s2
                    spacing: Theme.s3
                    GameLogo {
                        id: logo
                        width: Math.min(23 * Theme.rem, parent.width * 0.7)
                        height: 6.5 * Theme.rem
                    }
                    Row {
                        height: 1.3 * Theme.rem
                        spacing: Theme.s4
                        Repeater {
                            id: meta
                            Row {
                                required property var modelData
                                required property int index
                                spacing: Theme.s4
                                height: parent.height
                                Rectangle {
                                    visible: index > 0
                                    width: 4
                                    height: 4
                                    radius: 2
                                    color: Theme.fg3
                                    anchors.verticalCenter: parent.verticalCenter
                                }
                                VText {
                                    text: modelData.text
                                    size: Theme.tSm
                                    weight: Font.DemiBold
                                    color: modelData.live ? Theme.accentHi : Theme.fg2
                                    anchors.verticalCenter: parent.verticalCenter
                                }
                            }
                        }
                    }
                }
                SequentialAnimation {
                    id: swap
                    property var target: null
                    NumberAnimation { target: introCol; property: "opacity"; to: 0; duration: Theme.tInstant }
                    ScriptAction { script: intro.apply(swap.target) }
                    PauseAnimation { duration: 60 }
                    NumberAnimation { target: introCol; property: "opacity"; to: 1; duration: Theme.tBase; easing.type: Easing.OutCubic }
                }
            }

            Item { width: 1; height: Theme.s3 }
            VRow {
                id: recentRow
                title: I18n.t("recentGames")
                alignStart: true
                Repeater {
                    id: recentRep
                    model: home.recent
                    VTile {
                        required property var modelData
                        game: modelData
                        title: modelData.title
                        src: modelData.art.capsule || ""
                        fit: modelData.source === "emu" ? "box" : "cover"
                        badge: home.badgeFor(modelData)
                        scrollTop: true
                        onFocusIn: home.show(modelData)
                        onActivated: App.openGame(modelData)
                    }
                }
                VTile {
                    more: true
                    title: I18n.t("library")
                    glyph: "library"
                    scrollTop: true
                    onActivated: App.go("library")
                }
            }

            // Widgets, like the PS5's: play time, achievements, friends, downloads, storage.
            Item { width: 1; height: Theme.s3 }
            HomeWidgets { id: widgets }

            Item { width: 1; height: Theme.s3; visible: home.added.length > 0 }
            VRow {
                visible: home.added.length > 0
                title: I18n.t("recentlyAdded")
                Repeater {
                    model: home.added
                    VTile {
                        required property var modelData
                        shape: "card"
                        game: modelData
                        title: modelData.title
                        src: modelData.art.header || ""
                        kicker: I18n.t("addedWhen", { when: I18n.relDays(I18n.daysSince(modelData.added)) })
                        onFocusIn: home.show(modelData)
                        onActivated: App.openGame(modelData)
                    }
                }
            }

            Item { width: 1; height: Theme.s3; visible: home.emu.length > 0 }
            VRow {
                visible: home.emu.length > 0
                title: I18n.t("emulation")
                Repeater {
                    model: home.emu
                    VTile {
                        required property var modelData
                        game: modelData
                        title: modelData.title
                        src: modelData.art.capsule || ""
                        fit: "box"
                        badge: home.badgeFor(modelData)
                        onFocusIn: home.show(modelData)
                        onActivated: App.openGame(modelData)
                    }
                }
            }
        }
    }

    // A small bounce when there's no trailer to expand (retro games).
    SequentialAnimation {
        id: nudge
        NumberAnimation { target: bounce; property: "y"; to: 12; duration: 180; easing.type: Easing.OutCubic }
        NumberAnimation { target: bounce; property: "y"; to: 0; duration: 180; easing.type: Easing.OutCubic }
    }
}
