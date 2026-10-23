// Vanta design tokens: colours, type scale, spacing, corner radii and motion.
pragma Singleton
import QtQuick

QtObject {
    // 1 rem in pixels. Main.qml sets it from the window width.
    property real rem: 16
    // Window size. Main.qml keeps these current.
    property real width: 1280
    property real height: 800

    // Surfaces, darkest to lightest
    readonly property color bg: "#1a1d23"
    readonly property color bg2: "#14161b"
    readonly property color panel: "#23262e"
    readonly property color surface: "#2b2f38"
    readonly property color surface2: "#3a3f4a"
    readonly property color surface3: "#474d5a"
    readonly property color track: "#4a505c"
    readonly property color hover: Qt.rgba(1, 1, 1, 0.06)
    readonly property color focusRow: Qt.rgba(1, 1, 1, 0.11)
    readonly property color line: Qt.rgba(1, 1, 1, 0.07)
    readonly property color scrim: Qt.rgba(5 / 255, 7 / 255, 10 / 255, 0.66)

    // Text
    readonly property color fg: "#ffffff"
    readonly property color fg2: "#dcdedf"
    readonly property color fg3: "#8b929a"
    readonly property color fg4: "#5f6670"
    readonly property color inkOnLight: "#1a1d23"
    readonly property color light: "#f2f4f7"

    // Accent: Steam blue by default; Settings > Appearance switches it.
    readonly property var accents: ({
        ion: ["#1a9fff", "#4db5ff"],
        ember: ["#f26b2a", "#ff8a50"],
        mint: ["#21b58a", "#3fd0a5"]
    })
    readonly property var accentPair: accents[Settings.accent] || accents.ion
    readonly property color accent: accentPair[0]
    readonly property color accentHi: accentPair[1]
    readonly property color accentFg: "#ffffff"
    readonly property color accentSoft: Qt.rgba(accent.r, accent.g, accent.b, 0.16)
    readonly property color chart1: "#168fe8"

    // Play is always green, as on Steam
    readonly property color play: "#4fb93a"
    readonly property color playHi: "#66cf4f"

    // Status
    readonly property color good: "#4fb93a"
    readonly property color goodSoft: Qt.rgba(79 / 255, 185 / 255, 58 / 255, 0.16)
    readonly property color warn: "#e8b33f"
    readonly property color warnSoft: Qt.rgba(232 / 255, 179 / 255, 63 / 255, 0.15)
    readonly property color bad: "#f2555a"
    readonly property color badSoft: Qt.rgba(242 / 255, 85 / 255, 90 / 255, 0.15)

    // Type
    readonly property string font: "Figtree"
    readonly property real tXs: 0.75 * rem
    readonly property real tSm: 0.875 * rem
    readonly property real tMd: rem
    readonly property real tLg: 1.125 * rem
    readonly property real tXl: 1.5 * rem
    readonly property real t2xl: 2 * rem
    readonly property real t3xl: 2.75 * rem

    // Space
    readonly property real s1: 0.25 * rem
    readonly property real s2: 0.5 * rem
    readonly property real s3: 0.75 * rem
    readonly property real s4: rem
    readonly property real s5: 1.5 * rem
    readonly property real s6: 2 * rem
    readonly property real s7: 3 * rem
    readonly property real s8: 4 * rem
    // Page side margin: clamp(16px, 3.5vw, 56px).
    readonly property real gutter: Math.max(16, Math.min(56, 0.035 * width))

    // Shape: SteamOS radii. Only switches and avatars are round.
    readonly property real rXs: 2
    readonly property real rSm: 3
    readonly property real rMd: 4
    readonly property real rLg: 6

    // Sizes
    readonly property real capsule: Math.max(6.5 * rem, Math.min(9.5 * rem, 0.105 * width))
    readonly property real heroH: Math.min(0.66 * height, 38 * rem)
    readonly property real barH: 3.25 * rem
    readonly property real hintH: 3 * rem
    readonly property real controlH: 2.9 * rem
    readonly property real settingsNav: 16 * rem

    // Motion: short, never overshooting; exits faster than entrances.
    readonly property int tInstant: 90
    readonly property int tFast: 140
    readonly property int tBase: 200
    readonly property int tSlow: 320
    readonly property int tSlower: 480
    // cubic-bezier(0.2, 0.8, 0.2, 1) and friends, for Easing.BezierSpline.
    readonly property var easeOut: [0.2, 0.8, 0.2, 1, 1, 1]
    readonly property var easeIn: [0.4, 0, 1, 1, 1, 1]
    readonly property var easeInOut: [0.45, 0, 0.2, 1, 1, 1]
}
