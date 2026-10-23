// Game music, PS5 style: when a game stays selected for a
// moment, its official trailer fades in behind the hero art and its audio becomes the menu music.
// Moving on fades it out. One player follows you between screens: Home and the game page attach
// their VideoOutput, so opening a game's page keeps the same music without a restart.
//
// Streams: Steam publishes each trailer as AV1 (DASH) and H.264 (HLS) at the same bitrates. AV1
// is sharper, so it's tried first; HLS is the fallback. Playback is FFmpeg through Qt Multimedia.
// Start point: where the gameplay starts (game.trailerStart);
// otherwise skip the rating cards (12 s, or about a fifth of the way in). Looping goes back to
// that point, not to 0:00.
pragma Singleton
import QtQuick
import QtMultimedia

QtObject {
    id: music

    readonly property int settleMs: 1100
    readonly property int startAt: 12
    readonly property real startShare: 0.22

    property var game: null
    property bool playing: false        // started and fading in or playing
    property bool expanded: false       // Home's full-screen trailer
    property bool claimed: false        // a screen attached this go-round
    property real target: 0             // seconds: where the music starts and loops back to
    property bool av1Failed: false
    property bool triedHls: false
    readonly property bool visible: playing && (Settings.trailerVideo || expanded)
    readonly property real progress: player.duration > 0 ? player.position / player.duration : 0

    readonly property AudioOutput audio: AudioOutput { volume: 0 }
    readonly property MediaPlayer player: MediaPlayer {
        audioOutput: music.audio
        onMediaStatusChanged: {
            if (mediaStatus === MediaPlayer.LoadedMedia || mediaStatus === MediaPlayer.BufferedMedia) music.ready()
            else if (mediaStatus === MediaPlayer.EndOfMedia && music.playing) {
                setPosition(music.target * 1000)
                play()
            }
        }
        onErrorOccurred: (error, message) => music.failed(message)
    }
    readonly property NumberAnimation fader: NumberAnimation {
        target: music.audio
        property: "volume"
        duration: 900
        onFinished: if (music.audio.volume === 0 && !music.playing) music.player.stop()
    }
    readonly property Timer settle: Timer {
        interval: music.settleMs
        onTriggered: music.start(music.game)
    }

    // Put the player's picture into a screen's VideoOutput and select the game.
    function attach(output, g) {
        player.videoOutput = output
        claimed = true
        select(g)
    }

    function select(g, now) {
        if (g && game && g.id === game.id && playing) return
        settle.stop()
        if (!g || !game || g.id !== game.id) stop()
        game = g
        if (!g || !g.trailer || (!Settings.gameMusic && !now)) return
        settle.interval = now ? 1 : settleMs
        settle.start()
    }

    function streamOf(g, kind) {
        const base = g.trailer.slice(0, g.trailer.lastIndexOf("/") + 1)
        return kind === "av1" ? base + "dash_av1.mpd" : g.trailer
    }

    function start(g) {
        if (!g || !game || g.id !== game.id) return
        triedHls = av1Failed
        target = g.trailerStart !== undefined ? g.trailerStart : -1
        player.source = streamOf(g, av1Failed ? "hls" : "av1")
    }

    // Loaded: jump to the start point, then fade in.
    function ready() {
        if (!game || playing) return
        if (target < 0) {
            const total = player.duration / 1000
            target = total > 0 ? Math.max(startAt, Math.min(total * startShare, total - 20)) : startAt
        }
        audio.volume = 0
        player.setPosition(target * 1000)
        player.play()
        playing = true
        fadeTo(Settings.musicVolume / 100, 900)
    }

    function failed(message) {
        if (!game) return
        if (!triedHls) {
            // AV1 didn't work here: use H.264 for the rest of the session.
            av1Failed = true
            triedHls = true
            player.source = streamOf(game, "hls")
            return
        }
        console.log("vanta: trailer unavailable: " + message)
        stop(true)
    }

    function fadeTo(v, ms) {
        fader.stop()
        fader.from = audio.volume
        fader.to = v
        fader.duration = ms
        fader.start()
    }

    function stop(now) {
        settle.stop()
        if (!playing) { player.stop(); return }
        playing = false
        if (now) { fader.stop(); audio.volume = 0; player.stop(); return }
        fadeTo(0, 420)
    }

    // Leave the menus (a game launched, or the device went to sleep).
    function release() {
        game = null
        stop()
    }

    readonly property Connections watch: Connections {
        target: Settings
        function onGameMusicChanged() {
            if (!Settings.gameMusic) music.stop()
            else if (music.game) { const g = music.game; music.game = null; music.select(g) }
        }
        function onMusicVolumeChanged() { if (music.playing) music.fadeTo(Settings.musicVolume / 100, 200) }
    }
}
