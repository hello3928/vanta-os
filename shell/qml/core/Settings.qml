// Settings store. Quick access, the Settings page and game pages
// all read and write these properties, so a change in one place shows everywhere. Saved to
// ~/.config/vanta/settings.json a moment after any change. Effects on the real system (volume,
// brightness, Wi-Fi...) are applied by System.qml when a value changes.
pragma Singleton
import QtQuick
import dev.vanta.shell

QtObject {
    id: s

    property bool setupDone: false
    property bool tourDone: false
    property bool timeAuto: true
    property bool tzAuto: true
    property string timeZone: ""
    property bool clock24: false
    property string region: ""
    property bool steamAchievements: true
    property bool steamScreenshots: true
    property bool steamFriends: true
    property bool vantaSync: true
    property string language: "en"
    property string accent: "ion"
    property int brightness: 100
    property int volume: 70
    property bool sfx: true
    property int sfxVolume: 70
    property string haptics: "High"
    property bool menuHaptics: true
    property string glyphs: "Automatic"
    property bool gameMusic: true
    property int musicVolume: 60
    property bool trailerVideo: true
    property int tdp: 15
    property bool tdpLimit: false
    property string fpsLimit: "Off"
    property string upscaling: "Off"
    property string overlay: "Off"
    property bool vrr: true
    property bool hdr: false
    property bool wifi: true
    property bool bluetooth: true
    property bool airplane: false
    property string epp: "Balanced"
    property string scheduler: "scx_lavd"
    property bool gamemode: true
    property string channel: "Stable"

    readonly property var keys: ["setupDone", "tourDone", "timeAuto", "tzAuto", "timeZone", "clock24", "region",
        "steamAchievements", "steamScreenshots", "steamFriends", "vantaSync", "language", "accent", "brightness",
        "volume", "sfx", "sfxVolume", "haptics", "menuHaptics", "glyphs", "gameMusic", "musicVolume", "trailerVideo",
        "tdp", "tdpLimit", "fpsLimit", "upscaling", "overlay", "vrr", "hdr", "wifi", "bluetooth", "airplane", "epp",
        "scheduler", "gamemode", "channel"]

    property bool loaded: false
    readonly property Sys sys: Sys {}
    readonly property string file: sys.configDir + "/settings.json"
    readonly property Timer saver: Timer {
        interval: 400
        onTriggered: s.save()
    }

    function get(key) { return s[key] }
    function set(key, value) { if (s[key] !== value) s[key] = value }

    function save() {
        const out = {}
        for (const k of keys) out[k] = s[k]
        sys.writeText(file, JSON.stringify(out, null, 1))
    }

    // Reset system: back to defaults (the file is removed by App.resetSystem).
    function reload() {
        loaded = false
        const text = sys.readText(file)
        let data = {}
        try { data = text ? JSON.parse(text) : {} } catch (e) { data = {} }
        for (const k of keys) if (k in data && typeof data[k] === typeof s[k]) s[k] = data[k]
        loaded = true
    }

    Component.onCompleted: {
        reload()
        for (const k of keys) s[k + "Changed"].connect(() => { if (s.loaded) saver.restart() })
    }
}
