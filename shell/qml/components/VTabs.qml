// A row of tabs. A selects; LB/RB step through them with step().
// variant: line (underline) | chips (small filters) | rail (vertical icons, quick access)
// tabs: [{ id, label, icon }]
import QtQuick
import dev.vanta.shell

Item {
    id: tabs

    property var model: []
    property string value: model.length ? model[0].id : ""
    property string variant: "line"
    property bool bumpers: false
    readonly property bool focusGroup: true
    readonly property var activeTab: repeater.count ? repeater.itemAt(Math.max(0, model.findIndex(t => t.id === value))) : null
    signal changed(string id)

    function select(id, silent) {
        if (id === value) return
        value = id
        if (!silent) {
            Sound.play("tab")
            Haptics.play("tick")
        }
        changed(id)
    }

    function step(d) {
        const i = model.findIndex(t => t.id === value)
        const next = model[(i + d + model.length) % model.length]
        select(next.id, false)
    }

    implicitWidth: flow.implicitWidth
    implicitHeight: flow.implicitHeight
    width: implicitWidth
    height: implicitHeight

    Grid {
        id: flow
        flow: tabs.variant === "rail" ? Grid.TopToBottom : Grid.LeftToRight
        columns: tabs.variant === "rail" ? 1 : 100
        spacing: tabs.variant === "chips" ? Theme.s2 : Theme.s1
        verticalItemAlignment: Grid.AlignVCenter

        Glyph {
            visible: tabs.bumpers
            action: "prevTab"
            opacity: 0.85
        }
        Repeater {
            id: repeater
            model: tabs.model
            VFocusable {
                id: tab
                required property var modelData
                readonly property string tabId: modelData.id
                readonly property bool active: modelData.id === tabs.value
                readonly property bool rail: tabs.variant === "rail"
                readonly property bool chip: tabs.variant === "chips"
                focusSound: "tab"
                activateSound: "tab"
                activateHaptic: "tick"
                width: rail ? 3 * Theme.rem : label.implicitWidth + 2 * (chip ? 0.85 : 1) * label.font.pixelSize + (icon.visible ? icon.width + Theme.s2 : 0)
                height: rail ? 3 * Theme.rem : chip ? 2.1 * Theme.rem : 2.5 * Theme.rem
                onActivated: tabs.select(modelData.id, true)
                // Rail (quick access): focusing an icon switches the page straight away.
                onFocusIn: if (tab.rail) tabs.select(modelData.id, true)

                Rectangle {
                    anchors.fill: parent
                    radius: tab.rail ? Theme.rMd : Theme.rSm
                    color: tab.focused ? Theme.light
                         : tab.chip ? (tab.active ? Theme.accentSoft : Theme.surface)
                         : tab.rail && tab.active ? Theme.surface2 : "transparent"
                    border.width: tab.chip && tab.active && !tab.focused ? 1 : 0
                    border.color: Theme.accent
                    Behavior on color { ColorAnimation { duration: Theme.tFast } }
                }
                Row {
                    anchors.centerIn: parent
                    spacing: Theme.s2
                    Icon {
                        id: icon
                        name: tab.modelData.icon || ""
                        visible: tab.rail && name !== ""
                        size: 1.45 * Theme.rem
                        color: tab.focused ? Theme.inkOnLight : tab.active ? Theme.fg : Theme.fg3
                        anchors.verticalCenter: parent.verticalCenter
                    }
                    VText {
                        id: label
                        visible: !tab.rail
                        text: tab.modelData.label
                        size: tab.chip ? Theme.tSm : Theme.tMd
                        weight: Font.DemiBold
                        color: tab.focused ? Theme.inkOnLight : tab.active || tab.chip ? (tab.chip && !tab.active ? Theme.fg2 : Theme.fg) : Theme.fg3
                        anchors.verticalCenter: parent.verticalCenter
                    }
                }
                // The active marker: an underline, or a bar beside the rail icon.
                Rectangle {
                    visible: !tab.chip
                    color: tab.focused ? Theme.inkOnLight : Theme.accent
                    radius: 2
                    x: tab.rail ? parent.width + 0.5 * Theme.rem - 3 : label.font.pixelSize
                    y: tab.rail ? 0.7 * Theme.rem : parent.height - 0.15 * label.font.pixelSize - 2
                    width: tab.rail ? 3 : parent.width - 2 * label.font.pixelSize
                    height: tab.rail ? parent.height - 1.4 * Theme.rem : 2
                    scale: tab.active ? 1 : 0
                    Behavior on scale { NumberAnimation { duration: Theme.tBase; easing.type: Easing.OutCubic } }
                }
            }
        }
        Glyph {
            visible: tabs.bumpers
            action: "nextTab"
            opacity: 0.85
        }
    }
}
