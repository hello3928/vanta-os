// A piece of art you can focus: game capsules (2:3), landscape tiles and
// cards (16:9, with text underneath), and the small "Library" tile at the end of a shelf.
// Focus lifts it slightly with a 3 px white ring drawn inside the art, so it's never clipped.
// fit "box": retro box art shown whole over a blurred, darkened copy of itself.
import QtQuick
import QtQuick.Effects
import dev.vanta.shell

VFocusable {
    id: tile

    property string title
    property string src
    property string fit: "cover"
    property string shape: "capsule"
    property var badge: null
    property string glyph
    property bool more: false
    property string kicker
    property string subtitle
    property var game: null
    // Grids set the width to fill their columns; shelves use the shared capsule size.
    property real artWidth: 0

    readonly property real artW: artWidth > 0 ? artWidth : more ? Theme.capsule * 0.66 : shape === "landscape" ? Theme.capsule * 1.95 : shape === "card" ? Theme.capsule * 2.2 : Theme.capsule
    readonly property real artH: shape === "capsule" ? artW * 1.5 : artW * 9 / 16
    readonly property bool loaded: img.status === Image.Ready || img.status === Image.Error || src === ""

    tapToFocusFirst: true
    width: artW
    height: artH + (shape === "card" ? 0.6 * Theme.rem + texts.height : 0)

    Item {
        id: art
        width: tile.artW
        height: tile.artH
        scale: tile.pressed ? 1.03 : tile.focused ? 1.05 : 1
        Behavior on scale { NumberAnimation { duration: tile.pressed ? Theme.tInstant : Theme.tBase; easing.type: Easing.OutCubic } }

        Rectangle {
            id: frame
            anchors.fill: parent
            radius: Theme.rMd
            color: tile.more ? (tile.focused ? Theme.surface : Theme.bg2) : Theme.surface
            border.width: tile.more ? 1 : 0
            border.color: Theme.line
            layer.enabled: true
            layer.effect: MultiEffect {
                maskEnabled: true
                maskSource: mask
            }

            // Retro box art: a blurred copy fills the frame behind the whole box.
            Image {
                id: wash
                anchors.fill: parent
                anchors.margins: -parent.width * 0.15
                visible: tile.fit === "box" && status === Image.Ready
                source: tile.fit === "box" ? tile.src : ""
                fillMode: Image.PreserveAspectCrop
                asynchronous: true
                sourceSize.width: 200
                layer.enabled: visible
                layer.effect: MultiEffect {
                    blurEnabled: true
                    blurMax: 48
                    blur: 1
                    brightness: -0.5
                    saturation: 0.2
                }
            }
            Image {
                id: img
                anchors.fill: parent
                anchors.leftMargin: tile.fit === "box" ? parent.width * 0.08 : 0
                anchors.rightMargin: anchors.leftMargin
                anchors.topMargin: tile.fit === "box" ? parent.height * 0.1 : 0
                anchors.bottomMargin: anchors.topMargin
                source: tile.src
                fillMode: tile.fit === "box" ? Image.PreserveAspectFit : Image.PreserveAspectCrop
                asynchronous: true
                sourceSize.width: Math.ceil(tile.artW * 2)
                opacity: status === Image.Ready ? 1 : 0
                Behavior on opacity { NumberAnimation { duration: Theme.tSlow; easing.type: Easing.OutCubic } }
            }
            // Where the art can't load, the title stands in for it.
            VText {
                anchors.fill: parent
                anchors.margins: Theme.s3
                visible: !tile.glyph && (img.status === Image.Error || tile.src === "")
                text: tile.title
                color: Theme.fg2
                weight: Font.DemiBold
                size: Theme.tSm
                wrapMode: Text.Wrap
                elide: Text.ElideRight
                horizontalAlignment: Text.AlignHCenter
                verticalAlignment: Text.AlignVCenter
            }
            Column {
                visible: tile.glyph !== ""
                anchors.centerIn: parent
                spacing: 0.45 * Theme.rem
                Icon {
                    name: tile.glyph
                    size: 1.8 * Theme.rem
                    color: tile.focused ? Theme.fg : Theme.fg3
                    anchors.horizontalCenter: parent.horizontalCenter
                }
                VText {
                    text: tile.title
                    size: Theme.tSm
                    weight: Font.DemiBold
                    color: tile.focused ? Theme.fg : Theme.fg3
                    anchors.horizontalCenter: parent.horizontalCenter
                }
            }
        }
        Rectangle {
            id: mask
            anchors.fill: parent
            radius: Theme.rMd
            visible: false
            layer.enabled: true
        }

        // Badges wait for the art, so a tile never shows a tag over an empty frame.
        VBadge {
            x: 0.4 * Theme.rem
            y: 0.4 * Theme.rem
            visible: !!tile.badge
            opacity: tile.loaded ? 1 : 0
            text: tile.badge ? tile.badge.text : ""
            tone: tile.badge && tile.badge.tone ? tile.badge.tone : "default"
            icon: tile.badge && tile.badge.icon ? tile.badge.icon : ""
            Behavior on opacity { NumberAnimation { duration: Theme.tSlow } }
        }

        // The focus ring, inside the art.
        Rectangle {
            anchors.fill: parent
            radius: Theme.rMd
            color: "transparent"
            border.width: 4
            border.color: Qt.rgba(0, 0, 0, 0.35)
            opacity: tile.focused ? 1 : 0
            Rectangle {
                anchors.fill: parent
                radius: Theme.rMd
                color: "transparent"
                border.width: 3
                border.color: "#ffffff"
            }
            Behavior on opacity { NumberAnimation { duration: Theme.tFast } }
        }
    }

    Column {
        id: texts
        visible: tile.shape === "card"
        y: tile.artH + 0.6 * Theme.rem
        width: tile.artW
        spacing: 0.15 * Theme.rem
        VText {
            visible: tile.kicker !== ""
            width: parent.width
            text: tile.kicker
            size: Theme.tXs
            weight: Font.DemiBold
            color: Theme.fg3
        }
        VText {
            width: parent.width
            text: tile.title
            size: Theme.tSm
            weight: Font.DemiBold
            color: tile.focused ? Theme.fg : Theme.fg2
            wrapMode: Text.Wrap
            maximumLineCount: 2
            lineHeight: 1.35
        }
        VText {
            visible: tile.subtitle !== ""
            width: parent.width
            text: tile.subtitle
            size: Theme.tXs
            color: Theme.fg3
        }
    }
}
