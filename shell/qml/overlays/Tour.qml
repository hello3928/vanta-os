// A short tour of Home after setup: each step puts a spotlight on one area
// and names its button with the controller's own glyph. B skips; Settings > System shows it again.
import QtQuick
import dev.vanta.shell

Overlay {
    id: t

    property int index: 0
    readonly property var steps: [
        { target: () => App.screen && App.screen.tourRecent, title: "tourGamesTitle", body: "tourGames" },
        { target: () => App.screen && App.screen.tourWidgets, title: "tourWidgetsTitle", body: "tourWidgets" },
        { target: () => App.topBar && App.topBar.statusArea, title: "tourTopTitle", body: "tourTop" },
        { target: null, title: "tourMenuTitle", body: "tourMenu" },
        { target: null, title: "tourQamTitle", body: "tourQam" },
        { target: null, title: "tourTrailerTitle", body: "tourTrailer" }
    ]
    readonly property var step: steps[index]
    readonly property bool last: index === steps.length - 1
    property rect spot: Qt.rect(width / 2, height / 2, 0, 0)
    readonly property bool centred: spot.width === 0

    z: 45

    function open() {
        isOpen = true
        shown = true
        place()
        Nav.pushScope(card, { onBack: () => t.close(true), initial: nextButton })
    }
    function close(silent) {
        if (!isOpen) return
        Settings.tourDone = true
        Nav.popScope(card)
        finish()
    }
    function go(d) {
        index += d
        Sound.play("tab")
        place()
        Nav.focus(nextButton, true)
    }
    // Scroll the area into view first, then put the spotlight on it.
    function place() {
        const el = step.target ? step.target() : null
        if (!el) {
            spot = Qt.rect(width / 2, height / 2, 0, 0)
            return
        }
        Nav.reveal(el)
        App.later(380, () => measure(el))
    }
    function measure(el) {
        const p = el.mapToItem(null, 0, 0)
        const pad = 10
        const left = Math.max(12, p.x - pad)
        const right = Math.min(width - 12, p.x + el.width + pad)
        spot = Qt.rect(left, p.y - pad, right - left, Math.min(el.height, height - p.y) + pad * 2)
    }

    // Spotlight: the page darkens everywhere except the area being explained.
    Item {
        anchors.fill: parent
        opacity: t.shown ? 1 : 0
        Behavior on opacity { NumberAnimation { duration: Theme.tBase } }
        readonly property color dim: Qt.rgba(10 / 255, 12 / 255, 15 / 255, 0.72)
        Rectangle { color: parent.dim; x: 0; y: 0; width: parent.width; height: Math.max(0, t.spot.y) }
        Rectangle { color: parent.dim; x: 0; y: t.spot.y + t.spot.height; width: parent.width; height: Math.max(0, parent.height - y) }
        Rectangle { color: parent.dim; x: 0; y: t.spot.y; width: Math.max(0, t.spot.x); height: t.spot.height }
        Rectangle { color: parent.dim; x: t.spot.x + t.spot.width; y: t.spot.y; width: Math.max(0, parent.width - x); height: t.spot.height }
        Rectangle {
            visible: !t.centred
            x: t.spot.x
            y: t.spot.y
            width: t.spot.width
            height: t.spot.height
            radius: Theme.rLg
            color: "transparent"
            border.width: 2
            border.color: Qt.rgba(1, 1, 1, 0.9)
        }
        MouseArea { anchors.fill: parent }
    }

    Rectangle {
        id: card
        readonly property real below: t.spot.y + t.spot.height + 16
        readonly property bool fits: below + height + 16 < t.height
        width: Math.min(24 * Theme.rem, t.width - 32)
        height: col.height + 2 * Theme.s5
        x: t.centred ? (t.width - width) / 2 : Math.min(Math.max(16, t.spot.x), t.width - width - 16)
        y: t.centred ? (t.height - height) / 2 : fits ? below : t.spot.y - 16 - height
        radius: Theme.rLg
        color: Theme.panel
        border.width: 1
        border.color: Theme.line
        opacity: t.shown ? 1 : 0
        Behavior on opacity { NumberAnimation { duration: Theme.tBase } }
        Behavior on x { NumberAnimation { duration: Theme.tSlow; easing.type: Easing.OutCubic } }
        Behavior on y { NumberAnimation { duration: Theme.tSlow; easing.type: Easing.OutCubic } }

        Column {
            id: col
            x: Theme.s5
            y: Theme.s5
            width: parent.width - 2 * Theme.s5
            spacing: Theme.s2
            VText { text: I18n.t("tourStep", { n: t.index + 1, total: t.steps.length }); size: Theme.tSm; color: Theme.fg3 }
            VText { width: parent.width; text: I18n.t(t.step.title); size: Theme.tLg; weight: Font.DemiBold; color: Theme.fg }
            // "Press {qam} for ..." with the controller's glyph in place of {action}.
            Flow {
                width: parent.width
                spacing: 0
                Repeater {
                    model: {
                        const out = []
                        I18n.t(t.step.body).split(/(\{\w+\})/).forEach(part => {
                            const m = /^\{(\w+)\}$/.exec(part)
                            if (m) out.push({ glyph: m[1] })
                            else part.split(/(\s+)/).filter(w => w).forEach(w => out.push({ text: w }))
                        })
                        return out
                    }
                    Item {
                        required property var modelData
                        width: modelData.glyph ? g.width + 4 : w.implicitWidth
                        height: 1.6 * Theme.tMd
                        VText {
                            id: w
                            visible: !modelData.glyph
                            text: modelData.text || ""
                            anchors.verticalCenter: parent.verticalCenter
                            elide: Text.ElideNone
                        }
                        Glyph {
                            id: g
                            visible: !!modelData.glyph
                            x: 2
                            action: modelData.glyph || ""
                            glyphHeight: 1.5 * Theme.tMd
                            anchors.verticalCenter: parent.verticalCenter
                        }
                    }
                }
            }
            Item { width: 1; height: Theme.s3 }
            Row {
                readonly property bool focusGroup: true
                anchors.right: parent.right
                spacing: Theme.s2
                VButton { visible: !t.last; label: I18n.t("skip"); variant: "ghost"; onActivated: t.close(true) }
                VButton { id: nextButton; label: t.last ? I18n.t("done") : I18n.t("next"); variant: "primary"; onActivated: t.last ? t.close(true) : t.go(1) }
            }
        }
    }
}
