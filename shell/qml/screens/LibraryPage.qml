// Library: tabs (All games, Installed, Steam, Emulation) over
// a grid of capsules. Emulation adds a row of system filters. LB/RB switch tabs.
import QtQuick
import dev.vanta.shell

Screen {
    id: lib

    property string filter: params.filter || "all"
    property string system: "all"
    readonly property var games: {
        Games.revision
        const f = filter
        return Games.all.filter(g => {
            if (f === "installed") return g.installed
            if (f === "steam") return g.source === "steam"
            if (f === "emu") return g.source === "emu" && (system === "all" || g.system === system)
            return true
        }).sort((a, b) => a.title.localeCompare(b.title))
    }
    readonly property var systemsWithGames: { Games.revision; return Games.systems.filter(s => Games.all.some(g => g.system === s.id)) }

    shell: ({ title: I18n.t("library"), hints: [["accept", I18n.t("open")], ["tabs", I18n.t("switchTab")], ["back", I18n.t("back")]] })

    function enter() {
        let first = null
        for (let i = 0; i < grid.count; i++) {
            const t = grid.itemAt(i)
            if (App.lastGame && t.game.id === App.lastGame.id) first = t
        }
        Nav.focus(first || grid.itemAt(0) || tabs.activeTab, true)
    }

    function onTab(d) { tabs.step(d) }

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
        contentHeight: col.height + Theme.hintH + Theme.s5
        onContentYChanged: App.shellScrolled = contentY > 4

        Column {
            id: col
            width: lib.width
            y: Theme.barH

            Item {
                width: parent.width
                height: tabs.height + Theme.s2 + Theme.s3
                VTabs {
                    id: tabs
                    x: Theme.gutter
                    y: Theme.s2
                    bumpers: true
                    model: [
                        { id: "all", label: I18n.t("allGames") }, { id: "installed", label: I18n.t("installed") },
                        { id: "steam", label: I18n.t("steam") }, { id: "emu", label: I18n.t("emulation") }
                    ]
                    value: lib.filter
                    onChanged: id => {
                        lib.filter = id
                        App.later(0, () => { if (!Nav.current || !Nav.usable(Nav.current)) lib.enter() })
                    }
                }
                VText {
                    anchors { right: parent.right; rightMargin: Theme.gutter; verticalCenter: tabs.verticalCenter }
                    text: I18n.t("gamesCount", { n: lib.games.length })
                    size: Theme.tSm
                    weight: Font.DemiBold
                    color: Theme.fg3
                }
                Rectangle { anchors { left: parent.left; right: parent.right; bottom: parent.bottom } height: 1; color: Theme.line }
            }

            Item {
                visible: lib.filter === "emu"
                width: parent.width
                height: visible ? chips.height + Theme.s4 : 0
                VTabs {
                    id: chips
                    x: Theme.gutter
                    y: Theme.s4
                    variant: "chips"
                    model: [{ id: "all", label: I18n.t("allSystems") }].concat(lib.systemsWithGames.map(s => ({ id: s.id, label: s.name })))
                    value: lib.system
                    onChanged: id => lib.system = id
                }
            }

            Item {
                visible: lib.games.length === 0
                width: parent.width
                height: visible ? empty.height + Theme.s6 : 0
                Column {
                    id: empty
                    x: Theme.gutter
                    y: Theme.s6
                    width: Math.min(34 * Theme.rem, parent.width - 2 * Theme.gutter)
                    spacing: Theme.s2
                    VText { text: I18n.t("emptyTitle"); size: Theme.tLg; weight: Font.DemiBold; color: Theme.fg }
                    VText { width: parent.width; text: I18n.t("emptyBody"); wrapMode: Text.Wrap }
                }
            }

            // Grid: as many capsule columns as fit, stretched to fill the row.
            Item {
                id: gridArea
                readonly property real avail: lib.width - 2 * Theme.gutter
                readonly property int cols: Math.max(1, Math.floor((avail + Theme.s3) / (Theme.capsule + Theme.s3)))
                readonly property real tileW: (avail - (cols - 1) * Theme.s3) / cols
                readonly property bool focusGroup: true
                width: parent.width
                height: flow.height + Theme.s4 + Theme.s7
                Flow {
                    id: flow
                    x: Theme.gutter
                    y: Theme.s4
                    width: gridArea.avail
                    spacing: Theme.s3
                    Repeater {
                        id: grid
                        model: lib.games
                        VTile {
                            required property var modelData
                            artWidth: gridArea.tileW
                            height: artH + Theme.s4 - Theme.s3
                            game: modelData
                            title: modelData.title
                            src: modelData.art.capsule || ""
                            fit: modelData.source === "emu" ? "box" : "cover"
                            badge: lib.badgeFor(modelData)
                            onActivated: App.openGame(modelData)
                        }
                    }
                }
            }
        }
    }
}
