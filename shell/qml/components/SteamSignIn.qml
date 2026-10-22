// Steam sign-in, shared by first-time setup and Settings > Accounts (the mockup's Accounts.js).
// Vanta never handles Steam passwords. The Steam client does the sign-in in its own window (QR
// code for the Steam Mobile App, or account name); Vanta starts it and waits until the client
// reports a signed-in account in config/loginusers.vdf. Then the library comes in from the
// client's files. In development (outside the Vanta session) the mockup's simulated approval
// runs instead, with its stand-in QR code and sample account.
import QtQuick
import dev.vanta.shell

Column {
    id: s

    signal done(var account)
    property string phase: "wait"   // wait | ok | sync | ready | missing
    property var account: null
    property real startedAt: 0
    readonly property bool simulated: !App.real
    readonly property var syncRows: simulated ? [
        ["syncProfile", "account_circle", I18n.t("syncProfileDone")], ["syncLibrary", "library", I18n.t("gamesCount", { n: 214 })],
        ["syncCollections", "folder", I18n.t("collectionsCount", { n: 9 })], ["syncAchievements", "trophy", I18n.t("achievementsCount", { n: I18n.number(1386) })],
        ["syncScreenshots", "photo_library", I18n.t("screenshotsCount", { n: 412 })], ["syncControllers", "gamepad", I18n.t("layoutsCount", { n: 14 })],
        ["syncFriends", "group", I18n.t("friendsCount", { n: 37 })]
    ] : [
        ["syncProfile", "account_circle", I18n.t("syncProfileDone")],
        ["syncLibrary", "library", I18n.t("gamesCount", { n: Games.all.filter(g => g.source === "steam").length })]
    ]
    property int synced: 0

    width: parent ? parent.width : 0
    spacing: Theme.s4

    function begin() {
        startedAt = Date.now() / 1000
        if (simulated) {
            App.later(4200, () => signedIn({ persona: "vanta_player", steamId: "76561198000000000", level: 23, since: 2014, avatar: "" }))
            return
        }
        if (!App.sys.which("steam")) {
            phase = "missing"
            return
        }
        // Steam is already signed in on this device: use that account.
        const a = Games.account
        if (a && a.persona) {
            App.later(600, () => signedIn({ persona: a.persona, steamId: a.steamId, avatar: a.avatar }))
            return
        }
        App.sys.spawn("steam", JSON.stringify([]))
        poll.start()
    }

    function signedIn(acc) {
        poll.stop()
        account = acc
        phase = "ok"
        Sound.play("toggleOn")
        Haptics.play("select")
        App.later(900, () => {
            phase = "sync"
            for (let i = 0; i < syncRows.length; i++) App.later(600 + i * 450, () => {
                synced = i + 1
                Sound.play("key")
                if (i === syncRows.length - 1) {
                    phase = "ready"
                    Sound.play("notify")
                    App.later(0, () => Nav.focus(next, true))
                }
            })
        })
    }

    Timer {
        id: poll
        interval: 2000
        repeat: true
        onTriggered: {
            Games.lib.refresh()
            const a = Games.account
            if (a && a.persona && a.timestamp >= s.startedAt - 60) s.signedIn({ persona: a.persona, steamId: a.steamId, avatar: a.avatar })
        }
    }

    Component.onCompleted: begin()

    // Waiting for the phone (or the Steam window)
    Rectangle {
        visible: s.phase === "wait" || s.phase === "ok" || s.phase === "missing"
        width: parent.width
        height: card.height + 2 * Theme.s5
        radius: Theme.rLg
        color: Theme.panel
        border.width: 1
        border.color: Theme.line
        Column {
            id: card
            x: Theme.s5
            y: Theme.s5
            width: parent.width - 2 * Theme.s5
            spacing: Theme.s4
            // A stand-in QR code (development only); the real one is in Steam's own window.
            Rectangle {
                visible: s.simulated
                width: 9.5 * Theme.rem + Theme.rem
                height: width
                radius: Theme.rMd
                color: "#ffffff"
                Grid {
                    id: qr
                    anchors.centerIn: parent
                    readonly property int n: 29
                    readonly property real cell: 9.5 * Theme.rem / n
                    columns: n
                    Repeater {
                        model: qr.n * qr.n
                        Rectangle {
                            required property int index
                            readonly property int cx: index % qr.n - 2
                            readonly property int cy: Math.floor(index / qr.n) - 2
                            readonly property int nn: 25
                            readonly property bool finder: (cx < 8 && cy < 8) || (cx > nn - 9 && cy < 8) || (cx < 8 && cy > nn - 9)
                            function inFinder(fx, fy) {
                                const x = cx - fx, y = cy - fy
                                if (x < 0 || y < 0 || x > 6 || y > 6) return false
                                return x === 0 || y === 0 || x === 6 || y === 6 || (x >= 2 && x <= 4 && y >= 2 && y <= 4)
                            }
                            readonly property bool on: cx < 0 || cy < 0 || cx >= nn || cy >= nn ? false
                                : finder ? (inFinder(0, 0) || inFinder(nn - 7, 0) || inFinder(0, nn - 7))
                                : ((cx * 7919 + cy * 104729 + cx * cy * 31) % 97) / 97 > 0.52
                            width: qr.cell
                            height: qr.cell
                            color: on ? "#0b0e13" : "#ffffff"
                        }
                    }
                }
            }
            Column {
                width: parent.width
                spacing: Theme.s1
                VText {
                    width: parent.width
                    text: s.phase === "missing" ? I18n.t("steamMissing") : s.simulated ? I18n.t("steamScanTitle") : I18n.t("steamWindowTitle")
                    weight: Font.DemiBold
                    color: Theme.fg
                    wrapMode: Text.Wrap
                }
                VText {
                    width: parent.width
                    visible: s.phase !== "missing"
                    text: s.simulated ? I18n.t("steamScanBody") : I18n.t("steamWindowBody")
                    size: Theme.tSm
                    color: Theme.fg3
                    wrapMode: Text.Wrap
                }
            }
            Row {
                visible: s.phase !== "missing"
                spacing: Theme.s3
                VSpinner { visible: s.phase === "wait"; size: "sm"; anchors.verticalCenter: parent.verticalCenter }
                Icon { visible: s.phase === "ok"; name: "check"; color: Theme.good; anchors.verticalCenter: parent.verticalCenter }
                VText {
                    text: s.phase === "ok" ? I18n.t("signedInAs", { name: s.account.persona }) : I18n.t("steamWaiting")
                    size: Theme.tSm
                    anchors.verticalCenter: parent.verticalCenter
                }
            }
        }
    }
    VButton {
        visible: s.simulated && s.phase === "wait"
        label: I18n.t("steamUseName")
        variant: "ghost"
        onActivated: App.alert("info", { title: I18n.t("steamUseName"), message: I18n.t("steamUseNameBody") })
    }

    // The first sync: library, achievements, screenshots and friends coming in one after another.
    Rectangle {
        visible: s.phase === "sync" || s.phase === "ready"
        width: parent.width
        height: syncCol.height + 2 * Theme.s5
        radius: Theme.rLg
        color: Theme.panel
        border.width: 1
        border.color: Theme.line
        Column {
            id: syncCol
            x: Theme.s5
            y: Theme.s5
            width: parent.width - 2 * Theme.s5
            spacing: Theme.s2
            VText { text: I18n.t("syncTitle"); weight: Font.DemiBold; color: Theme.fg }
            Repeater {
                model: s.syncRows
                Item {
                    required property var modelData
                    required property int index
                    readonly property bool isDone: index < s.synced
                    width: syncCol.width
                    height: 2.6 * Theme.rem
                    Row {
                        spacing: Theme.s3
                        anchors.verticalCenter: parent.verticalCenter
                        Icon { name: modelData[1]; color: isDone ? Theme.fg2 : Theme.fg3; anchors.verticalCenter: parent.verticalCenter }
                        VText { text: I18n.t(modelData[0]); size: Theme.tSm; color: isDone ? Theme.fg2 : Theme.fg3; anchors.verticalCenter: parent.verticalCenter }
                    }
                    Row {
                        anchors { right: parent.right; verticalCenter: parent.verticalCenter }
                        spacing: Theme.s2
                        VSpinner { visible: !isDone; size: "sm"; tone: "muted"; anchors.verticalCenter: parent.verticalCenter }
                        VText { visible: isDone; text: modelData[2]; size: Theme.tSm; color: Theme.fg3; anchors.verticalCenter: parent.verticalCenter }
                        Icon { visible: isDone; name: "check"; color: Theme.good; anchors.verticalCenter: parent.verticalCenter }
                    }
                }
            }
        }
    }
    VButton {
        id: next
        visible: s.phase === "ready"
        label: I18n.t("continue")
        variant: "primary"
        onActivated: s.done(s.account)
    }
}
