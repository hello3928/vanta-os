// Profile picture choices: colour swatches with
// the name's initial, plus "Upload a photo" (from Pictures, Steam screenshots or a USB drive,
// then positioned in a round crop) and "Remove photo". Edits `draft` ({ name, color, photo })
// and emits changed() after every change.
import QtQuick
import dev.vanta.shell

Column {
    id: c

    property var draft: ({ name: "", color: Profiles.nextColor(), photo: "" })
    signal changed()

    width: parent ? parent.width : 0

    function set(changes) {
        draft = Object.assign({}, draft, changes)
        changed()
    }

    Flow {
        readonly property bool focusGroup: true
        width: parent.width
        spacing: Theme.s3
        topPadding: Theme.s2
        bottomPadding: Theme.s3
        leftPadding: Theme.s1
        Repeater {
            model: Profiles.colors
            VFocusable {
                id: sw
                required property string modelData
                readonly property bool chosen: !c.draft.photo && c.draft.color === modelData
                width: 3.5 * Theme.rem
                height: width
                scale: focused ? 1.08 : 1
                Behavior on scale { NumberAnimation { duration: Theme.tFast } }
                onActivated: c.set({ color: modelData, photo: "" })
                Rectangle {
                    anchors.fill: parent
                    anchors.margins: -4
                    radius: width / 2
                    visible: sw.chosen || sw.focused
                    color: sw.focused ? "#ffffff" : Theme.accent
                    Rectangle { anchors.fill: parent; anchors.margins: 2; radius: width / 2; color: Theme.panel }
                }
                Avatar {
                    anchors.fill: parent
                    size: parent.width
                    profile: ({ name: c.draft.name || I18n.t("defaultName"), color: sw.modelData })
                }
            }
        }
    }
    VListItem {
        label: I18n.t("uploadPhoto")
        chevron: true
        onActivated: {
            const picker = App.open("photos", {})
            picker.picked.connect(path => {
                const crop = App.open("crop", { source: path })
                crop.saved.connect(photo => c.set({ photo: photo }))
            })
        }
    }
    VListItem {
        visible: !!c.draft.photo
        label: I18n.t("removePhoto")
        onActivated: c.set({ photo: "" })
    }
}
