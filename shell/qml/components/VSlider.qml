// Numeric setting (the mockup's VSlider). Left/right step the value while focused; drag or tap
// the track with a pointer. The tick sound rises in pitch with the value.
import QtQuick
import dev.vanta.shell

VControl {
    id: s

    property string key
    property real value: 50
    property real from: 0
    property real to: 100
    property real step: 5
    property var format: v => v + "%"
    readonly property real current: key ? Settings[key] : value
    readonly property real pos: Math.max(0, Math.min(1, (current - from) / (to - from)))
    signal changed(real value)

    activateSound: ""
    activateHaptic: ""
    belowHeight: unsupported ? 0 : 4

    // A does nothing on a slider; the value moves with left/right.
    function activate() {}

    function setValue(v, feedback) {
        const clamped = Math.min(to, Math.max(from, Math.round(v / step) * step))
        if (clamped === current) {
            if (feedback !== false) Haptics.play("slider")
            return
        }
        if (key) Settings.set(key, clamped)
        else value = clamped
        if (feedback !== false) {
            Sound.play("slider", { t: (clamped - from) / (to - from) })
            Haptics.play("slider")
        }
        changed(clamped)
    }

    function handleDirection(dir) {
        if (unsupported) return false
        if (dir === "left" || dir === "right") {
            setValue(current + (dir === "right" ? step : -step))
            return true
        }
        return false
    }

    VText {
        visible: !s.unsupported
        text: s.format(s.current)
        size: Theme.tSm
        weight: Font.DemiBold
        color: s.focused ? Theme.fg : Theme.fg2
        anchors.verticalCenter: parent.verticalCenter
    }

    below: Item {
        width: parent ? parent.width : 0
        height: 4
        visible: !s.unsupported
        Rectangle {
            anchors.fill: parent
            radius: 2
            color: Theme.track
        }
        Rectangle {
            width: parent.width * s.pos
            height: parent.height
            radius: 2
            color: Theme.accent
            Behavior on width { NumberAnimation { duration: Theme.tFast; easing.type: Easing.OutCubic } }
        }
        Rectangle {
            width: 0.875 * Theme.rem
            height: width
            radius: width / 2
            color: "#ffffff"
            x: parent.width * s.pos - width / 2
            anchors.verticalCenter: parent.verticalCenter
            scale: s.focused ? 1.2 : 1
            Behavior on x { NumberAnimation { duration: Theme.tFast; easing.type: Easing.OutCubic } }
            Behavior on scale { NumberAnimation { duration: Theme.tFast } }
        }
        MouseArea {
            anchors.fill: parent
            anchors.topMargin: -0.8 * Theme.rem
            anchors.bottomMargin: -0.8 * Theme.rem
            function seek(x) { s.setValue(s.from + Math.max(0, Math.min(1, x / width)) * (s.to - s.from)) }
            onPressed: mouse => { if (!s.inactive) seek(mouse.x) }
            onPositionChanged: mouse => { if (pressed && !s.inactive) seek(mouse.x) }
        }
    }
}
