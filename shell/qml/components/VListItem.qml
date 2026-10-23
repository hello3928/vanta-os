// A row in a list or menu: optional second line, a value on the right,
// a badge, a chevron, or a check mark for the chosen item in setup lists.
import QtQuick
import dev.vanta.shell

VControl {
    id: item

    property string trailText
    property var badge: null
    property bool chevron: false
    property bool check: false
    property bool busy: false

    VSpinner {
        visible: item.busy
        size: "sm"
        anchors.verticalCenter: parent.verticalCenter
    }
    VText {
        visible: item.trailText !== ""
        text: item.trailText
        size: Theme.tSm
        weight: Font.DemiBold
        color: item.focused ? Theme.fg : Theme.fg2
        anchors.verticalCenter: parent.verticalCenter
    }
    VBadge {
        visible: !!item.badge
        text: item.badge ? item.badge.text : ""
        tone: item.badge && item.badge.tone ? item.badge.tone : "default"
        icon: item.badge && item.badge.icon ? item.badge.icon : ""
        anchors.verticalCenter: parent.verticalCenter
    }
    Icon {
        visible: item.check && !item.busy
        name: "check"
        size: 1.3 * Theme.tMd
        color: item.focused ? Theme.fg : Theme.accentHi
        opacity: item.selected ? 1 : 0
        anchors.verticalCenter: parent.verticalCenter
    }
    Icon {
        visible: item.chevron
        name: "chevron"
        size: 1.2 * Theme.tMd
        color: Theme.fg3
        anchors.verticalCenter: parent.verticalCenter
    }
}
