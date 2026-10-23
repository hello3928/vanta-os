// Spinning wheel for short waits. size: sm | md | lg.
// tone: accent | light | muted. Use VProgress when progress is known.
import QtQuick
import QtQuick.Shapes
import dev.vanta.shell

Item {
    id: s

    property string size: "md"
    property string tone: "accent"
    readonly property color color: tone === "light" ? Theme.light : tone === "muted" ? Theme.fg3 : Theme.accent

    width: (size === "sm" ? 1.125 : size === "lg" ? 2.75 : 1.5) * Theme.rem
    height: width

    Shape {
        anchors.fill: parent
        preferredRendererType: Shape.CurveRenderer
        ShapePath {
            strokeColor: Qt.rgba(s.color.r, s.color.g, s.color.b, 0.18)
            strokeWidth: s.width * 2.5 / 24
            fillColor: "transparent"
            PathAngleArc { centerX: s.width / 2; centerY: s.width / 2; radiusX: s.width * 10 / 24; radiusY: radiusX; startAngle: 0; sweepAngle: 360 }
        }
    }
    Shape {
        anchors.fill: parent
        preferredRendererType: Shape.CurveRenderer
        RotationAnimation on rotation {
            from: 0
            to: 360
            duration: 800
            loops: Animation.Infinite
            running: s.visible
        }
        ShapePath {
            strokeColor: s.color
            strokeWidth: s.width * 2.5 / 24
            fillColor: "transparent"
            capStyle: ShapePath.RoundCap
            PathAngleArc { centerX: s.width / 2; centerY: s.width / 2; radiusX: s.width * 10 / 24; radiusY: radiusX; startAngle: -90; sweepAngle: 100 }
        }
    }
}
