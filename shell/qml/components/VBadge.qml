// Small status label (the mockup's VBadge). tone: default | accent | good | warn | bad | muted.
import QtQuick
import dev.vanta.shell

Rectangle {
    id: badge

    property string text
    property string tone: "default"
    property string icon

    readonly property color fg: ({ accent: Theme.accentFg, good: "#9be08a", warn: Theme.warn, bad: "#ff8c8f", muted: Theme.fg3 })[tone] || Theme.fg
    implicitWidth: row.width + 1.2 * Theme.tXs
    implicitHeight: 1.6 * Theme.tXs + 2
    width: implicitWidth
    height: implicitHeight
    radius: Theme.rXs
    color: ({ accent: Theme.accent, good: Qt.rgba(89 / 255, 191 / 255, 64 / 255, 0.16), warn: Theme.warnSoft, bad: Theme.badSoft, muted: Theme.surface })[tone]
           || Qt.rgba(26 / 255, 29 / 255, 35 / 255, 0.85)

    Row {
        id: row
        anchors.centerIn: parent
        spacing: 0.35 * Theme.tXs
        Icon {
            name: badge.icon
            visible: badge.icon !== ""
            size: 1.1 * Theme.tXs
            color: badge.fg
            anchors.verticalCenter: parent.verticalCenter
        }
        VText {
            text: badge.text
            size: Theme.tXs
            weight: Font.DemiBold
            color: badge.fg
            anchors.verticalCenter: parent.verticalCenter
        }
    }
}
