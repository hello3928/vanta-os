// Short notifications in the bottom-right corner (the mockup's VToast). Not focusable; plays the
// notify sound and rumble. show(text, { icon, tone, sound, duration })
import QtQuick
import dev.vanta.shell

Column {
    id: host

    spacing: Theme.s2

    function show(text, opts) {
        opts = opts || {}
        const t = toast.createObject(host, { text: text, icon: opts.icon || "bell", tone: opts.tone || "default" })
        const sound = opts.sound === undefined ? "notify" : opts.sound
        if (sound) Sound.play(sound)
        Haptics.play(opts.tone === "bad" ? "error" : "notify")
        App.later(opts.duration || 3200, () => {
            t.shown = false
            App.later(300, () => t.destroy())
        })
    }

    Component {
        id: toast
        Rectangle {
            id: t
            property string text
            property string icon
            property string tone
            property bool shown: false
            anchors.right: parent ? parent.right : undefined
            width: Math.min(22 * Theme.rem, Theme.width - 32)
            height: row.height + 1.7 * Theme.rem
            radius: Theme.rLg
            color: Theme.surface2
            border.width: 1
            border.color: Theme.line
            opacity: shown ? 1 : 0
            transform: Translate { x: t.shown ? 0 : 12; Behavior on x { NumberAnimation { duration: t.shown ? Theme.tBase : Theme.tFast; easing.type: Easing.OutCubic } } }
            Behavior on opacity { NumberAnimation { duration: t.shown ? Theme.tBase : Theme.tFast } }
            Component.onCompleted: shown = true
            Row {
                id: row
                x: 1.1 * Theme.rem
                width: parent.width - 2.2 * Theme.rem
                anchors.verticalCenter: parent.verticalCenter
                spacing: Theme.s3
                Icon {
                    name: t.icon
                    size: 1.4 * Theme.rem
                    color: t.tone === "bad" ? Theme.bad : t.tone === "good" ? Theme.good : Theme.accentHi
                    anchors.verticalCenter: parent.verticalCenter
                }
                VText {
                    width: parent.width - 1.4 * Theme.rem - Theme.s3
                    text: t.text
                    size: Theme.tSm
                    color: Theme.fg
                    wrapMode: Text.Wrap
                    anchors.verticalCenter: parent.verticalCenter
                }
            }
        }
    }
}
