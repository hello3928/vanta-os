// A text row. A opens the on-screen keyboard; the row updates as you
// type. password: true shows dots.
import QtQuick
import dev.vanta.shell

VControl {
    id: f

    property string value
    property string placeholder
    property int maxLength: 24
    property bool password: false
    property string hint
    property bool typing: false
    signal edited(string text)
    signal done(string text)

    detail: hint
    activateSound: ""
    readonly property string shown: password ? "•".repeat(value.length) : value

    function activate() {
        if (inactive) {
            Sound.play("error")
            Haptics.play("error")
            return
        }
        press()
        typing = true
        const kb = App.open("keyboard", { label: label, text: value, password: password, maxLength: maxLength })
        kb.input.connect(t => { f.value = t; f.edited(t) })
        kb.finished.connect(t => { f.value = t; f.done(t) })
        kb.closed.connect(() => f.typing = false)
    }

    Rectangle {
        width: Math.min(16 * Theme.rem, Math.max(10 * Theme.rem, txt.implicitWidth + 1.8 * Theme.rem))
        height: txt.implicitHeight + 1.1 * Theme.rem
        radius: Theme.rSm
        color: f.focused ? Qt.rgba(26 / 255, 29 / 255, 35 / 255, 0.6) : Theme.bg2
        border.width: f.typing ? 2 : 1
        border.color: f.typing ? Theme.accent : Theme.line
        anchors.verticalCenter: parent.verticalCenter
        VText {
            id: txt
            x: 0.9 * Theme.rem
            width: parent.width - 1.8 * Theme.rem
            anchors.verticalCenter: parent.verticalCenter
            text: f.shown || f.placeholder
            color: f.shown ? Theme.fg : Theme.fg4
            weight: Font.Medium
            font.letterSpacing: f.password && f.shown ? 0.12 * Theme.rem : 0
        }
    }
}
