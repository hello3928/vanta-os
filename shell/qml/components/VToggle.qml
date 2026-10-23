// On/off row. `key` ties it to a setting; otherwise it keeps `value`.
// Separate sounds for on and off, played after the change so turning sounds on is audible.
import QtQuick
import dev.vanta.shell

VControl {
    id: t

    property string key
    property bool value: false
    readonly property bool on: unsupported ? false : key ? !!Settings[key] : value
    signal changed(bool on)

    activateSound: ""
    activateHaptic: ""

    function activate() {
        if (inactive) {
            Sound.play("error")
            Haptics.play("error")
            return
        }
        const next = !on
        if (key) Settings.set(key, next)
        else value = next
        Sound.play(next ? "toggleOn" : "toggleOff")
        Haptics.play("toggle")
        press()
        changed(next)
    }

    Rectangle {
        width: 2.75 * Theme.rem
        height: 1.55 * Theme.rem
        radius: height / 2
        color: t.on ? Theme.accent : Theme.track
        anchors.verticalCenter: parent.verticalCenter
        Behavior on color { ColorAnimation { duration: Theme.tBase } }
        Rectangle {
            width: 1.15 * Theme.rem
            height: width
            radius: width / 2
            y: 0.2 * Theme.rem
            x: t.on ? 1.4 * Theme.rem : 0.2 * Theme.rem
            color: t.on ? "#ffffff" : Theme.fg3
            Behavior on x { NumberAnimation { duration: Theme.tBase; easing.type: Easing.BezierSpline; easing.bezierCurve: Theme.easeOut } }
            Behavior on color { ColorAnimation { duration: Theme.tBase } }
        }
    }
}
