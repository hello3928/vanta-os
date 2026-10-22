// Loading bar (the mockup's VProgress): determinate (value 0..1) or indeterminate (a moving
// segment), with an optional label and percentage. tone: accent | good | light.
import QtQuick
import dev.vanta.shell

Column {
    id: p

    property real value: 0
    property bool indeterminate: false
    property string label
    property bool showValue: true
    property string size: "md"
    property string tone: "accent"

    width: parent ? parent.width : 300
    spacing: Theme.s2

    Item {
        width: parent.width
        height: Math.max(l.implicitHeight, v.implicitHeight)
        visible: p.label !== "" || p.showValue
        VText {
            id: l
            width: parent.width - v.width - Theme.s3
            text: p.label
            size: Theme.tSm
        }
        VText {
            id: v
            anchors.right: parent.right
            text: p.showValue && !p.indeterminate ? Math.round(p.value * 100) + "%" : ""
            size: Theme.tSm
            color: Theme.fg3
            font.features: { "tnum": 1 }
        }
    }
    Rectangle {
        width: parent.width
        height: p.size === "sm" ? 4 : p.size === "lg" ? 8 : 6
        radius: height / 2
        color: Theme.track
        clip: true
        Rectangle {
            id: fill
            height: parent.height
            radius: parent.radius
            color: p.tone === "good" ? Theme.good : p.tone === "light" ? Theme.light : Theme.accent
            width: p.indeterminate ? parent.width * 0.38 : parent.width * p.value
            Behavior on width { enabled: !p.indeterminate; NumberAnimation { duration: Theme.tSlow; easing.type: Easing.OutCubic } }
        }
        NumberAnimation {
            target: fill
            property: "x"
            from: -fill.width
            to: fill.parent.width * 1.0
            duration: 1400
            easing.type: Easing.BezierSpline
            easing.bezierCurve: Theme.easeInOut
            loops: Animation.Infinite
            running: p.indeterminate && p.visible
            onRunningChanged: if (!running) fill.x = 0
        }
    }
}
