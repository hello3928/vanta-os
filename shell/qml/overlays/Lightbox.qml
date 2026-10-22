// Full-screen screenshot viewer (the mockup's Lightbox.js). Left/right (or swipe) moves between
// shots, A goes to the next one, B closes.
import QtQuick
import dev.vanta.shell

Overlay {
    id: lb

    property var urls: []
    property int index: 0
    property string title

    z: 40
    exitMs: 210

    function open() {
        isOpen = true
        shown = true
        Sound.play("open")
        Nav.pushScope(stage, { onBack: () => lb.close(true), initial: stage })
    }
    function close(silent) {
        if (!isOpen) return
        if (!silent) Sound.play("close")
        Nav.popScope(stage)
        finish()
    }
    function step(d) {
        index = (index + d + urls.length) % urls.length
        Sound.play("move")
        Haptics.play("tick")
        slideIn.from = d * 40
        slideIn.restart()
        fadeIn.restart()
    }

    Rectangle {
        anchors.fill: parent
        color: "#000000"
        opacity: lb.shown ? 1 : 0
        Behavior on opacity { NumberAnimation { duration: lb.shown ? 260 : 200 } }
    }

    VFocusable {
        id: stage
        anchors.fill: parent
        activateSound: ""
        activateHaptic: ""
        opacity: lb.shown ? 1 : 0
        Behavior on opacity { NumberAnimation { duration: lb.shown ? 260 : 200 } }
        function activate() { lb.step(1) }
        function handleDirection(dir) {
            if (dir === "left" || dir === "right") {
                lb.step(dir === "right" ? 1 : -1)
                return true
            }
            return true
        }
        Image {
            id: img
            x: Theme.gutter
            y: 3 * Theme.rem
            width: parent.width - 2 * Theme.gutter
            height: parent.height - y - Theme.hintH - Theme.rem
            source: lb.urls[lb.index] || ""
            fillMode: Image.PreserveAspectFit
            asynchronous: true
            transform: Translate { id: shift }
        }
        MouseArea {
            anchors.fill: parent
            property real x0: -1
            onPressed: mouse => x0 = mouse.x
            onReleased: mouse => {
                if (x0 >= 0 && Math.abs(mouse.x - x0) > 50) lb.step(mouse.x < x0 ? 1 : -1)
                else lb.step(1)
                x0 = -1
            }
        }
    }
    NumberAnimation { id: slideIn; target: shift; property: "x"; to: 0; duration: 320; easing.type: Easing.OutCubic }
    NumberAnimation { id: fadeIn; target: img; property: "opacity"; from: 0.2; to: 1; duration: 320 }

    VText {
        x: Theme.gutter
        y: Theme.s4
        text: lb.title + "  ·  " + (lb.index + 1) + " / " + lb.urls.length
        size: Theme.tSm
        weight: Font.DemiBold
        opacity: lb.shown ? 1 : 0
    }
    VHintBar {
        anchors { left: parent.left; right: parent.right; bottom: parent.bottom }
        plain: true
        hints: [["accept", "→"], ["back", I18n.t("back")]]
        opacity: lb.shown ? 1 : 0
    }
}
