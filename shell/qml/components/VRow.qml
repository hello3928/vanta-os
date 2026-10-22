// A titled horizontal shelf (the mockup's VRow). It's a focus group, so it remembers the last
// focused item. alignStart keeps the focused item pinned to the left edge, console style.
// Room above and below the tiles keeps a focused tile's lift from being cut off.
import QtQuick
import dev.vanta.shell

Column {
    id: row

    property string title
    property string meta
    property bool alignStart: false
    readonly property bool focusGroup: true
    readonly property bool revealBlock: true
    default property alias items: track.data
    property alias track: track
    property alias scroller: scroller

    width: parent ? parent.width : 0

    Item {
        width: row.width
        height: row.title ? head.height : 0
        visible: row.title !== ""
        Row {
            id: head
            x: Theme.gutter
            spacing: Theme.s3
            VText {
                text: row.title
                size: Theme.tLg
                weight: Font.DemiBold
                color: Theme.fg
                lineHeightMode: Text.FixedHeight
                lineHeight: 1.3 * Theme.tLg
            }
            VText {
                visible: row.meta !== ""
                text: row.meta
                size: Theme.tSm
                color: Theme.fg3
                anchors.baseline: parent.children[0].baseline
            }
        }
    }

    VScroll {
        id: scroller
        horizontal: true
        alignStart: row.alignStart
        padStart: Theme.gutter
        padEnd: Theme.gutter
        width: row.width
        height: track.height + 0.85 * Theme.rem + 1.4 * Theme.rem
        contentWidth: track.width + 2 * Theme.gutter
        contentHeight: height
        Row {
            id: track
            x: Theme.gutter
            y: 0.85 * Theme.rem
            spacing: Theme.s3
        }
    }
    // The mockup's track has margin-bottom: -0.4rem.
    bottomPadding: -0.4 * Theme.rem
}
