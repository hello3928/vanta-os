// A settings row whose value opens a popup list, like Steam Deck dropdowns.
// A opens the list; up/down moves; A picks; B closes without changing anything.
// options: ["Off", "Low", "High"] or [{ value, label }]. Values stored in English show translated.
// `key` ties it to a setting; otherwise it keeps `value` and emits picked(value).
import QtQuick
import dev.vanta.shell

VControl {
    id: d

    property string key
    property var options: []
    property var value
    readonly property var items: options.map(o => typeof o === "object" ? o : { value: o, label: I18n.opt(o) })
    readonly property var current: key ? Settings[key] : value
    readonly property string currentLabel: {
        const o = items.find(x => x.value === current)
        return o ? o.label : (current === undefined ? "" : String(current))
    }
    property bool open: false
    signal picked(var value)

    activateSound: ""
    activateHaptic: ""

    function activate() {
        if (inactive) {
            Sound.play("error")
            Haptics.play("error")
            return
        }
        press()
        open = true
        const box = valueBox.mapToItem(null, 0, 0)
        const menu = App.open("menu", { anchorRect: Qt.rect(box.x, box.y, valueBox.width, valueBox.height), items: items, current: current })
        menu.chosen.connect(v => {
            if (v !== current) {
                if (key) Settings.set(key, v)
                else value = v
                picked(v)
            }
        })
        menu.closed.connect(() => d.open = false)
    }

    Rectangle {
        id: valueBox
        width: Math.min(16 * Theme.rem, Math.max(9.5 * Theme.rem, label.implicitWidth + chev.width + 1.5 * Theme.rem + Theme.s2))
        height: label.implicitHeight + 1 * Theme.rem
        radius: Theme.rSm
        color: d.focused ? Qt.rgba(26 / 255, 29 / 255, 35 / 255, 0.6) : Theme.bg2
        border.width: 1
        border.color: Theme.line
        anchors.verticalCenter: parent.verticalCenter
        VText {
            id: label
            x: 0.9 * Theme.rem
            width: parent.width - x - chev.width - Theme.s2 - 0.6 * Theme.rem
            anchors.verticalCenter: parent.verticalCenter
            text: d.currentLabel
            size: Theme.tSm
            weight: Font.Medium
            color: d.focused ? Theme.fg : Theme.fg2
        }
        Icon {
            id: chev
            name: "expand_more"
            size: 1.2 * Theme.rem
            color: d.focused ? Theme.fg : Theme.fg3
            anchors { right: parent.right; rightMargin: 0.6 * Theme.rem; verticalCenter: parent.verticalCenter }
            rotation: d.open ? 180 : 0
            Behavior on rotation { NumberAnimation { duration: Theme.tBase; easing.type: Easing.OutCubic } }
        }
    }
}
