// "Who's playing?" (the mockup's screens/Users.js): the first screen after start-up. Pick a
// profile, play as a guest, or add one. X on a profile edits it. The chosen picture grows a
// little and the screen fades into Home.
import QtQuick
import dev.vanta.shell

Screen {
    id: page

    property bool leaving: false
    readonly property var cards: [].concat(Profiles.list.map(p => ({ kind: "profile", profile: p, name: p.name })),
        [{ kind: "guest", name: I18n.t("guest") }, { kind: "add", name: I18n.t("addUser") }])

    shell: ({ topbar: false, hints: [["accept", I18n.t("select")], ["options", I18n.t("editProfile")]] })

    function enter() {
        let pick = 0
        cards.forEach((c, i) => { if (c.profile && Profiles.current && c.profile.id === Profiles.current.id) pick = i })
        Nav.focus(rep.itemAt(pick), true)
    }

    function choose(card, commit) {
        if (leaving) return
        leaving = true
        commit()
        card.chosen = true
        App.later(420, () => App.go("home", {}, { replace: true }))
    }

    Column {
        anchors.centerIn: parent
        anchors.verticalCenterOffset: -Theme.hintH / 2
        spacing: Theme.s7
        VText {
            anchors.horizontalCenter: parent.horizontalCenter
            text: I18n.t("whosPlaying")
            size: Theme.t2xl
            weight: Font.DemiBold
            color: Theme.fg
            font.letterSpacing: -0.02 * Theme.t2xl
        }
        Row {
            readonly property bool focusGroup: true
            anchors.horizontalCenter: parent.horizontalCenter
            spacing: Theme.s6
            Repeater {
                id: rep
                model: page.cards
                VFocusable {
                    id: card
                    required property var modelData
                    property bool chosen: false
                    readonly property real avatar: Math.max(6 * Theme.rem, Math.min(9 * Theme.rem, Theme.width * 0.12))
                    width: Math.max(7 * Theme.rem, Math.min(10 * Theme.rem, Theme.width * 0.14))
                    height: col.height + Theme.s4
                    opacity: page.leaving && !chosen ? 0 : 1
                    Behavior on opacity { NumberAnimation { duration: 300 } }
                    onActivated: {
                        if (modelData.kind === "profile") page.choose(card, () => Profiles.use(modelData.profile.id))
                        else if (modelData.kind === "guest") page.choose(card, () => Profiles.guest())
                        else App.open("profile", { create: true })
                    }
                    onOptionsPressed: if (modelData.kind === "profile") App.open("profile", { profile: modelData.profile })
                    Column {
                        id: col
                        y: Theme.s2
                        width: parent.width
                        spacing: Theme.s3
                        Item {
                            width: card.avatar
                            height: card.avatar
                            anchors.horizontalCenter: parent.horizontalCenter
                            scale: card.chosen ? 1.06 : card.focused ? 1.06 : 1
                            Behavior on scale { NumberAnimation { duration: card.chosen ? 380 : Theme.tBase; easing.type: Easing.OutCubic } }
                            Rectangle {
                                anchors.fill: parent
                                anchors.margins: -6
                                radius: width / 2
                                color: "#ffffff"
                                visible: card.focused
                                Rectangle { anchors.fill: parent; anchors.margins: 3; radius: width / 2; color: Theme.bg }
                            }
                            Avatar {
                                anchors.fill: parent
                                size: card.avatar
                                profile: card.modelData.kind === "profile" ? card.modelData.profile : null
                                emptyIcon: card.modelData.kind === "add" ? "add" : card.modelData.kind === "guest" ? "user" : ""
                            }
                        }
                        VText {
                            width: parent.width
                            horizontalAlignment: Text.AlignHCenter
                            text: card.modelData.name
                            size: Theme.tLg
                            weight: Font.DemiBold
                            color: card.focused || card.chosen ? Theme.fg : Theme.fg3
                            wrapMode: Text.Wrap
                        }
                    }
                }
            }
        }
    }
}
