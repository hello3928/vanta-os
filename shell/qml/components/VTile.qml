// VTile: a game capsule (2:3). Focus lifts it slightly with a 3 px white ring drawn inside the
// art, as in the mockup. Only scale and opacity animate.
import QtQuick
import dev.vanta.shell

Item {
    id: tile
    property string source
    property string title
    property bool current: false
    width: Theme.capsule
    height: width * 1.5

    Item {
        id: art
        anchors.fill: parent
        scale: tile.current ? 1.05 : 1
        Behavior on scale { NumberAnimation { duration: Theme.tBase; easing.type: Easing.OutCubic } }

        Rectangle {
            id: frame
            anchors.fill: parent
            radius: Theme.rMd
            color: Theme.surface
            clip: true

            Image {
                id: img
                anchors.fill: parent
                source: tile.source
                fillMode: Image.PreserveAspectCrop
                asynchronous: true
                smooth: true
                opacity: status === Image.Ready ? 1 : 0
                Behavior on opacity { NumberAnimation { duration: Theme.tSlow; easing.type: Easing.OutCubic } }
            }
            Text {
                anchors { fill: parent; margins: Theme.s3 }
                visible: img.status === Image.Error
                text: tile.title
                color: Theme.fg2
                wrapMode: Text.Wrap
                horizontalAlignment: Text.AlignHCenter
                verticalAlignment: Text.AlignVCenter
                font { family: Theme.font; pixelSize: Theme.tSm; weight: Font.DemiBold }
            }
        }

        // The focus ring, inside the art so it is never clipped.
        Rectangle {
            anchors.fill: parent
            radius: Theme.rMd
            color: "transparent"
            border { width: 3; color: "white" }
            opacity: tile.current ? 1 : 0
            Behavior on opacity { NumberAnimation { duration: Theme.tFast } }
        }
    }
}
