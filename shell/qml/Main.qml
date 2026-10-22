// The shell window: one page at a time under a shared top bar and hint bar (the mockup's shell).
import QtQuick
import QtQuick.Window
import dev.vanta.shell

Window {
    id: window
    width: 1280
    height: 800
    visible: true
    visibility: Qt.platform.os === "linux" && Qt.application.arguments.indexOf("--window") < 0 && !system.screenshotPath ? Window.FullScreen : Window.Windowed
    color: Theme.bg
    title: system.osName

    System { id: system }
    Library { id: library }

    // Window.color isn't part of grabToImage, so paint the page colour as an item too.
    Rectangle { anchors.fill: parent; color: Theme.bg }

    FontLoader { source: "file://" + system.dataDir + "/fonts/Figtree.ttf" }

    // The mockup's root font size: clamp(13px, 0.5vw + 9.5px, 20px).
    function scaleType() {
        Theme.width = width
        Theme.height = height
        Theme.rem = Math.max(13, Math.min(20, width * 0.005 + 9.5))
    }
    onWidthChanged: scaleType()
    onHeightChanged: scaleType()
    Component.onCompleted: scaleType()

    Home {
        id: home
        anchors.fill: parent
        library: library
        dataDir: system.dataDir
        focus: true
    }

    VTopBar {
        anchors { left: parent.left; right: parent.right; top: parent.top }
        dataDir: system.dataDir
    }

    VHintBar {
        anchors { left: parent.left; right: parent.right; bottom: parent.bottom }
        hints: [["Enter", qsTr("Open")], ["X", qsTr("Trailer")], ["Q", qsTr("Quick access")], ["M", qsTr("Menu")]]
    }

    // VANTA_SCREENSHOT=/path.png: save one frame once art has had time to load, then quit.
    Timer {
        running: system.screenshotPath !== ""
        interval: 4000
        onTriggered: window.contentItem.grabToImage(r => { r.saveToFile(system.screenshotPath); Qt.quit() })
    }
}
