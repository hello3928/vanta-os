// Game page (the mockup's screens/Game.js): hero with logo, the play bar, screenshots, then the
// game's performance profile beside plain details. The game's music keeps playing from Home.
// The profile is saved per game (Games.profile) for vantad to apply at launch.
import QtQuick
import QtMultimedia
import dev.vanta.shell

Screen {
    id: page

    readonly property var game: Games.byId(params.id)
    readonly property var sys: Games.systemOf(game)
    readonly property bool running: !!App.running && !!game && App.running.id === game.id
    readonly property real heroH: Math.min(0.56 * height, 33 * Theme.rem)
    readonly property var prof: { Games.profiles; return game ? Games.profile(game.id) : ({}) }
    readonly property var shots: game ? Games.screenshots(game, "thumb") : []

    shell: ({ title: game ? game.title : "", hints: [["accept", I18n.t("select")], ["options", I18n.t("properties")], ["back", I18n.t("back")]] })

    function enter() {
        Nav.focus(play, true)
        Games.wantStore(game)
        if (!running) Music.attach(video, game)
    }
    Connections {
        target: Games
        function onStoreLoaded(appid) { if (page.game && page.game.appid === appid && !page.running) Music.attach(video, page.game) }
    }
    function onOptions() { properties() }
    function properties() { App.open("properties", { game: game }) }
    function set(key, value) { Games.setProfile(game.id, key, value) }

    function runtimeLabel() {
        const r = System.runtimeOf(game)
        if (r === "emulator") return sys ? sys.emulator : ""
        return r === "native" ? I18n.t("runtimeNative") : "Proton"
    }

    VScroll {
        id: scroll
        anchors.fill: parent
        pageScroll: true
        contentHeight: col.y + col.height + Theme.hintH + Theme.s5
        onContentYChanged: App.shellScrolled = contentY > 4

        Item {
            id: hero
            width: page.width
            height: page.heroH
            clip: true
            HeroArt { anchors.fill: parent; game: page.game }
            VideoOutput {
                id: video
                anchors.fill: parent
                fillMode: VideoOutput.PreserveAspectCrop
                opacity: Music.visible && page.game && Music.game && Music.game.id === page.game.id ? 1 : 0
                Behavior on opacity { NumberAnimation { duration: opacity > 0 ? 360 : 900 } }
            }
            Rectangle {
                anchors.fill: parent
                gradient: Gradient {
                    GradientStop { position: 0.0; color: Qt.rgba(26 / 255, 29 / 255, 35 / 255, 0.5) }
                    GradientStop { position: 0.25; color: "transparent" }
                    GradientStop { position: 0.45; color: "transparent" }
                    GradientStop { position: 1.0; color: Theme.bg }
                }
            }
            GameLogo {
                x: Theme.gutter
                anchors.bottom: parent.bottom
                anchors.bottomMargin: Theme.s6
                width: Math.min(25 * Theme.rem, parent.width * 0.62)
                height: 7.5 * Theme.rem
                game: page.game
            }
        }

        Column {
            id: col
            y: page.heroH
            width: page.width

            // Play bar
            Rectangle {
                width: parent.width
                height: barRow.height + 2 * Theme.s4
                color: Theme.bg2
                readonly property bool focusGroup: true
                Rectangle { width: parent.width; height: 1; color: Theme.line }
                Rectangle { width: parent.width; height: 1; color: Theme.line; anchors.bottom: parent.bottom }
                Row {
                    id: barRow
                    x: Theme.gutter
                    y: Theme.s4
                    width: parent.width - 2 * Theme.gutter
                    spacing: Theme.s6
                    VButton {
                        id: play
                        size: "lg"
                        scrollTop: true
                        label: page.running ? I18n.t("resume") : page.game && page.game.installed ? I18n.t("play") : I18n.t("install")
                        icon: page.running ? "resume" : page.game && page.game.installed ? "play" : "download"
                        variant: page.running || (page.game && page.game.installed) ? "play" : "primary"
                        activateSound: ""
                        onActivated: page.running ? App.resume() : App.launch(page.game)
                    }
                    Row {
                        spacing: Theme.s6
                        anchors.verticalCenter: parent.verticalCenter
                        width: parent.width - play.width - props.width - 2 * Theme.s6
                        component Stat: Column {
                            property string label
                            property string value
                            default property alias extra: valueRow.data
                            spacing: 0.15 * Theme.rem
                            VText { text: parent.label; size: Theme.tXs; weight: Font.DemiBold; color: Theme.fg3 }
                            Row {
                                id: valueRow
                                spacing: Theme.s3
                                VText { text: parent.parent.value; weight: Font.DemiBold; color: Theme.fg; anchors.verticalCenter: parent.verticalCenter }
                            }
                        }
                        Stat {
                            label: I18n.t("lastPlayed")
                            value: page.game && page.game.lastPlayed ? I18n.capitalize(I18n.relDays(I18n.daysSince(page.game.lastPlayed))) : I18n.t("never")
                        }
                        Stat {
                            label: I18n.t("playTime")
                            value: page.game && page.game.minutes ? I18n.t("hours", { n: Math.round(page.game.minutes / 60) }) : "—"
                        }
                        Stat {
                            visible: !!page.game && !!page.game.ach && page.game.ach[0] !== null
                            label: I18n.t("achievements")
                            value: visible ? page.game.ach[0] + "/" + page.game.ach[1] : ""
                            Rectangle {
                                width: 6 * Theme.rem
                                height: 4
                                radius: 2
                                color: Theme.track
                                anchors.verticalCenter: parent.verticalCenter
                                Rectangle {
                                    height: 4
                                    radius: 2
                                    color: Theme.accent
                                    width: page.game && page.game.ach && page.game.ach[0] !== null ? parent.width * page.game.ach[0] / page.game.ach[1] : 0
                                }
                            }
                        }
                        Stat {
                            visible: !!page.sys
                            label: I18n.t("emulator")
                            value: page.sys ? page.sys.emulator : ""
                        }
                    }
                    VButton {
                        id: props
                        icon: "sliders"
                        onActivated: page.properties()
                    }
                }
            }

            // Screenshots
            Item { width: 1; height: Theme.s5; visible: page.shots.length > 0 }
            VRow {
                visible: page.shots.length > 0
                title: I18n.t("screenshots")
                Repeater {
                    model: page.shots
                    VTile {
                        required property string modelData
                        required property int index
                        shape: "landscape"
                        src: modelData
                        title: page.game.title + " " + (index + 1)
                        onActivated: App.open("lightbox", { urls: Games.screenshots(page.game, "full"), index: index, title: page.game.title })
                    }
                }
            }

            // Profile beside details
            Item {
                width: parent.width
                height: Math.max(profile.height, side.height) + Theme.s5 + Theme.s6
                readonly property real colW: (width - 2 * Theme.gutter - Theme.s6)

                Column {
                    id: profile
                    readonly property bool focusGroup: true
                    x: Theme.gutter
                    y: Theme.s5
                    width: parent.colW * 1.6 / 2.6
                    spacing: Theme.s2
                    VText { text: I18n.t("perfProfile"); size: Theme.tLg; weight: Font.DemiBold; color: Theme.fg; bottomPadding: Theme.s1 }
                    PerfTdp {
                        value: page.prof.tdp !== undefined ? page.prof.tdp : Settings.tdp
                        onChanged: v => page.set("tdp", v)
                    }
                    VDropdown {
                        label: I18n.t("frameLimit")
                        options: System.frameOptions()
                        value: page.prof.fpsLimit && System.frameOptions().indexOf(page.prof.fpsLimit) >= 0 ? page.prof.fpsLimit : "Off"
                        onPicked: v => page.set("fpsLimit", v)
                    }
                    VDropdown {
                        visible: !!page.sys
                        label: I18n.t("internalRes")
                        options: ["Native", "2×", "3×", "4×"]
                        value: page.prof.internalRes || "2×"
                        onPicked: v => page.set("internalRes", v)
                    }
                    PerfUpscaling {
                        visible: !page.sys
                        game: page.game
                        value: page.prof.upscaling || Settings.upscaling
                        onPicked: v => page.set("upscaling", v)
                    }
                    RuntimeControl {
                        game: page.game
                        value: page.prof.runtime
                        onPicked: v => page.set("runtime", v)
                    }
                    VToggle {
                        label: I18n.t("perfOverlay")
                        value: !!page.prof.overlay
                        onChanged: on => page.set("overlay", on)
                    }
                }

                Item {
                    id: side
                    x: profile.x + profile.width + Theme.s6
                    y: Theme.s5
                    width: parent.width - x - Theme.gutter
                    height: sideCol.height
                    Rectangle { width: 1; height: parent.height; color: Theme.line }
                    Column {
                        id: sideCol
                        x: Theme.s5
                        width: parent.width - Theme.s5
                        spacing: Theme.s5
                        Column {
                            width: parent.width
                            spacing: Theme.s2
                            VText { text: I18n.t("compatibility"); size: Theme.tLg; weight: Font.DemiBold; color: Theme.fg; bottomPadding: Theme.s1 }
                            VBadge {
                                readonly property var bios: page.sys ? Games.biosLabel[Games.biosStatus(page.sys)] : null
                                text: bios ? I18n.t(bios.key) : Games.sample ? I18n.t("verified") : page.runtimeLabel()
                                tone: bios ? bios.tone : "good"
                                icon: bios ? "" : "check"
                            }
                            VText {
                                width: Math.min(parent.width, 44 * Theme.tSm * 0.55)
                                text: page.sys ? I18n.t("emuNote", { emu: page.sys.emulator }) : Games.sample ? I18n.t("verifiedNote") : ""
                                visible: text !== ""
                                size: Theme.tSm
                                color: Theme.fg3
                                wrapMode: Text.Wrap
                            }
                        }
                        Column {
                            width: parent.width
                            spacing: Theme.s2
                            VText { text: I18n.t("details"); size: Theme.tLg; weight: Font.DemiBold; color: Theme.fg; bottomPadding: Theme.s1 }
                            Grid {
                                columns: 2
                                columnSpacing: Theme.s5
                                rowSpacing: Theme.s2
                                Repeater {
                                    model: {
                                        const g = page.game
                                        if (!g) return []
                                        const rows = []
                                        if (g.genre) rows.push([I18n.t("genre"), g.genre])
                                        rows.push([I18n.t("source"), page.sys ? page.sys.name : "Steam"])
                                        rows.push([I18n.t("runsWith"), page.runtimeLabel()])
                                        const ups = System.gameUpscalers(g)
                                        if (ups.length) rows.push([I18n.t("gameUpscalers"), ups.map(u => u.works ? u.name : u.name + " (" + I18n.t("needsNvidia") + ")").join(", ")])
                                        if (g.size) rows.push([I18n.t("size"), g.size])
                                        return [].concat.apply([], rows)
                                    }
                                    VText {
                                        required property string modelData
                                        required property int index
                                        text: modelData
                                        size: Theme.tSm
                                        weight: index % 2 ? Font.DemiBold : Font.Normal
                                        color: index % 2 ? Theme.fg2 : Theme.fg3
                                        width: index % 2 ? sideCol.width * 0.6 : implicitWidth
                                        wrapMode: Text.Wrap
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
