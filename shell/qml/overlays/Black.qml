// A black screen for sleep, restart and shut down. fadeOut() brings the UI back.
import QtQuick
import dev.vanta.shell

Overlay {
    id: b

    z: 50
    exitMs: 720

    function fadeOut() {
        fade.to = 0
        fade.duration = 700
        fade.start()
        finish()
    }
    function close(silent) {}

    Rectangle {
        id: black
        anchors.fill: parent
        color: "#000000"
        opacity: 0
        NumberAnimation on opacity { id: fade; to: 1; duration: 500; easing.type: Easing.OutCubic }
        MouseArea { anchors.fill: parent; onClicked: if (App.sleeping) App.sleeping() }
    }
}
