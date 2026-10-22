// Main menu (the mockup's Menus.js openMainMenu): the left drawer, opened with Guide/View, M, or
// the profile picture in the top bar. The header is your profile; with a game running it starts
// with the game and Resume / Exit game.
import QtQuick
import dev.vanta.shell

VPanel {
    id: m

    readonly property bool isMainMenu: true
    readonly property var me: Profiles.current
    readonly property string currentScreen: App.screen ? App.screen.screenName : ""

    side: "left"
    header: Component {
        Row {
            spacing: Theme.s3
            Avatar { profile: m.me; size: 2.6 * Theme.rem; anchors.verticalCenter: parent.verticalCenter }
            Column {
                spacing: 0.15 * Theme.rem
                anchors.verticalCenter: parent.verticalCenter
                VText { text: m.me ? m.me.name : I18n.t("guest"); size: Theme.tLg; weight: Font.DemiBold; color: Theme.fg }
                VText { text: I18n.t("online"); size: Theme.tSm; color: Theme.fg3 }
            }
        }
    }

    function run(id, fn) {
        close(true)
        if (App.inGame && ["power", "downloads", "edit"].indexOf(id) < 0) App.leaveGameView(true)
        fn()
    }

    Component.onCompleted: {
        const items = [home, library, emu, downloads, settings, edit, user, power]
        initial = items.find(i => i.selected && i.visible) || (App.running ? resume : home)
    }

    // Now playing
    Column {
        visible: !!App.running
        width: parent.width
        spacing: Theme.s2
        bottomPadding: Theme.s2
        Image {
            x: Theme.s2
            width: parent.width - 2 * Theme.s2
            height: width * 215 / 460
            source: App.running ? App.running.art.header || "" : ""
            fillMode: Image.PreserveAspectCrop
            asynchronous: true
        }
        Column {
            x: Theme.s2
            VText { text: I18n.t("nowPlaying"); size: Theme.tXs; weight: Font.DemiBold; color: Theme.fg3 }
            VText { text: App.running ? App.running.title : ""; weight: Font.DemiBold; color: Theme.fg }
        }
    }
    VListItem { id: resume; visible: !!App.running; label: I18n.t("resumeGame"); onActivated: { m.close(true); App.resume() } }
    VListItem { visible: !!App.running; label: I18n.t("exitGame"); onActivated: { m.close(true); App.exitGame() } }
    Rectangle { visible: !!App.running; x: Theme.s3; width: parent.width - 2 * Theme.s3; height: 1; color: Theme.line }
    Item { visible: !!App.running; width: 1; height: Theme.s2 }

    VListItem { id: home; label: I18n.t("home"); selected: m.currentScreen === "home" && !App.inGame; onActivated: m.run("home", () => App.go("home")) }
    VListItem { id: library; label: I18n.t("library"); selected: m.currentScreen === "library" && !App.inGame; onActivated: m.run("library", () => App.go("library")) }
    VListItem { id: emu; label: I18n.t("emulation"); onActivated: m.run("emu", () => App.go("library", { filter: "emu" })) }
    VListItem { id: downloads; label: I18n.t("downloads"); onActivated: m.run("downloads", () => App.toast(I18n.t("noDownloads"), { icon: "download" })) }
    VListItem { id: settings; label: I18n.t("settings"); selected: m.currentScreen === "settings" && !App.inGame; onActivated: m.run("settings", () => App.go("settings")) }
    VListItem { id: edit; visible: !!m.me; label: I18n.t("editProfile"); onActivated: m.run("edit", () => App.open("profile", { profile: m.me })) }
    VListItem { id: user; label: I18n.t("switchUser"); onActivated: m.run("user", () => App.request("switchUser")) }
    VListItem { id: power; label: I18n.t("power"); onActivated: m.run("power", () => App.openPower()) }
}
