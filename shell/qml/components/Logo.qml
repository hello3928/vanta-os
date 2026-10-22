// The Vanta OS logo, Orbit (the mockup's brand.js): three arcs of falling radius around a centre
// point, the middle one a shade dimmer. Geometry on a 100×100 grid. draw() plays the welcome
// draw-in: the arcs stroke in one after another while the mark turns into place, then the core
// pops in.
import QtQuick
import QtQuick.Shapes
import dev.vanta.shell

Item {
    id: logo

    property real size: 64
    property color color: "#ffffff"
    // 0 → 1 per arc while drawing in; 1 when shown normally.
    property real p1: 1
    property real p2: 1
    property real p3: 1
    property real core: 1

    // [radius, start angle, end angle, opacity]; angles in degrees, 0 = up, clockwise.
    readonly property var arcs: [[42, 0, 240, 1], [28, 68, 343, 0.6], [14, 180, 300, 1]]

    width: size
    height: size

    function draw() {
        p1 = p2 = p3 = core = 0
        turn.rotation = -50
        turn.scale = 0.92
        drawIn.restart()
    }

    Item {
        id: turn
        width: logo.size
        height: logo.size

        Item {
            width: 100
            height: 100
            transform: Scale { xScale: logo.size / 100; yScale: logo.size / 100 }

            Repeater {
                model: 3
                Shape {
                    id: arc
                    required property int index
                    readonly property var a: logo.arcs[index]
                    readonly property real progress: index === 0 ? logo.p1 : index === 1 ? logo.p2 : logo.p3
                    anchors.fill: parent
                    opacity: a[3]
                    preferredRendererType: Shape.CurveRenderer
                    ShapePath {
                        strokeColor: logo.color
                        strokeWidth: 7
                        fillColor: "transparent"
                        capStyle: ShapePath.RoundCap
                        PathAngleArc {
                            centerX: 50
                            centerY: 50
                            radiusX: arc.a[0]
                            radiusY: arc.a[0]
                            startAngle: arc.a[1] - 90
                            sweepAngle: (arc.a[2] - arc.a[1]) * Math.max(0.001, arc.progress)
                        }
                    }
                    visible: progress > 0
                }
            }
            Rectangle {
                x: 50 - 4.5
                y: 50 - 4.5
                width: 9
                height: 9
                radius: 4.5
                color: logo.color
                scale: logo.core
                opacity: logo.core
            }
        }
    }

    ParallelAnimation {
        id: drawIn
        NumberAnimation { target: turn; property: "rotation"; to: 0; duration: 1400; easing.type: Easing.BezierSpline; easing.bezierCurve: [0.16, 1, 0.3, 1, 1, 1] }
        NumberAnimation { target: turn; property: "scale"; to: 1; duration: 1400; easing.type: Easing.BezierSpline; easing.bezierCurve: [0.16, 1, 0.3, 1, 1, 1] }
        NumberAnimation { target: logo; property: "p1"; to: 1; duration: 900; easing.type: Easing.BezierSpline; easing.bezierCurve: [0.33, 1, 0.68, 1, 1, 1] }
        SequentialAnimation {
            PauseAnimation { duration: 140 }
            NumberAnimation { target: logo; property: "p2"; to: 1; duration: 900; easing.type: Easing.BezierSpline; easing.bezierCurve: [0.33, 1, 0.68, 1, 1, 1] }
        }
        SequentialAnimation {
            PauseAnimation { duration: 280 }
            NumberAnimation { target: logo; property: "p3"; to: 1; duration: 900; easing.type: Easing.BezierSpline; easing.bezierCurve: [0.33, 1, 0.68, 1, 1, 1] }
        }
        SequentialAnimation {
            PauseAnimation { duration: 520 }
            NumberAnimation { target: logo; property: "core"; to: 1; duration: 500; easing.type: Easing.BezierSpline; easing.bezierCurve: [0.33, 1, 0.68, 1, 1, 1] }
        }
    }
}
