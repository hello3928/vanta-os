// A button prompt (the mockup's core/glyphs.js). The style follows the controller in use:
// Xbox (coloured letters), PlayStation (cross, circle, square, triangle), Nintendo (letters in
// Nintendo positions), Steam Deck (white letters), and keycaps for the keyboard. Settings >
// Controllers can force one style. Prompts name actions, not buttons: Glyph { action: "accept" }
// draws whatever button accepts on that pad. Drawn on the mockup's 24-unit grid, then scaled.
import QtQuick
import QtQuick.Shapes
import dev.vanta.shell

Item {
    id: g

    property string action
    property real glyphHeight: 1.55 * Theme.tSm
    // "keyboard" forces keycaps (the on-screen keyboard's own hints).
    property string forceDevice: ""

    readonly property var forcedFamilies: ({ Xbox: "xbox", PlayStation: "ps", Nintendo: "nintendo", "Steam Deck": "deck" })
    readonly property string forced: forcedFamilies[Settings.glyphs] || ""
    readonly property bool pad: forceDevice ? forceDevice === "gamepad" : (forced !== "" || Nav.device === "gamepad")
    readonly property string family: forced || (App.pads ? App.pads.family : "") || "xbox"

    readonly property var keys: ({ accept: "Enter", back: "Esc", options: "X", qam: "Q", mainMenu: "M", prevTab: "[", nextTab: "]", power: "P", up: "↑" })
    readonly property var faces: ({
        xbox: { south: ["A", "#5dc95d"], east: ["B", "#f05a5a"], west: ["X", "#4f9cf2"], north: ["Y", "#f2c94c"] },
        deck: { south: ["A", "#ffffff"], east: ["B", "#ffffff"], west: ["X", "#ffffff"], north: ["Y", "#ffffff"] },
        nintendo: { south: ["B", "#ffffff"], east: ["A", "#ffffff"], west: ["Y", "#ffffff"], north: ["X", "#ffffff"] },
        ps: { south: ["cross", "#8fb3ff"], east: ["circle", "#ff6b78"], west: ["square", "#f39ad8"], north: ["triangle", "#4fd8b4"] }
    })
    readonly property var shoulders: ({ xbox: ["LB", "RB"], deck: ["L1", "R1"], nintendo: ["L", "R"], ps: ["L1", "R1"] })
    readonly property var systemFor: ({
        xbox: { qam: "menu", mainMenu: "view" }, ps: { qam: "menu", mainMenu: "create" },
        nintendo: { qam: "plus", mainMenu: "minus" }, deck: { qam: "dots", mainMenu: "view" }
    })
    readonly property var systemPaths: ({
        menu: "M7.5 9h9M7.5 12h9M7.5 15h9",
        create: "M12 14.6V8.2M9.3 15.2L6.9 10M14.7 15.2l2.4-5.2",
        plus: "M12 7.5v9M7.5 12h9",
        minus: "M7.5 12h9"
    })
    readonly property var psPaths: ({
        cross: "M7.6 7.6l8.8 8.8M16.4 7.6l-8.8 8.8",
        triangle: "M12 6.6l5.6 9.6H6.4z"
    })

    // What to draw: keycap, face, shoulder, system, dpad.
    readonly property var spec: {
        if (!pad) return { kind: "key", text: keys[action] || action }
        switch (action) {
        case "accept": return { kind: "face", pos: "south" }
        case "back": return { kind: "face", pos: "east" }
        case "options": return { kind: "face", pos: "west" }
        case "prevTab": return { kind: "shoulder", text: shoulders[family][0] }
        case "nextTab": return { kind: "shoulder", text: shoulders[family][1] }
        case "up": return { kind: "dpad" }
        case "qam": case "mainMenu": return { kind: "system", name: systemFor[family][action] }
        default: return { kind: "key", text: action }
        }
    }
    readonly property real units: spec.kind === "key" ? Math.max(24, 10 + spec.text.length * 7.2)
                                : spec.kind === "shoulder" ? (spec.text.length > 1 ? 34 : 28) : 24
    readonly property real s: glyphHeight / 24

    width: units * s
    height: glyphHeight

    // Text at fractional sizes (10.5, 12.5): drawn at 4× and scaled down, centred where placed.
    component GText: Text {
        property real px: 10.5
        anchors.centerIn: parent
        font.family: Theme.font
        font.weight: Font.Bold
        font.variableAxes: ({ "wght": 700 })
        font.pixelSize: Math.round(px * 4)
        scale: 0.25
    }

    Item {
        width: g.units
        height: 24
        scale: g.s
        transformOrigin: Item.TopLeft

        // Keycap with a deeper bottom edge, sized to its label.
        Item {
            visible: g.spec.kind === "key"
            anchors.fill: parent
            Rectangle { x: 1; y: 2; width: parent.width - 2; height: 20; radius: 4.5; color: "#d7dce3" }
            Rectangle { x: 1; y: 2; width: parent.width - 2; height: 17.5; radius: 4.5; color: "#f4f6f9" }
            Item {
                x: 1; y: 2; width: parent.width - 2; height: 17.5
                GText { text: g.spec.text || ""; color: "#1a1f27" }
            }
        }

        // Round face and system buttons.
        Rectangle {
            visible: g.spec.kind === "face" || g.spec.kind === "system"
            x: 1; y: 1; width: 22; height: 22; radius: 11
            color: "#1f252e"
            border.width: 1
            border.color: Qt.rgba(1, 1, 1, 0.28)
        }
        GText {
            readonly property var face: g.spec.kind === "face" && g.family !== "ps" ? g.faces[g.family][g.spec.pos] : null
            visible: !!face
            px: 12.5
            text: face ? face[0] : ""
            color: face ? face[1] : "white"
        }
        Shape {
            id: psShape
            readonly property var face: g.spec.kind === "face" && g.family === "ps" ? g.faces.ps[g.spec.pos] : null
            readonly property string path: face && g.psPaths[face[0]] ? g.psPaths[face[0]] : ""
            visible: path !== ""
            anchors.fill: parent
            preferredRendererType: Shape.CurveRenderer
            ShapePath {
                strokeColor: psShape.face ? psShape.face[1] : "transparent"
                strokeWidth: 2.2
                fillColor: "transparent"
                capStyle: ShapePath.RoundCap
                joinStyle: ShapePath.RoundJoin
                PathSvg { path: psShape.path || "M0 0" }
            }
        }
        Rectangle {
            visible: g.spec.kind === "face" && g.family === "ps" && g.faces.ps[g.spec.pos][0] === "circle"
            x: 6.8; y: 6.8; width: 10.4; height: 10.4; radius: 5.2
            color: "transparent"
            border.width: 2.2
            border.color: g.faces.ps.east[1]
        }
        Rectangle {
            visible: g.spec.kind === "face" && g.family === "ps" && g.faces.ps[g.spec.pos][0] === "square"
            x: 7.2; y: 7.2; width: 9.6; height: 9.6; radius: 0.8
            color: "transparent"
            border.width: 2.2
            border.color: g.faces.ps.west[1]
        }

        // System buttons: Menu, View, Create, plus, minus, the Deck's dots.
        Shape {
            visible: g.spec.kind === "system" && !!g.systemPaths[g.spec.name]
            anchors.fill: parent
            preferredRendererType: Shape.CurveRenderer
            ShapePath {
                strokeColor: "#ffffff"
                strokeWidth: g.spec.name === "plus" || g.spec.name === "minus" ? 2 : 1.7
                fillColor: "transparent"
                capStyle: ShapePath.RoundCap
                PathSvg { path: g.systemPaths[g.spec.name] || "M0 0" }
            }
        }
        Item {
            visible: g.spec.kind === "system" && g.spec.name === "view"
            anchors.fill: parent
            Rectangle { x: 6.8; y: 7.6; width: 6.6; height: 6.6; radius: 1.2; color: "transparent"; border.width: 1.5; border.color: "#ffffff" }
            Rectangle { x: 10.6; y: 10; width: 6.6; height: 6.6; radius: 1.2; color: "#1f252e"; border.width: 1.5; border.color: "#ffffff" }
        }
        Row {
            visible: g.spec.kind === "system" && g.spec.name === "dots"
            x: 6.6; y: 10.6
            spacing: 1.2
            Repeater { model: 3; Rectangle { width: 2.8; height: 2.8; radius: 1.4; color: "#ffffff" } }
        }

        // Shoulder buttons: a rounded bar with the label.
        Rectangle {
            visible: g.spec.kind === "shoulder"
            x: 1; y: 3.5; width: parent.width - 2; height: 17; radius: 7
            color: "#1f252e"
            border.width: 1
            border.color: Qt.rgba(1, 1, 1, 0.28)
            GText {
                text: g.spec.text || ""
                color: "#ffffff"
            }
        }

        // D-pad with the up arm lit.
        Shape {
            visible: g.spec.kind === "dpad"
            anchors.fill: parent
            preferredRendererType: Shape.CurveRenderer
            ShapePath {
                fillColor: "#1f252e"
                strokeColor: Qt.rgba(1, 1, 1, 0.28)
                strokeWidth: 1
                PathSvg { path: "M9 2.5h6v6.5h6.5v6H15v6.5H9V15H2.5V9H9z" }
            }
            ShapePath {
                fillColor: "#ffffff"
                strokeColor: "transparent"
                PathSvg { path: "M9.8 3.3h4.4V9H9.8z" }
            }
        }
    }
}
