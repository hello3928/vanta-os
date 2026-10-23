// A Home widget card, like the PS5's: a label on top and a
// value, chart or list underneath. Focusable like tiles: a white ring and a slight lift.
import QtQuick
import dev.vanta.shell

VFocusable {
    id: w

    property string label
    property string size: "s"
    default property alias body: bodyArea.data

    width: (size === "m" ? 20 : 13) * Theme.rem
    height: 9 * Theme.rem
    scale: pressed ? 1.01 : focused ? 1.03 : 1
    Behavior on scale { NumberAnimation { duration: Theme.tBase; easing.type: Easing.OutCubic } }

    Rectangle {
        anchors.fill: parent
        radius: Theme.rMd
        color: Qt.rgba(35 / 255, 38 / 255, 46 / 255, 0.92)
    }
    Rectangle {
        anchors.fill: parent
        radius: Theme.rMd
        color: "transparent"
        border.width: 3
        border.color: "#ffffff"
        opacity: w.focused ? 1 : 0
        Behavior on opacity { NumberAnimation { duration: Theme.tFast } }
    }
    VText {
        id: head
        x: Theme.s4
        y: Theme.s4
        width: parent.width - 2 * Theme.s4
        text: w.label
        size: Theme.tSm
        weight: Font.Medium
        color: Theme.fg3
    }
    Item {
        id: bodyArea
        x: Theme.s4
        y: head.y + head.height + Theme.s2
        width: parent.width - 2 * Theme.s4
        height: parent.height - y - Theme.s4
    }
}
