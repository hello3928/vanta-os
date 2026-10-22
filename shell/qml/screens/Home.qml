// Home: the selected game's hero art and logo, with Recent games below (the mockup's Home).
// The hero crossfades between two layers so changing games never flashes.
import QtQuick
import QtQuick.Effects
import dev.vanta.shell

FocusScope {
    id: home
    property var library
    property string dataDir
    readonly property var games: library ? JSON.parse(library.gamesJson) : []
    readonly property var game: games.length ? games[recent.currentIndex] : null

    // Hero art fills the whole screen and is clipped at the hero line, as in the mockup, so the
    // crop matches it (object-fit: cover; object-position: center 25%).
    component HeroArt: Image {
        readonly property real ratio: implicitHeight > 0 ? implicitWidth / implicitHeight : 16 / 9
        width: Math.max(home.width, home.height * ratio)
        height: width / ratio
        x: (home.width - width) / 2
        y: (home.height - height) * 0.25
        // Decode at screen height. Steam heroes are 3840 px wide, past some GPUs' texture limit.
        sourceSize.height: home.height
        asynchronous: true
        Behavior on opacity { NumberAnimation { duration: 450; easing.type: Easing.InOutQuad } }
    }

    Item {
        id: hero
        anchors { left: parent.left; right: parent.right; top: parent.top }
        height: Theme.heroH
        clip: true
        property bool flip: false

        HeroArt { id: layerA; opacity: hero.flip ? 0 : 1 }
        HeroArt { id: layerB; opacity: hero.flip ? 1 : 0 }

        function show(src) {
            const next = flip ? layerA : layerB
            if (next.source == src) return
            next.source = src
        }
        Connections { target: layerA; function onStatusChanged() { if (layerA.status === Image.Ready && hero.flip) hero.flip = false } }
        Connections { target: layerB; function onStatusChanged() { if (layerB.status === Image.Ready && !hero.flip) hero.flip = true } }

        // Shade: dark at the top for the bar, and into the page colour at the bottom. It runs 8 px
        // past the clip and ends in 16 px of solid page colour, like the mockup's.
        Rectangle {
            id: shade
            readonly property real solid: 1 - 16 / height
            width: parent.width
            height: parent.height + 8
            gradient: Gradient {
                GradientStop { position: 0.0; color: Qt.rgba(26 / 255, 29 / 255, 35 / 255, 0.5) }
                GradientStop { position: 0.18; color: "transparent" }
                GradientStop { position: 0.35; color: "transparent" }
                GradientStop { position: 0.70; color: Qt.rgba(26 / 255, 29 / 255, 35 / 255, 0.6) }
                GradientStop { position: Math.max(0.71, shade.solid); color: Theme.bg }
                GradientStop { position: 1.0; color: Theme.bg }
            }
        }
        Rectangle {
            anchors.fill: parent
            gradient: Gradient {
                orientation: Gradient.Horizontal
                GradientStop { position: 0.0; color: Qt.rgba(26 / 255, 29 / 255, 35 / 255, 0.65) }
                GradientStop { position: 0.55; color: "transparent" }
            }
        }
    }

    onGameChanged: if (game) { hero.show(game.hero); logoSwap.restart() }

    // "today", "yesterday", "3 days ago", "2 weeks ago", "4 months ago" (the mockup's relDays).
    function relDays(seconds) {
        const then = new Date(seconds * 1000)
        const now = new Date()
        const days = Math.round((new Date(now.getFullYear(), now.getMonth(), now.getDate())
                                 - new Date(then.getFullYear(), then.getMonth(), then.getDate())) / 86400000)
        if (days <= 0) return qsTr("today")
        if (days === 1) return qsTr("yesterday")
        if (days < 7) return qsTr("%1 days ago").arg(days)
        const weeks = Math.round(days / 7)
        if (days < 30) return weeks === 1 ? qsTr("last week") : qsTr("%1 weeks ago").arg(weeks)
        const months = Math.round(days / 30)
        return months === 1 ? qsTr("last month") : qsTr("%1 months ago").arg(months)
    }

    // The space between the top bar and the shelf. The mockup's .home__intro: at least
    // hero height - bar height - 12.5rem, logo and details pinned to its bottom.
    readonly property real introH: Math.max(Theme.heroH - Theme.barH - 12.5 * Theme.rem,
                                            intro.implicitHeight + Theme.s4 + Theme.s2)

    // Logo and details, swapped with a quick fade.
    Column {
        id: intro
        x: Theme.gutter
        y: Theme.barH + home.introH - Theme.s2 - implicitHeight
        width: home.width - 2 * Theme.gutter
        spacing: Theme.s3

        Image {
            id: logo
            width: Math.min(23 * Theme.rem, intro.width * 0.7)
            height: 6.5 * Theme.rem
            fillMode: Image.PreserveAspectFit
            horizontalAlignment: Image.AlignLeft
            verticalAlignment: Image.AlignBottom
            asynchronous: true
            visible: status !== Image.Error
            layer.enabled: true
            layer.effect: MultiEffect {
                shadowEnabled: true
                shadowColor: Qt.rgba(0, 0, 0, 0.5)
                shadowVerticalOffset: 4
                shadowBlur: 0.5
            }
        }
        Text {
            visible: logo.status === Image.Error
            text: home.game ? home.game.title : ""
            color: Theme.fg
            font { family: Theme.font; pixelSize: Theme.t3xl; weight: Font.DemiBold }
        }
        Text {
            id: meta
            height: 1.3 * Theme.rem
            verticalAlignment: Text.AlignVCenter
            color: Theme.fg2
            font { family: Theme.font; pixelSize: Theme.tSm; weight: Font.DemiBold }
        }
    }

    SequentialAnimation {
        id: logoSwap
        NumberAnimation { target: intro; property: "opacity"; to: 0; duration: 90 }
        ScriptAction {
            script: {
                logo.source = home.game ? home.game.logo : ""
                meta.text = home.game && home.game.lastPlayed
                    ? qsTr("Last played %1").arg(home.relDays(home.game.lastPlayed))
                    : qsTr("Not played yet")
            }
        }
        NumberAnimation { target: intro; property: "opacity"; to: 1; duration: Theme.tBase; easing.type: Easing.OutCubic }
    }

    VRow {
        id: recent
        anchors { left: parent.left; right: parent.right }
        y: Theme.barH + home.introH + Theme.s3
        title: qsTr("Recent games")
        games: home.games
        focus: true
        onActivated: game => home.library.launch(game.appid)
    }
}
