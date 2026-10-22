// Base for everything that opens over the page: panels, dialogs, menus, the keyboard.
// App.open() creates it in the overlay layer and calls open(); it calls finish() when it's gone.
import QtQuick
import dev.vanta.shell

Item {
    id: o

    property var app: null
    property bool shown: false
    property bool isOpen: false
    property int exitMs: 240
    signal closed()

    anchors.fill: parent

    function open() {
        isOpen = true
        shown = true
    }

    // Overlays override close(silent) and call finish() at the end.
    function close(silent) { finish() }

    function finish() {
        if (!isOpen) return
        isOpen = false
        shown = false
        closed()
        App.later(exitMs, () => o.destroy())
    }
}
