// A scrolling area that Nav keeps the focused item inside, with eased scrolling: shelves glide
// sideways, pages and panels vertically. Drag and touch work too.
import QtQuick
import dev.vanta.shell

Flickable {
    id: f

    readonly property bool isVScroll: true
    property bool horizontal: false
    // Pin the focused item to the start edge (console shelves) instead of nearest.
    property bool alignStart: false
    // Pages keep more room above and below the focused item than panels do.
    property bool pageScroll: false
    property real padStart: 0
    property real padEnd: 0

    flickableDirection: horizontal ? Flickable.HorizontalFlick : Flickable.VerticalFlick
    boundsBehavior: Flickable.StopAtBounds
    clip: true
    pressDelay: 0

    function scrollTo(x, y) {
        if (x !== null && x !== undefined) {
            animX.stop()
            animX.to = Math.max(0, Math.min(Math.max(0, contentWidth - width), x))
            if (Math.abs(animX.to - contentX) >= 1) animX.start()
        }
        if (y !== null && y !== undefined) {
            animY.stop()
            animY.to = Math.max(0, Math.min(Math.max(0, contentHeight - height), y))
            if (Math.abs(animY.to - contentY) >= 1) animY.start()
        }
    }

    NumberAnimation { id: animX; target: f; property: "contentX"; duration: 360; easing.type: Easing.OutCubic }
    NumberAnimation { id: animY; target: f; property: "contentY"; duration: 360; easing.type: Easing.OutCubic }
}
