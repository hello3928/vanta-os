// Steam sign-in, shared by first-time setup and Settings > Accounts.
// Vanta never handles Steam passwords. It shows Steam's own sign-in QR code (Steam.qml); the
// player approves it in the Steam Mobile App, and the account's owned games come in through
// Steam's Web API. With VANTA_SAMPLE=1 (screenshot and flow-check tools) a simulated
// approval runs instead, with its stand-in QR code and sample account.
import QtQuick
import dev.vanta.shell

Column {
    id: s

    signal done(var account)
    property string phase: "wait"   // wait | ok | sync | ready | failed
    property var account: null
    readonly property bool simulated: App.sample
    readonly property bool scanned: !simulated && Steam.phase === "scanned"
    readonly property int ownedCount: { Steam.owned; return account ? Steam.cachedOwned(account.steamId).length : 0 }
    readonly property var syncRows: simulated ? [
        ["syncProfile", "account_circle", I18n.t("syncProfileDone")], ["syncLibrary", "library", I18n.t("gamesCount", { n: 214 })],
        ["syncCollections", "folder", I18n.t("collectionsCount", { n: 9 })], ["syncAchievements", "trophy", I18n.t("achievementsCount", { n: I18n.number(1386) })],
        ["syncScreenshots", "photo_library", I18n.t("screenshotsCount", { n: 412 })], ["syncControllers", "gamepad", I18n.t("layoutsCount", { n: 14 })],
        ["syncFriends", "group", I18n.t("friendsCount", { n: 37 })]
    ] : [
        ["syncProfile", "account_circle", I18n.t("syncProfileDone")],
        ["syncLibrary", "library", I18n.t("gamesCount", { n: s.ownedCount })]
    ]
    property int synced: 0
    // The QR code: Steam's (with a two-module quiet zone), or a stand-in (VANTA_SAMPLE).
    readonly property var code: simulated ? null : Steam.qr

    width: parent ? parent.width : 0
    spacing: Theme.s4

    function begin() {
        phase = "wait"
        if (simulated) {
            App.later(4200, () => signedIn({ persona: "vanta_player", steamId: "76561198000000000", level: 23, since: 2014, avatar: "" }))
            return
        }
        Steam.begin()
    }

    Connections {
        target: Steam
        enabled: !s.simulated
        function onSignedIn(acc) { s.signedIn(acc) }
        function onPhaseChanged() { if (Steam.phase === "failed") s.phase = "failed" }
    }

    function signedIn(acc) {
        account = acc
        phase = "ok"
        Sound.play("toggleOn")
        Haptics.play("select")
        if (!simulated) Steam.loadOwned(acc.steamId)
        App.later(900, () => {
            phase = "sync"
            synced = 1
            Sound.play("key")
            if (simulated) tick()
            else waitOwned.start()
        })
    }
    // The rest of the rows, one after another.
    function tick() {
        if (synced >= syncRows.length) {
            phase = "ready"
            Sound.play("notify")
            App.later(0, () => Nav.focus(next, true))
            return
        }
        App.later(450, () => { synced++; Sound.play("key"); tick() })
    }
    Timer {
        id: waitOwned
        interval: 300
        repeat: true
        property int tries: 0
        onTriggered: {
            tries++
            if (Steam.loadingOwned && tries < 60) return
            stop()
            s.tick()
        }
    }

    Component.onCompleted: begin()
    Component.onDestruction: if (!simulated && Steam.phase !== "approved") Steam.cancel()

    // Waiting for the phone
    Rectangle {
        visible: s.phase === "wait" || s.phase === "ok" || s.phase === "failed"
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
            Rectangle {
                visible: s.phase !== "failed" && (s.simulated || !!s.code)
                width: 9.5 * Theme.rem + Theme.rem
                height: width
                radius: Theme.rMd
                color: "#ffffff"
                opacity: s.scanned ? 0.25 : 1
                Behavior on opacity { NumberAnimation { duration: Theme.tBase } }
                Grid {
                    id: qr
                    anchors.centerIn: parent
                    readonly property int nn: s.code ? s.code.size : 25
                    readonly property int n: nn + 4
                    readonly property real cell: 9.5 * Theme.rem / n
                    columns: n
                    Repeater {
                        model: qr.n * qr.n
                        Rectangle {
                            required property int index
                            readonly property int cx: index % qr.n - 2
                            readonly property int cy: Math.floor(index / qr.n) - 2
                            readonly property int nn: qr.nn
                            readonly property bool finder: (cx < 8 && cy < 8) || (cx > nn - 9 && cy < 8) || (cx < 8 && cy > nn - 9)
                            function inFinder(fx, fy) {
                                const x = cx - fx, y = cy - fy
                                if (x < 0 || y < 0 || x > 6 || y > 6) return false
                                return x === 0 || y === 0 || x === 6 || y === 6 || (x >= 2 && x <= 4 && y >= 2 && y <= 4)
                            }
                            readonly property bool on: cx < 0 || cy < 0 || cx >= nn || cy >= nn ? false
                                : s.code ? s.code.bits.charAt(cy * nn + cx) === "1"
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
                    text: s.phase === "failed" ? I18n.t("steamQrFailed") : I18n.t("steamScanTitle")
                    weight: Font.DemiBold
                    color: Theme.fg
                    wrapMode: Text.Wrap
                }
                VText {
                    width: parent.width
                    visible: s.phase !== "failed"
                    text: s.scanned ? I18n.t("steamScanned") : I18n.t("steamScanBody")
                    size: Theme.tSm
                    color: Theme.fg3
                    wrapMode: Text.Wrap
                }
            }
            Row {
                visible: s.phase !== "failed"
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
        visible: s.phase === "failed"
        label: I18n.t("tryAgain")
        variant: "primary"
        onActivated: s.begin()
    }
    VButton {
        visible: s.simulated && s.phase === "wait"
        label: I18n.t("steamUseName")
        variant: "ghost"
        onActivated: App.alert("info", { title: I18n.t("steamUseName"), message: I18n.t("steamUseNameBody") })
    }

    // The first import: profile and library (in the sample, also achievements, screenshots and
    // friends).
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
            VText {
                visible: !s.simulated && s.phase === "ready"
                width: parent.width
                text: I18n.t("steamInstallSignIn")
                size: Theme.tSm
                color: Theme.fg3
                wrapMode: Text.Wrap
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
