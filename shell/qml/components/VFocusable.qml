// Base for everything you can focus (the mockup's VComponent): focus, activation, sound and
// haptics behave the same everywhere. Subclasses build their look from `focused` and `pressed`
// and override activate(), handleDirection() or handleBack() where they differ.
// The mouse moves focus only after it really moves (Nav.device becomes "pointer"), so a resting
// cursor never steals focus from the controller. On touch, art tiles focus on the first tap and
// open on the second.
import QtQuick
import dev.vanta.shell

Item {
    id: root

    property bool focusable: true
    property bool focused: false
    property bool disabled: false
    // Shown but not usable on this device or for this game; the reason shows on the second line.
    property string unsupported: ""
    readonly property bool inactive: disabled || unsupported !== ""
    property string focusSound: "move"
    property string activateSound: "select"
    property string activateHaptic: "select"
    property bool pressed: false
    property bool tapToFocusFirst: false
    // Focusing this item scrolls its page back to the top (the mockup's data-scroll-top).
    property bool scrollTop: false

    signal activated()
    signal optionsPressed()
    signal edge(string dir)
    signal focusIn()
    signal focusOut()

    function setFocused(on, silent) {
        focused = on
        if (on) {
            if (!silent) {
                Sound.play(focusSound)
                Haptics.play("tick")
            }
            focusIn()
        } else focusOut()
    }

    function activate() {
        if (inactive) {
            Sound.play("error")
            Haptics.play("error")
            return
        }
        if (activateSound) Sound.play(activateSound)
        if (activateHaptic) Haptics.play(activateHaptic)
        press()
        activated()
    }

    // Quick squash so every press has physical feedback, from any input.
    function press() {
        pressed = true
        pressTimer.restart()
    }
    function options() { optionsPressed() }
    // Return true to use a direction (sliders use left/right).
    function handleDirection(dir) { return false }
    function handleBack() { return false }

    Timer {
        id: pressTimer
        interval: 130
        onTriggered: root.pressed = false
    }

    MouseArea {
        anchors.fill: parent
        hoverEnabled: true
        onPositionChanged: if (Nav.device === "pointer" && !root.focused && Nav.inScope(root) && Nav.usable(root)) Nav.focus(root)
        onClicked: {
            if (!Nav.inScope(root)) return
            if (root.tapToFocusFirst && !root.focused && Nav.device === "touch") {
                Nav.focus(root)
                return
            }
            if (!root.focused) Nav.focus(root, true)
            root.activate()
        }
    }

    Component.onCompleted: Nav.register(root)
    Component.onDestruction: Nav.unregister(root)
}
