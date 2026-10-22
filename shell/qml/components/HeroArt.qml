// A game's wide art, cropped to fill like the mockup's heroes (object-fit: cover, centred
// horizontally, `focusY` down from the top). Steam games use their library hero. Emulated games
// have no hero, so like Steam does for games without art it's built from what exists: the box
// art blurred into a colour wash, with the real game screen on top in a frame, scaled without
// smoothing so pixels stay square.
import QtQuick
import QtQuick.Effects
import dev.vanta.shell

Item {
    id: h

    property var game: null
    property real focusY: retro ? 0.12 : 0.25
    readonly property bool retro: !!game && game.source === "emu"
    readonly property bool ready: retro ? (box.status !== Image.Loading && snap.status !== Image.Loading) : hero.status === Image.Ready || hero.status === Image.Error
    readonly property bool failed: retro ? box.status === Image.Error && snap.status === Image.Error : hero.status === Image.Error
    clip: true

    // Steam hero
    Image {
        id: hero
        visible: !h.retro
        readonly property real ratio: implicitHeight > 0 ? implicitWidth / implicitHeight : 3.1
        width: Math.max(h.width, h.height * ratio)
        height: width / ratio
        x: (h.width - width) / 2
        y: (h.height - height) * h.focusY
        source: h.game && !h.retro ? h.game.art.hero : ""
        sourceSize.height: Math.min(1240, Math.ceil(h.height))
        asynchronous: true
    }

    // Retro: a 16:9 composite that covers the area.
    Item {
        id: comp
        visible: h.retro
        width: Math.max(h.width, h.height * 16 / 9)
        height: width * 9 / 16
        x: (h.width - width) / 2
        y: (h.height - height) * h.focusY
        Rectangle { anchors.fill: parent; color: "#14171c" }
        Image {
            id: box
            anchors.centerIn: parent
            width: parent.width * 1.15
            height: parent.height * 1.15
            fillMode: Image.PreserveAspectCrop
            source: h.retro ? (h.game.art.box || h.game.art.snap) : ""
            asynchronous: true
            sourceSize.width: 400
            visible: false
        }
        MultiEffect {
            anchors.fill: box
            source: box
            visible: box.status === Image.Ready
            blurEnabled: true
            blurMax: 64
            blur: 1
            saturation: 0.25
            brightness: -0.45
        }
        Rectangle {
            visible: snap.status === Image.Ready
            x: snap.x - 6
            y: snap.y - 6
            width: snap.width + 12
            height: snap.height + 12
            color: "#000000"
        }
        Image {
            id: snap
            readonly property real ratio: implicitHeight > 0 ? implicitWidth / implicitHeight : 4 / 3
            height: Math.round(comp.height * 0.32)
            width: Math.round(height * ratio)
            x: Math.round(comp.width * 0.92 - width)
            y: Math.round(comp.height * 0.085)
            source: h.retro ? h.game.art.snap : ""
            smooth: false
            asynchronous: true
        }
    }
}
