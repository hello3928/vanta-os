// Storage: each drive that holds games (this device, and SD cards or other drives with a Steam
// library), how full it is, what fills this device's drive (games, emulation, screenshots and
// videos, system), and the largest games, which can be uninstalled from here.
// Folder sizes come from `du`, run in the background when the panel opens.
import QtQuick
import dev.vanta.shell

VPanel {
    id: s

    title: I18n.t("storage")
    readonly property string home: App.sys.home
    readonly property var installed: { Games.revision; return Games.all.filter(g => g.source === "steam" && g.installed) }
    property real emulationBytes: -1
    property real mediaBytes: -1

    function stat(path) { try { return JSON.parse(App.sys.storage(path)) } catch (e) { return { free: 0, total: 0 } } }
    function bytes(n) { return n >= 1e12 ? (Math.round(n / 1e11) / 10) + " TB" : n >= 1e9 ? Math.round(n / 1e9) + " GB" : Math.round(n / 1e6) + " MB" }

    // Drives, one per file system: this device first, then each other Steam library's drive.
    readonly property var drives: {
        const own = stat(home)
        const out = [{ key: own.total + "/" + own.free, name: I18n.t("thisDevice"), path: home, free: own.free, total: own.total, games: [] }]
        installed.forEach(g => {
            const root = g.library || home
            const st = stat(root)
            const key = st.total + "/" + st.free
            let d = out.find(x => x.key === key)
            if (!d) {
                d = { key: key, name: root.split("/").filter(x => x).pop() || root, path: root, free: st.free, total: st.total, games: [] }
                out.push(d)
            }
            d.games.push(g)
        })
        return out.filter(d => d.total > 0)
    }
    readonly property var own: drives.length ? drives[0] : null
    readonly property real gameBytes: own ? own.games.reduce((a, g) => a + (g.sizeBytes || 0), 0) : 0
    readonly property var largest: installed.slice().sort((a, b) => b.sizeBytes - a.sizeBytes).slice(0, 8)

    function open() {
        isOpen = true
        Sound.play("open")
        Haptics.play("tick")
        shown = true
        Nav.pushScope(panelItem, { onBack: () => s.close(true), initial: s.initial })
        App.query("du-emulation", "du", ["-sbc", home + "/Games", home + "/Emulation"])
        App.query("du-media", "du", ["-sbc", home + "/Pictures", home + "/Videos"])
    }
    Connections {
        target: App.sys
        function onFinished(tag, code, out) {
            const total = /(\d+)\s+total\s*$/.exec(out)
            if (tag === "du-emulation") s.emulationBytes = total ? parseInt(total[1]) : 0
            else if (tag === "du-media") s.mediaBytes = total ? parseInt(total[1]) : 0
        }
    }

    component Part: Item {
        property string name
        property real size: -1
        width: parent.width
        height: 2.2 * Theme.rem
        VText { text: parent.name; size: Theme.tSm; color: Theme.fg2; anchors.verticalCenter: parent.verticalCenter }
        VText {
            anchors { right: parent.right; verticalCenter: parent.verticalCenter }
            text: parent.size < 0 ? "…" : s.bytes(parent.size)
            size: Theme.tSm
            color: Theme.fg3
        }
    }

    Repeater {
        model: s.drives
        Column {
            required property var modelData
            required property int index
            width: parent.width
            spacing: Theme.s2
            topPadding: index > 0 ? Theme.s4 : 0
            VText { text: modelData.name; weight: Font.DemiBold; color: Theme.fg }
            VProgress {
                width: parent.width
                showValue: false
                value: 1 - modelData.free / Math.max(1, modelData.total)
                tone: modelData.free / Math.max(1, modelData.total) < 0.1 ? "light" : "accent"
            }
            VText {
                text: I18n.t("storageVal", { free: s.bytes(modelData.free), total: s.bytes(modelData.total) })
                size: Theme.tSm
                color: Theme.fg3
            }
            // What fills this device's drive.
            Column {
                visible: index === 0
                width: parent.width
                topPadding: Theme.s2
                Part { name: I18n.t("storageGames"); size: s.gameBytes }
                Part { name: I18n.t("emulation"); size: s.emulationBytes }
                Part { name: I18n.t("storageMedia"); size: s.mediaBytes }
                Part {
                    name: I18n.t("storageSystem")
                    size: s.emulationBytes < 0 || s.mediaBytes < 0 ? -1
                        : Math.max(0, modelData.total - modelData.free - s.gameBytes - s.emulationBytes - s.mediaBytes)
                }
            }
            VText {
                visible: index > 0
                text: I18n.t("gamesCount", { n: modelData.games.length })
                size: Theme.tSm
                color: Theme.fg3
            }
        }
    }

    VText {
        visible: s.largest.length > 0
        topPadding: Theme.s5
        bottomPadding: Theme.s2
        text: I18n.t("largestGames")
        weight: Font.DemiBold
        color: Theme.fg
    }
    Repeater {
        model: s.largest
        VListItem {
            required property var modelData
            width: parent.width
            label: modelData.title
            trailText: Games.sizeText(modelData.sizeBytes)
            onActivated: App.confirm({ title: I18n.t("uninstallQ", { game: modelData.title }), body: I18n.t("uninstallBody"),
                                       confirmLabel: I18n.t("uninstall"), danger: true }, () => Games.uninstall(modelData))
        }
    }
}
