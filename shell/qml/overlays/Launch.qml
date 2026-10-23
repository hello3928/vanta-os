// Launching a game: the hero art pushes in and darkens, the logo
// settles in the centre, then the screen fades to black and the game takes over. Vanta asks the
// Steam client (or the emulator) to start the game; when it can't, the screen comes back with
// an error instead.
import QtQuick
import dev.vanta.shell

Overlay {
    id: l

    property var game: null
    property string status: I18n.t("launching")

    exitMs: 400
    z: 30

    function open() {
        isOpen = true
        shown = true
        Sound.play("launch")
        Haptics.play("launch")
        push.start()
        const sys = Games.systemOf(game)
        App.later(1100, () => {
            const how = sys ? sys.emulator : System.runtimeOf(game) === "native" ? I18n.t("runtimeNative") : "Proton"
            status = I18n.t("starting") + " · " + how + (System.powerStation ? " · " + (Games.profile(game.id).tdp || Settings.tdp) + " W" : "")
        })
        App.later(1200, () => {
            if (!Games.start(game)) {
                finish()
                App.busy = false
                App.alert("error", { title: I18n.t("launchFailTitle"), message: sys ? I18n.t("emuMissing", { emu: sys.emulator }) : I18n.t("steamMissing") })
            }
        })
        App.later(2700, () => {
            if (!isOpen) return
            out.start()
        })
    }

    Rectangle { anchors.fill: parent; color: "#000000" }
    Item {
        id: art
        anchors.fill: parent
        HeroArt { anchors.fill: parent; game: l.game }
    }
    Rectangle {
        id: veil
        anchors.fill: parent
        opacity: 0.35
        gradient: Gradient {
            GradientStop { position: 0; color: Qt.rgba(0, 0, 0, 0.88) }
            GradientStop { position: 0.5; color: Qt.rgba(0, 0, 0, 0.5) }
            GradientStop { position: 1; color: Qt.rgba(0, 0, 0, 0.88) }
        }
    }
    Column {
        anchors.centerIn: parent
        spacing: Theme.s5
        GameLogo {
            id: logo
            anchors.horizontalCenter: parent.horizontalCenter
            width: Math.min(30 * Theme.rem, l.width * 0.8)
            height: 9 * Theme.rem
            game: l.game
            align: Image.AlignHCenter
            shadow: 0.6
            opacity: 0
            scale: 0.92
        }
        Row {
            id: statusRow
            anchors.horizontalCenter: parent.horizontalCenter
            spacing: Theme.s3
            opacity: 0
            VSpinner { size: "sm"; tone: "light"; anchors.verticalCenter: parent.verticalCenter }
            VText { text: l.status; size: Theme.tSm; weight: Font.Medium; anchors.verticalCenter: parent.verticalCenter }
        }
    }

    opacity: 0
    ParallelAnimation {
        id: push
        NumberAnimation { target: l; property: "opacity"; to: 1; duration: 320; easing.type: Easing.OutCubic }
        NumberAnimation { target: art; property: "scale"; from: 1; to: 1.1; duration: 2600; easing.type: Easing.BezierSpline; easing.bezierCurve: Theme.easeOut }
        NumberAnimation { target: veil; property: "opacity"; to: 1; duration: 2000; easing.type: Easing.BezierSpline; easing.bezierCurve: Theme.easeOut }
        SequentialAnimation {
            PauseAnimation { duration: 250 }
            ParallelAnimation {
                NumberAnimation { target: logo; property: "opacity"; to: 1; duration: 900; easing.type: Easing.OutCubic }
                NumberAnimation { target: logo; property: "scale"; to: 1; duration: 900; easing.type: Easing.OutCubic }
            }
        }
        SequentialAnimation {
            PauseAnimation { duration: 700 }
            NumberAnimation { target: statusRow; property: "opacity"; to: 1; duration: 400 }
        }
    }
    SequentialAnimation {
        id: out
        NumberAnimation { target: l; property: "opacity"; to: 0; duration: 380; easing.type: Easing.InCubic }
        ScriptAction {
            script: {
                const g = l.game
                l.finish()
                App.launched(g)
            }
        }
    }
}
