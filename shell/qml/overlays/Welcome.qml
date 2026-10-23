// The end of first-time setup: the Orbit logo draws itself
// in with the welcome jingle, then the tour of Home starts.
import QtQuick
import dev.vanta.shell

Overlay {
    id: w

    z: 50
    exitMs: 450

    function open() {
        isOpen = true
        shown = true
        App.later(30, () => mark.draw())
        App.later(150, () => {
            Sound.play("welcome")
            Haptics.play("notify")
        })
        App.later(2300, () => finish())
    }
    function close(silent) {}

    Rectangle {
        anchors.fill: parent
        color: Theme.bg
        opacity: w.shown ? 1 : 0
        Behavior on opacity { NumberAnimation { duration: w.shown ? Theme.tSlow : 420; easing.type: w.shown ? Easing.OutCubic : Easing.InCubic } }
        MouseArea { anchors.fill: parent }
        Logo {
            id: mark
            anchors.centerIn: parent
            size: 132
            p1: 0
            p2: 0
            p3: 0
            core: 0
        }
    }
}
