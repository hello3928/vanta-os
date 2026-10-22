// The row every list and setting uses (the mockup's .v-control): icon, label, an optional second
// line, and something on the right (a value, switch, badge or chevron). SteamOS lists: a hairline
// between rows; the focused row fills instead.
import QtQuick
import dev.vanta.shell

VFocusable {
    id: c

    property string label
    property string detail
    property string icon
    property bool selected: false
    property bool danger: false
    default property alias trail: trailRow.data
    // Spans the label and trail under the first line (the slider's track).
    property alias below: belowArea.data
    property real belowHeight: 0
    property real padX: 0.9 * Theme.rem
    property real minHeight: Theme.controlH
    property real labelSize: Theme.tMd
    property color fill: focused ? Theme.focusRow : selected ? Theme.surface : "transparent"
    property bool hairline: true
    property color labelColor: danger ? Theme.bad : unsupported ? Theme.fg3 : focused ? Theme.fg : Theme.fg2
    property color iconColor: danger ? Theme.bad : focused ? Theme.fg : Theme.fg3
    readonly property string secondLine: unsupported || detail

    width: parent ? parent.width : 320
    implicitHeight: Math.max(minHeight, top.height + (belowHeight ? belowHeight + 0.65 * Theme.rem : 0) + 1.2 * Theme.rem)
    height: implicitHeight

    Rectangle {
        anchors.fill: parent
        radius: Theme.rXs
        color: c.fill
        Behavior on color { ColorAnimation { duration: Theme.tFast } }
    }
    Rectangle {
        anchors { left: parent.left; right: parent.right; bottom: parent.bottom }
        height: 1
        color: Theme.line
        visible: c.hairline && !c.focused && c.fill === "transparent"
    }

    Item {
        id: top
        x: c.padX
        y: c.belowHeight ? 0.6 * Theme.rem : (c.height - height) / 2
        width: c.width - 2 * c.padX
        height: Math.max(texts.height, trailRow.height, iconItem.visible ? iconItem.height : 0)

        Icon {
            id: iconItem
            name: c.icon
            visible: c.icon !== ""
            anchors.verticalCenter: parent.verticalCenter
            color: c.iconColor
            opacity: c.unsupported ? 0.4 : 1
        }
        Column {
            id: texts
            x: iconItem.visible ? iconItem.width + Theme.s3 : 0
            width: trailRow.x - x - (trailRow.width ? Theme.s3 : 0)
            anchors.verticalCenter: parent.verticalCenter
            spacing: 0.15 * Theme.rem
            VText {
                width: parent.width
                text: c.label
                size: c.labelSize
                weight: Font.Medium
                color: c.labelColor
                wrapMode: Text.Wrap
                elide: Text.ElideNone
                Behavior on color { ColorAnimation { duration: Theme.tFast } }
            }
            VText {
                width: parent.width
                visible: text !== ""
                text: c.secondLine
                size: Theme.tSm
                color: c.unsupported ? (c.focused ? Theme.fg3 : Theme.fg4) : c.focused ? Theme.fg2 : Theme.fg3
                wrapMode: Text.Wrap
                elide: Text.ElideNone
            }
        }
        Row {
            id: trailRow
            anchors { right: parent.right; verticalCenter: parent.verticalCenter }
            spacing: Theme.s2
            opacity: c.unsupported ? 0.4 : 1
        }
    }
    Item {
        id: belowArea
        x: c.padX + (iconItem.visible ? iconItem.width + Theme.s3 : 0)
        y: top.y + top.height + 0.65 * Theme.rem
        width: c.width - c.padX - x
        height: c.belowHeight
    }
}
