// The popup list of a VDropdown, placed under the value (or above it near the bottom of the
// screen). Up/down moves, A picks, B closes without a change.
import QtQuick
import dev.vanta.shell

Overlay {
    id: m

    property rect anchorRect
    property var items: []
    property var current
    signal chosen(var value)

    readonly property real itemH: 2.75 * Theme.rem
    readonly property real listH: Math.min(Math.min(22 * Theme.rem, height * 0.7), items.length * (itemH + 2) + 2 * Theme.s1)
    readonly property bool up: height - (anchorRect.y + anchorRect.height) < Math.min(320, items.length * 52 + 16)

    exitMs: 180

    function open() {
        isOpen = true
        Sound.play("open")
        Haptics.play("tick")
        shown = true
        const i = Math.max(0, items.findIndex(o => o.value === current))
        Nav.pushScope(menu, { onBack: () => m.close(true), initial: rows.itemAt(i) })
    }

    function close(silent, picked) {
        if (!isOpen) return
        if (!picked) Sound.play("close")
        Nav.popScope(menu)
        finish()
    }

    FontMetrics {
        id: fm
        font.family: Theme.font
        font.pixelSize: Theme.tSm
        font.weight: Font.Medium
    }

    MouseArea { anchors.fill: parent; onClicked: m.close() }

    Rectangle {
        id: menu
        width: Math.max(m.anchorRect.width, 200, m.items.reduce((w, o) => Math.max(w, fm.advanceWidth(o.label)), 0) + 3.6 * Theme.rem)
        height: m.listH
        x: m.anchorRect.x + m.anchorRect.width - width
        y: m.up ? m.anchorRect.y - 6 - height : m.anchorRect.y + m.anchorRect.height + 6
        radius: Theme.rMd
        color: Theme.surface
        border.width: 1
        border.color: Theme.line
        opacity: m.shown ? 1 : 0
        scale: m.shown ? 1 : 0.98
        transformOrigin: m.up ? Item.BottomRight : Item.TopRight
        Behavior on opacity { NumberAnimation { duration: m.shown ? Theme.tBase : Theme.tFast } }
        Behavior on scale { NumberAnimation { duration: m.shown ? Theme.tBase : Theme.tFast; easing.type: Easing.OutCubic } }

        VScroll {
            id: list
            anchors.fill: parent
            anchors.margins: Theme.s1
            contentHeight: col.height
            Column {
                id: col
                width: list.width
                spacing: 2
                Repeater {
                    id: rows
                    model: m.items
                    VFocusable {
                        id: row
                        required property var modelData
                        readonly property bool selected: modelData.value === m.current
                        width: col.width
                        height: m.itemH
                        activateSound: ""
                        activateHaptic: ""
                        onActivated: {
                            Sound.play("select")
                            Haptics.play("select")
                            m.close(true, true)
                            m.chosen(modelData.value)
                        }
                        Rectangle {
                            anchors.fill: parent
                            radius: Theme.rSm
                            color: row.focused ? Theme.light : "transparent"
                            Behavior on color { ColorAnimation { duration: Theme.tFast } }
                        }
                        VText {
                            x: 0.9 * Theme.rem
                            width: parent.width - x - check.width - 1.6 * Theme.rem
                            anchors.verticalCenter: parent.verticalCenter
                            text: row.modelData.label
                            size: Theme.tSm
                            weight: Font.Medium
                            color: row.focused ? Theme.inkOnLight : row.selected ? Theme.fg : Theme.fg2
                        }
                        Icon {
                            id: check
                            visible: row.selected
                            name: "check"
                            size: 1.15 * Theme.rem
                            color: row.focused ? Theme.inkOnLight : Theme.accentHi
                            anchors { right: parent.right; rightMargin: 0.9 * Theme.rem; verticalCenter: parent.verticalCenter }
                        }
                    }
                }
            }
        }
    }
}
