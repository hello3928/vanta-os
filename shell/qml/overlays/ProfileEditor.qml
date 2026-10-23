// Edit a profile, or create one from "Who's playing?": name, picture, and Delete. Edits save as you make them.
import QtQuick
import dev.vanta.shell

VPanel {
    id: e

    property var profile: null
    property bool create: false
    property var draft: profile ? { name: profile.name, color: profile.color, photo: profile.photo || "" } : { name: "", color: Profiles.nextColor(), photo: "" }

    title: create ? I18n.t("newUser") : I18n.t("editProfile")
    initial: nameField
    header: Component {
        Row {
            spacing: Theme.s4
            topPadding: Theme.s3
            bottomPadding: Theme.s2
            Avatar { size: 5 * Theme.rem; profile: ({ name: e.draft.name || I18n.t("defaultName"), color: e.draft.color, photo: e.draft.photo }) }
            VText {
                width: e.panelWidth - 5 * Theme.rem - 2 * Theme.s5 - Theme.s4
                anchors.verticalCenter: parent.verticalCenter
                text: e.draft.name || I18n.t("defaultName")
                size: Theme.tLg
                weight: Font.Bold
                color: Theme.fg
            }
        }
    }

    function save(changes) {
        draft = Object.assign({}, draft, changes)
        if (!create && profile) Profiles.update(profile.id, changes)
    }

    onClosed: if (!create) App.refresh()

    VTextField {
        id: nameField
        label: I18n.t("name")
        value: e.draft.name
        placeholder: I18n.t("defaultName")
        onEdited: t => e.save({ name: t })
    }
    VText {
        x: Theme.s3
        topPadding: Theme.s5
        bottomPadding: Theme.s1
        text: I18n.t("picture")
        weight: Font.DemiBold
        color: Theme.fg
    }
    PictureChooser {
        draft: e.draft
        onChanged: e.save({ color: draft.color, photo: draft.photo })
    }
    Item { width: 1; height: Theme.s2 }
    Rectangle { visible: !e.create; x: Theme.s3; width: parent.width - 2 * Theme.s3; height: 1; color: Theme.line }
    VListItem {
        visible: !e.create
        label: I18n.t("deleteProfile")
        danger: true
        onActivated: App.confirm({ title: I18n.t("deleteQ", { name: e.profile.name }), body: I18n.t("deleteBody"), confirmLabel: I18n.t("deleteProfile"), danger: true }, () => {
            const p = e.profile
            const wasCurrent = Profiles.currentId === p.id
            Profiles.remove(p.id)
            e.create = true   // nothing left to refresh
            e.close(true)
            App.toast(I18n.t("deleted", { name: p.name }), { icon: "delete" })
            if (wasCurrent || (App.screen && App.screen.screenName === "users")) App.go("users", {}, { replace: true })
        })
    }
    VButton {
        visible: e.create
        label: I18n.t("create")
        variant: "primary"
        block: true
        onActivated: {
            Profiles.add({ name: e.draft.name || I18n.t("defaultName"), color: e.draft.color, photo: e.draft.photo })
            e.close(true)
            App.refresh()
        }
    }
}
