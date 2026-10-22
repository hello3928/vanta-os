// Base for a page. App.go() creates it with `app` and `params`; the page declares `shell`
// ({ title, hints, topbar, hintbar, strip, topbarNav }) for the shared bars, and may define
// enter(), onBack() (return true when handled), onOptions() and onTab(d).
// Pages crossfade: the new one fades in over the old, which is then destroyed.
import QtQuick
import dev.vanta.shell

Item {
    id: s

    property var app: null
    property var params: ({})
    property string navKey
    property string screenName
    property var shell: ({})
    property color background: Theme.bg

    anchors.fill: parent

    function enter_fade() {
        opacity = 0
        fadeIn.start()
    }
    function leave() { fadeOut.start() }
    function onBack() { return false }

    Rectangle {
        anchors.fill: parent
        color: s.background
    }

    NumberAnimation { id: fadeIn; target: s; property: "opacity"; to: 1; duration: Theme.tBase; easing.type: Easing.OutCubic }
    NumberAnimation { id: fadeOut; target: s; property: "opacity"; to: 0; duration: Theme.tFast; easing.type: Easing.InCubic }
}
