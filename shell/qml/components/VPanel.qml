// A drawer from the left (main menu) or right (quick access, game options), the mockup's VPanel.
// It opens its own focus scope; B or tapping outside closes it and returns focus.
// Put rows inside it; `header` is shown under the title, `rail` on the outer edge.
import QtQuick
import dev.vanta.shell

Overlay {
    id: p

    property string title
    property string subtitle
    property string side: "right"
    property Component header: null
    property Component rail: null
    property var initial: null
    default property alias content: body.data
    property alias bodyColumn: body
    property alias railItem: railLoader.item
    property alias panelItem: panel
    property alias bodyScroll: scroll

    readonly property real panelWidth: Math.min(side === "left" ? 20 * Theme.rem : 25 * Theme.rem, width)

    function open() {
        isOpen = true
        Sound.play("open")
        Haptics.play("tick")
        shown = true
        Nav.pushScope(panel, { onBack: () => p.close(true), initial: p.initial })
    }

    function close(silent) {
        if (!isOpen) return
        if (!silent) {
            Sound.play("close")
            Haptics.play("back")
        }
        Nav.popScope(panel)
        finish()
    }

    Rectangle {
        anchors.fill: parent
        color: Theme.scrim
        opacity: p.shown ? 1 : 0
        Behavior on opacity { NumberAnimation { duration: p.shown ? Theme.tBase : Theme.tFast; easing.type: Easing.OutCubic } }
        MouseArea { anchors.fill: parent; onClicked: p.close() }
    }

    Rectangle {
        id: panel
        readonly property real railWidth: railLoader.item ? railLoader.item.width + 2 * Theme.s2 : 0
        width: p.panelWidth + railWidth
        height: parent.height
        x: p.side === "left" ? (p.shown ? 0 : -width) : (p.shown ? p.width - width : p.width)
        color: Theme.panel
        Behavior on x { NumberAnimation { duration: p.shown ? Theme.tSlow : Theme.tFast; easing.type: Easing.BezierSpline; easing.bezierCurve: p.shown ? Theme.easeOut : Theme.easeIn } }
        MouseArea { anchors.fill: parent }

        Rectangle {
            width: 1
            height: parent.height
            x: p.side === "left" ? parent.width - 1 : 0
            color: Theme.line
        }

        Column {
            id: head
            x: Theme.s5
            y: Theme.s5
            width: p.panelWidth - 2 * Theme.s5
            spacing: 0.2 * Theme.rem
            VText {
                width: parent.width
                visible: text !== ""
                text: p.title
                size: Theme.tLg
                weight: Font.DemiBold
                color: Theme.fg
            }
            VText {
                width: parent.width
                visible: text !== ""
                text: p.subtitle
                size: Theme.tSm
                color: Theme.fg3
            }
            Loader {
                width: parent.width
                sourceComponent: p.header
                active: p.header !== null
            }
        }

        VScroll {
            id: scroll
            x: p.side === "right" && railLoader.item ? 0 : 0
            y: head.y + head.height + Theme.s3
            width: p.panelWidth
            height: parent.height - y
            contentHeight: body.height + Theme.s6
            Column {
                id: body
                x: Theme.s3
                y: Theme.s1
                width: p.panelWidth - 2 * Theme.s3
                spacing: 2
            }
        }

        Rectangle {
            visible: railLoader.item !== null
            x: p.panelWidth
            width: panel.railWidth
            height: parent.height
            color: Theme.bg2
            Rectangle { width: 1; height: parent.height; color: Theme.line }
            Loader {
                id: railLoader
                x: Theme.s2
                y: Theme.s4
                sourceComponent: p.rail
                active: p.rail !== null
            }
        }
    }
}
