// Controller haptics (the mockup's core/Haptics.js). Each pattern is a list of
// [durationMs, weak, strong] pulses and gaps (numbers, in ms), played through gamepad.rs.
// Rumble motors can't render very short or very light pulses, so menu ticks are lifted to what
// a controller can actually play.
pragma Singleton
import QtQuick

QtObject {
    id: haptics

    readonly property var patterns: ({
        tick: [[14, 0.28, 0]],
        slider: [[9, 0.22, 0]],
        select: [[32, 0.55, 0.2]],
        back: [[22, 0.35, 0.05]],
        toggle: [[20, 0.45, 0.12]],
        error: [[45, 0.1, 0.7], 60, [45, 0.1, 0.7]],
        notify: [[40, 0.4, 0.1], 70, [60, 0.5, 0.2]],
        launch: [[140, 0.2, 0.1], [260, 0.5, 0.55]],
        boot: [[160, 0.12, 0], [200, 0.3, 0.15], [360, 0.55, 0.45]],
        test: [[120, 1, 0], 120, [120, 0, 1], 120, [220, 0.8, 0.8]]
    })
    readonly property var menuPatterns: ["tick", "slider", "select", "back", "toggle"]
    readonly property var levels: ({ Off: 0, Low: 0.45, High: 1 })
    readonly property int minMs: 35
    readonly property real minLevel: 0.3

    function play(name, opts) {
        const force = !!(opts && opts.force)
        const m = name in patterns ? (levels[Settings.haptics] !== undefined ? levels[Settings.haptics] : 1) : 0
        if (!App.pads || (!m && !force)) return
        if (!force && !Settings.menuHaptics && menuPatterns.indexOf(name) >= 0) return
        const mult = m || 1
        const lift = v => (v > 0 ? Math.max(minLevel, v) : 0)
        let at = 0
        for (const p of patterns[name]) {
            if (typeof p === "number") { at += p; continue }
            const d = Math.max(minMs, p[0])
            const weak = lift(Math.min(1, p[1] * mult))
            const strong = lift(Math.min(1, p[2] * mult))
            if (at === 0) App.pads.rumble(weak, strong, d)
            else App.later(at, () => App.pads.rumble(weak, strong, d))
            at += d
        }
    }
}
