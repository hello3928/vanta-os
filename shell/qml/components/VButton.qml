// The one button used everywhere (the mockup's VButton).
// variant: primary | play | secondary | ghost | danger    size: sm | md | lg
// Icon-only when there is no label. Focused buttons invert to near-white; primary and play keep
// their colour and gain a white ring.
import QtQuick
import dev.vanta.shell

VFocusable {
    id: b

    property string label
    property string icon
    property string variant: "secondary"
    property string size: "md"
    property bool block: false

    readonly property real h: size === "sm" ? 2.25 * Theme.rem : size === "lg" ? 3.25 * Theme.rem : 2.75 * Theme.rem
    readonly property real textSize: size === "sm" ? Theme.tSm : size === "lg" ? Theme.tLg : Theme.tMd
    readonly property real padX: label === "" ? 0 : (size === "sm" ? 1 : size === "lg" ? 1.75 : 1.4) * textSize
    readonly property bool ring: focused && (variant === "primary" || variant === "play")

    implicitWidth: label === "" ? h : Math.max(size === "lg" ? 9.5 * Theme.rem : 0, content.width + 2 * padX)
    implicitHeight: h
    width: block && parent ? parent.width : implicitWidth
    height: h
    scale: pressed ? 0.96 : 1
    Behavior on scale { NumberAnimation { duration: Theme.tInstant; easing.type: Easing.OutCubic } }

    readonly property color bg: {
        if (focused) {
            if (variant === "primary") return Theme.accentHi
            if (variant === "play") return Theme.playHi
            if (variant === "danger") return Theme.bad
            return Theme.light
        }
        if (variant === "primary") return Theme.accent
        if (variant === "play") return Theme.play
        if (variant === "ghost") return "transparent"
        return Theme.surface2
    }
    readonly property color fg: {
        if (variant === "primary" || variant === "play") return "#ffffff"
        if (focused) return variant === "danger" ? "#ffffff" : Theme.inkOnLight
        return variant === "danger" ? Theme.bad : Theme.fg2
    }

    // The focus ring: 2 px of page colour, then 2 px of white.
    Rectangle {
        anchors.fill: parent
        anchors.margins: -4
        radius: Theme.rSm + 4
        color: "transparent"
        border.width: 2
        border.color: "#ffffff"
        visible: b.ring
    }
    Rectangle {
        anchors.fill: parent
        radius: b.block ? Theme.rMd : Theme.rSm
        color: b.bg
        opacity: b.inactive ? 0.45 : 1
        Behavior on color { ColorAnimation { duration: Theme.tFast } }
    }
    Row {
        id: content
        spacing: 0.55 * b.textSize
        x: b.block ? Math.max(b.padX, b.h * 0.35) : (b.width - width) / 2
        anchors.verticalCenter: parent.verticalCenter
        opacity: b.inactive ? 0.45 : 1
        Icon {
            name: b.icon
            visible: b.icon !== ""
            size: 1.3 * b.textSize
            color: b.fg
            anchors.verticalCenter: parent.verticalCenter
        }
        VText {
            text: b.label
            visible: b.label !== ""
            size: b.textSize
            weight: Font.DemiBold
            color: b.fg
            anchors.verticalCenter: parent.verticalCenter
        }
    }
}
