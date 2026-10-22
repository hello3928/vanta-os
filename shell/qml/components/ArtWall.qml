// The setup background: a tilted wall of popular games (data/setup-wall.jpg, made by
// tools/render-setup-wall.qml and shipped, so it shows before there's a network), darkened so
// the title reads on top.
import QtQuick
import dev.vanta.shell

Item {
    id: wall

    clip: true

    Image {
        anchors.fill: parent
        source: "file://" + App.sys.dataDir + "/setup-wall.jpg"
        fillMode: Image.PreserveAspectCrop
        asynchronous: true
        opacity: status === Image.Ready ? 1 : 0
        Behavior on opacity { NumberAnimation { duration: 600; easing.type: Easing.OutCubic } }
    }
    // Darken it, a little more at the top and bottom where the bars are.
    Rectangle { anchors.fill: parent; color: Theme.bg; opacity: 0.72 }
    Rectangle {
        anchors.fill: parent
        gradient: Gradient {
            GradientStop { position: 0.0; color: Qt.rgba(26 / 255, 29 / 255, 35 / 255, 0.6) }
            GradientStop { position: 0.3; color: "transparent" }
            GradientStop { position: 0.7; color: "transparent" }
            GradientStop { position: 1.0; color: Qt.rgba(26 / 255, 29 / 255, 35 / 255, 0.8) }
        }
    }
}
