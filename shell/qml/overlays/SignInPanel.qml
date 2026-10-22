// Sign in from Settings > Accounts: the same flows as setup, in a side panel. A Steam picture
// fills in only where the profile has no picture of its own.
import QtQuick
import dev.vanta.shell

VPanel {
    id: s

    property string kind: "steam"

    title: kind === "steam" ? I18n.t("signInSteam") : I18n.t("vantaAccount")

    function linked(account) {
        const me = Profiles.current
        if (!me) return
        const changes = {}
        changes[kind] = account
        if (kind === "steam" && !me.photo && account.avatar) changes.photo = account.avatar
        Profiles.update(me.id, changes)
        close(true)
        App.toast(I18n.t("signedInAs", { name: kind === "steam" ? account.persona : account.email }), { icon: "checkCircle" })
        App.refresh({ section: "accounts" })
    }

    Loader {
        width: parent.width
        sourceComponent: s.kind === "steam" ? steam : vanta
        onLoaded: App.later(0, () => Nav.focusFirst())
    }
    Component { id: steam; SteamSignIn { onDone: account => s.linked(account) } }
    Component { id: vanta; VantaSignIn { onDone: account => s.linked(account) } }
}
