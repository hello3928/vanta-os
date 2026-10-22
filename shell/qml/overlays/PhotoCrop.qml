// Position a photo inside a round mask (the mockup's PhotoCrop.js). Drag to move, wheel or pinch
// to zoom, or with a controller: the D-pad moves the photo while the stage is selected and the
// slider zooms. "Use photo" saves a 320×320 JPEG under ~/.config/vanta/profiles/.
import QtQuick
import dev.vanta.shell

Overlay {
    id: c

    property string source
    signal saved(string photo)

    readonly property real stageSize: Math.round(Math.min(height * 0.48, width * 0.8, 420))
    readonly property real circle: stageSize * 0.84
    readonly property real base: img.implicitWidth ? circle / Math.min(img.implicitWidth, img.implicitHeight) : 1
    property real zoom: 1
    property real ox: 0
    property real oy: 0
    readonly property real scaleNow: base * zoom
    readonly property real maxX: Math.max(0, img.implicitWidth * scaleNow / 2 - circle / 2)
    readonly property real maxY: Math.max(0, img.implicitHeight * scaleNow / 2 - circle / 2)

    z: 45
    exitMs: 210

    function clampPan() {
        ox = Math.max(-maxX, Math.min(maxX, ox))
        oy = Math.max(-maxY, Math.min(maxY, oy))
    }
    onZoomChanged: clampPan()

    function open() {
        isOpen = true
        shown = true
        Nav.pushScope(box, { onBack: () => c.close(true), initial: stage })
    }
    function close(silent) {
        if (!isOpen) return
        if (!silent) Sound.play("close")
        Nav.popScope(box)
        finish()
    }

    function save() {
        out.grabToImage(r => {
            const dir = Profiles.photoDir
            App.sys.writeText(dir + "/.keep", "")
            const path = dir + "/" + Date.now().toString(36) + ".jpg"
            r.saveToFile(path)
            c.close(true)
            c.saved("file://" + path)
        }, Qt.size(320, 320))
    }

    Rectangle {
        anchors.fill: parent
        color: Theme.bg
        opacity: c.shown ? 1 : 0
        Behavior on opacity { NumberAnimation { duration: c.shown ? Theme.tSlow : 200 } }
        MouseArea { anchors.fill: parent }
    }

    Column {
        id: box
        anchors.centerIn: parent
        anchors.verticalCenterOffset: -Theme.hintH / 2
        width: Math.min(30 * Theme.rem, c.width - 32)
        spacing: Theme.s4
        opacity: c.shown ? 1 : 0
        scale: c.shown ? 1 : 0.97
        Behavior on opacity { NumberAnimation { duration: Theme.tSlow } }
        Behavior on scale { NumberAnimation { duration: Theme.tSlow; easing.type: Easing.OutCubic } }

        Column {
            width: parent.width
            spacing: Theme.s1
            VText { text: I18n.t("cropTitle"); size: Theme.tXl; weight: Font.DemiBold; color: Theme.fg }
            VText { width: parent.width; text: I18n.t("cropHint"); size: Theme.tSm; color: Theme.fg3; wrapMode: Text.Wrap }
        }

        VFocusable {
            id: stage
            width: c.stageSize
            height: c.stageSize
            anchors.horizontalCenter: parent.horizontalCenter
            activateSound: ""
            activateHaptic: ""
            function activate() {}
            function handleDirection(dir) {
                // Down past the bottom edge of the photo leaves the stage for the slider.
                if (dir === "down" && c.oy >= c.maxY - 0.5) return false
                const step = 14
                const d = { left: [step, 0], right: [-step, 0], up: [0, step], down: [0, -step] }[dir]
                c.ox += d[0]
                c.oy += d[1]
                c.clampPan()
                return true
            }
            Rectangle {
                anchors.fill: parent
                anchors.margins: -2
                radius: Theme.rMd + 2
                color: "transparent"
                border.width: 2
                border.color: "#ffffff"
                visible: stage.focused
            }
            Item {
                anchors.fill: parent
                clip: true
                Image {
                    id: img
                    source: c.source ? "file://" + c.source : ""
                    width: implicitWidth * c.scaleNow
                    height: implicitHeight * c.scaleNow
                    x: c.stageSize / 2 + c.ox - width / 2
                    y: c.stageSize / 2 + c.oy - height / 2
                    asynchronous: true
                    smooth: true
                }
                // Dim outside the circle, with a white ring.
                Rectangle {
                    anchors.centerIn: parent
                    width: c.circle + 2 * c.stageSize
                    height: width
                    radius: width / 2
                    color: "transparent"
                    border.width: c.stageSize
                    border.color: Qt.rgba(8 / 255, 10 / 255, 14 / 255, 0.66)
                }
                Rectangle {
                    anchors.centerIn: parent
                    width: c.circle
                    height: width
                    radius: width / 2
                    color: "transparent"
                    border.width: 2
                    border.color: Qt.rgba(1, 1, 1, 0.9)
                }
            }
            MouseArea {
                anchors.fill: parent
                property point last
                onPressed: mouse => last = Qt.point(mouse.x, mouse.y)
                onPositionChanged: mouse => {
                    c.ox += mouse.x - last.x
                    c.oy += mouse.y - last.y
                    c.clampPan()
                    last = Qt.point(mouse.x, mouse.y)
                }
                onWheel: wheel => c.zoom = Math.max(1, Math.min(4, c.zoom * Math.pow(1.0015, wheel.angleDelta.y)))
            }
            PinchHandler {
                target: null
                onActiveScaleChanged: c.zoom = Math.max(1, Math.min(4, c.zoom * activeScale / (lastScale || 1)))
                property real lastScale: 1
                onActiveChanged: lastScale = 1
            }
        }

        VSlider {
            label: I18n.t("zoom")
            icon: "zoom_in"
            from: 100
            to: 400
            step: 10
            value: Math.round(c.zoom * 10) * 10
            format: v => v + "%"
            onChanged: v => c.zoom = v / 100
        }
        Row {
            readonly property bool focusGroup: true
            anchors.right: parent.right
            spacing: Theme.s2
            VButton { label: I18n.t("cancel"); onActivated: c.close() }
            VButton { label: I18n.t("usePhoto"); variant: "primary"; onActivated: c.save() }
        }
    }

    // What gets saved: the circle's square, at 320×320.
    Item {
        id: out
        visible: true
        opacity: 0
        width: 320
        height: 320
        clip: true
        readonly property real k: 320 / c.circle
        Image {
            source: img.source
            width: img.implicitWidth * c.scaleNow * out.k
            height: img.implicitHeight * c.scaleNow * out.k
            x: 160 + c.ox * out.k - width / 2
            y: 160 + c.oy * out.k - height / 2
            smooth: true
        }
    }

    VHintBar {
        anchors { left: parent.left; right: parent.right; bottom: parent.bottom }
        hints: [["accept", I18n.t("select")], ["back", I18n.t("cancel")]]
        opacity: c.shown ? 1 : 0
    }
}
