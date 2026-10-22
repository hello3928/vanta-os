// VRow: a titled horizontal shelf of capsules. Left/right move; the focused tile stays pinned
// toward the left edge as on Steam Deck.
import QtQuick
import dev.vanta.shell

FocusScope {
    id: row
    property string title
    property var games: []
    property alias currentIndex: list.currentIndex
    signal activated(var game)
    implicitHeight: heading.height + list.anchors.topMargin + list.height

    Text {
        id: heading
        x: Theme.gutter
        text: row.title
        color: Theme.fg
        font { family: Theme.font; pixelSize: Theme.tLg; weight: Font.DemiBold }
        lineHeightMode: Text.FixedHeight
        lineHeight: 1.3 * Theme.tLg
    }

    ListView {
        id: list
        // Room above and below the tiles for the focus lift, as in the mockup's track padding.
        // (A horizontal ListView sets its delegates' y, so the offset goes on the list.)
        anchors { left: parent.left; right: parent.right; top: heading.bottom; topMargin: 0.85 * Theme.rem }
        height: Theme.capsule * 1.5 + 1.4 * Theme.rem
        orientation: ListView.Horizontal
        spacing: Theme.s3
        leftMargin: Theme.gutter
        rightMargin: Theme.gutter
        focus: true
        clip: false
        model: row.games
        highlightRangeMode: ListView.ApplyRange
        preferredHighlightBegin: Theme.gutter
        preferredHighlightEnd: Theme.gutter + Theme.capsule * 2
        highlightMoveDuration: 260
        keyNavigationEnabled: true
        boundsBehavior: Flickable.StopAtBounds

        delegate: VTile {
            required property var modelData
            required property int index
            source: modelData.capsule
            title: modelData.title
            current: ListView.isCurrentItem && row.activeFocus
        }

        Keys.onReturnPressed: row.activated(row.games[currentIndex])
        Keys.onEnterPressed: row.activated(row.games[currentIndex])
    }
}
