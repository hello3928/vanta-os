// A centred modal with a title, message and action buttons.
// icon + tone (error | warning | info | success) draw a status badge above the title; code adds
// a small reference line. Error dialogs shake once and play the error sound.
// actions: [{ label, variant, icon, run }]; `stack` puts them one per line (the power menu).
import QtQuick
import dev.vanta.shell

Overlay {
    id: d

    property string title
    property string body
    property string code
    property string icon
    property string tone
    property var actions: []
    property bool stack: false
    property int initialIndex: 0

    function open() {
        isOpen = true
        Sound.play(tone === "error" ? "error" : "open")
        Haptics.play(tone === "error" ? "error" : "select")
        shown = true
        if (tone === "error") App.later(220, () => shake.start())
        const i = stack ? initialIndex : actions.length - 1 - initialIndex
        Nav.pushScope(box, { onBack: () => d.close(true), initial: buttons.itemAt(i) })
    }

    function close(silent) {
        if (!isOpen) return
        if (!silent) {
            Sound.play("back")
            Haptics.play("back")
        }
        Nav.popScope(box)
        finish()
    }

    exitMs: 260

    Rectangle {
        anchors.fill: parent
        color: Theme.scrim
        opacity: d.shown ? 1 : 0
        Behavior on opacity { NumberAnimation { duration: d.shown ? Theme.tBase : Theme.tFast } }
        MouseArea { anchors.fill: parent; onClicked: d.close() }
    }

    Rectangle {
        id: box
        width: Math.min(28 * Theme.rem, d.width - 32)
        height: col.height + 2 * Theme.s6
        anchors.centerIn: parent
        radius: Theme.rLg
        color: Theme.panel
        border.width: 1
        border.color: Theme.line
        opacity: d.shown ? 1 : 0
        scale: d.shown ? 1 : 0.96
        Behavior on opacity { NumberAnimation { duration: d.shown ? Theme.tBase : Theme.tFast; easing.type: Easing.OutCubic } }
        Behavior on scale { NumberAnimation { duration: d.shown ? Theme.tBase : Theme.tFast; easing.type: Easing.OutCubic } }
        transform: Translate { id: shift }
        MouseArea { anchors.fill: parent }

        Column {
            id: col
            x: Theme.s6
            y: Theme.s6
            width: parent.width - 2 * Theme.s6
            spacing: Theme.s4

            Rectangle {
                visible: d.icon !== ""
                width: 3 * Theme.rem
                height: width
                radius: width / 2
                color: d.tone === "error" ? Theme.badSoft : d.tone === "warning" ? Theme.warnSoft : d.tone === "success" ? Theme.goodSoft : Theme.accentSoft
                Icon {
                    anchors.centerIn: parent
                    name: d.icon
                    size: 1.75 * Theme.rem
                    color: d.tone === "error" ? Theme.bad : d.tone === "warning" ? Theme.warn : d.tone === "success" ? Theme.good : Theme.accentHi
                }
            }
            VText {
                width: parent.width
                text: d.title
                size: Theme.tXl
                weight: Font.DemiBold
                color: Theme.fg
                wrapMode: Text.Wrap
                elide: Text.ElideNone
            }
            VText {
                width: parent.width
                visible: d.body !== ""
                text: d.body
                wrapMode: Text.Wrap
                elide: Text.ElideNone
                lineHeight: 1.15
            }
            VText {
                width: parent.width
                visible: d.code !== ""
                text: d.code
                size: Theme.tXs
                color: Theme.fg4
                font.family: "monospace"
            }
            Flow {
                id: actionsFlow
                width: parent.width
                spacing: Theme.s2
                layoutDirection: d.stack ? Qt.LeftToRight : Qt.RightToLeft
                // Right to left keeps the design's order (first action on the left) when reversed.
                Repeater {
                    id: buttons
                    model: d.stack ? d.actions : d.actions.slice().reverse()
                    VButton {
                        required property var modelData
                        label: modelData.label
                        icon: modelData.icon || ""
                        variant: modelData.variant || "secondary"
                        block: d.stack
                        onActivated: {
                            d.close(true)
                            if (modelData.run) modelData.run()
                        }
                    }
                }
            }
        }
    }

    SequentialAnimation {
        id: shake
        NumberAnimation { target: shift; property: "x"; to: -8; duration: 60 }
        NumberAnimation { target: shift; property: "x"; to: 7; duration: 70 }
        NumberAnimation { target: shift; property: "x"; to: -4; duration: 70 }
        NumberAnimation { target: shift; property: "x"; to: 0; duration: 80 }
    }
}
