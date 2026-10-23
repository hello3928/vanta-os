// A game's logo art, left-aligned and sitting on its baseline, with a soft shadow so it reads on
// any art. Games without logo art (emulated, or where it can't load) show their title instead.
import QtQuick
import QtQuick.Effects
import dev.vanta.shell

Item {
    id: l

    property var game: null
    property real shadow: 0.5
    property int align: Image.AlignLeft
    readonly property string src: game && game.art && game.art.logo ? game.art.logo : ""
    readonly property bool useTitle: !src || img.status === Image.Error

    Image {
        id: img
        anchors.fill: parent
        source: l.src
        fillMode: Image.PreserveAspectFit
        horizontalAlignment: l.align
        verticalAlignment: Image.AlignBottom
        asynchronous: true
        sourceSize.width: Math.ceil(l.width * 1.5)
        visible: false
    }
    Connections {
        target: System
        function onNetEpochChanged() { App.reloadIfFailed(img, () => l.src) }
    }
    MultiEffect {
        anchors.fill: img
        source: img
        visible: !l.useTitle && img.status === Image.Ready
        shadowEnabled: true
        shadowColor: Qt.rgba(0, 0, 0, l.shadow)
        shadowVerticalOffset: 4
        shadowBlur: 0.6
    }
    VText {
        visible: l.useTitle
        anchors { left: l.align === Image.AlignHCenter ? undefined : parent.left; bottom: parent.bottom }
        anchors.horizontalCenter: l.align === Image.AlignHCenter ? parent.horizontalCenter : undefined
        width: parent.width
        horizontalAlignment: l.align === Image.AlignHCenter ? Text.AlignHCenter : Text.AlignLeft
        text: l.game ? l.game.title : ""
        size: Math.min(Theme.t3xl, l.height * 0.42)
        weight: Font.Bold
        color: Theme.fg
        wrapMode: Text.Wrap
        maximumLineCount: 2
        style: Text.Normal
    }
}
