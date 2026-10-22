// UI sounds (the mockup's core/Sound.js). The WAVs in data/sounds are the mockup's own sound
// models rendered once (tools/render-sounds.js): dry, tactile clicks, no reverb or melodies.
// Navigation and keys have a few takes so repeats don't sound mechanical; the slider tick rises
// in pitch with the value (play("slider", { t: 0..1 })). System volume is PipeWire's; the
// interface volume setting scales these on top.
pragma Singleton
import QtQuick
import dev.vanta.shell

QtObject {
    id: sound

    readonly property Sys sys: Sys {}
    readonly property var names: ["move", "tab", "select", "back", "toggleOn", "toggleOff", "slider", "key", "keyDelete",
        "open", "close", "error", "notify", "launch", "welcome", "boot"]
    readonly property var takes: ({ move: 3, key: 3, slider: 11 })
    property var effects: ({})
    property int turn: 0

    function play(name, opts) {
        if (!Settings.sfx || !name || !(name in takes || names.indexOf(name) >= 0)) return
        let file = name
        if (name === "slider") file = "slider-" + Math.round(Math.max(0, Math.min(1, (opts && opts.t) || 0)) * 10)
        else if (takes[name]) file = name + "-" + (turn++ % takes[name])
        const fx = effects[file]
        if (!fx) return
        fx.volume = Settings.sfxVolume / 100
        fx.stop()
        fx.play()
    }

    Component.onCompleted: {
        const map = {}
        for (const n of names) {
            const count = takes[n] || 0
            const files = count ? Array.from({ length: count }, (_, i) => n + "-" + i) : [n]
            for (const f of files) {
                const fx = Qt.createQmlObject("import QtMultimedia; SoundEffect {}", sound, "sound")
                fx.source = "file://" + sys.dataDir + "/sounds/" + f + ".wav"
                map[f] = fx
            }
        }
        effects = map
    }
}
