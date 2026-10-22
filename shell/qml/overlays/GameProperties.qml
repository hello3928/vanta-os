// A game's properties (the mockup's Game.js properties()): how it runs, cloud saves, files,
// and Uninstall (through the Steam client).
import QtQuick
import dev.vanta.shell

VPanel {
    id: p

    property var game: null

    title: I18n.t("properties")
    subtitle: game ? game.title : ""

    RuntimeControl {
        game: p.game
        value: p.game ? Games.profile(p.game.id).runtime : undefined
        onPicked: v => Games.setProfile(p.game.id, "runtime", v)
    }
    VToggle { label: I18n.t("cloudSaves"); value: true }
    VListItem { label: I18n.t("browseFiles"); chevron: true; onActivated: App.toast(I18n.t("notAvailable"), { icon: "info" }) }
    VListItem {
        visible: !!p.game && p.game.installed && p.game.source === "steam"
        label: I18n.t("uninstall")
        detail: p.game ? p.game.size : ""
        chevron: true
        onActivated: App.confirm({ title: I18n.t("uninstallQ", { game: p.game.title }), body: I18n.t("uninstallBody"), confirmLabel: I18n.t("uninstall"), danger: true }, () => {
            Games.uninstall(p.game)
            p.close(true)
            App.toast(I18n.t("uninstalled", { game: p.game.title }), { icon: "trash" })
            Games.lib.refresh()
        })
    }
}
