// How a game runs: the Proton version for Windows games,
// the emulator for retro games, and a plain line for native Linux games (nothing to choose).
import QtQuick
import dev.vanta.shell

Item {
    id: r

    property var game: null
    property var value
    signal picked(var value)

    readonly property string runtime: game ? System.runtimeOf(game) : "native"
    readonly property var sys: Games.systemOf(game)

    width: parent ? parent.width : 300
    height: loader.item ? loader.item.height : 0

    Loader {
        id: loader
        width: parent.width
        sourceComponent: r.runtime === "native" ? nativeRow : choice
    }
    Component {
        id: nativeRow
        VListItem {
            label: I18n.t("compatTool")
            trailText: I18n.t("runtimeNative")
        }
    }
    Component {
        id: choice
        VDropdown {
            readonly property var list: r.runtime === "emulator"
                ? [r.sys ? r.sys.emulator : ""].concat(r.sys && r.sys.emulator.indexOf("RetroArch") === 0 ? [] : ["RetroArch"])
                : ["Proton 10", "Proton Experimental", "GE-Proton"]
            label: r.runtime === "emulator" ? I18n.t("emulator") : I18n.t("compatTool")
            options: list
            value: r.value && list.indexOf(r.value) >= 0 ? r.value : list[0]
            onPicked: v => r.picked(v)
        }
    }
}
