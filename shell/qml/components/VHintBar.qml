// Button prompts along the bottom. Glyphs follow the input in use.
// hints: [[action, label], ...]; "tabs" shows both bumpers.
import QtQuick
import dev.vanta.shell

Rectangle {
    id: bar

    property var hints: []
    property bool plain: false

    height: Theme.hintH
    color: plain ? "transparent" : Qt.rgba(26 / 255, 29 / 255, 35 / 255, 0.92)

    Rectangle {
        visible: !bar.plain
        anchors { left: parent.left; right: parent.right; top: parent.top }
        height: 1
        color: Theme.line
    }

    Row {
        id: row
        anchors { right: parent.right; rightMargin: Theme.gutter; verticalCenter: parent.verticalCenter }
        spacing: Theme.s5
        Repeater {
            model: bar.hints
            Row {
                required property var modelData
                spacing: 0.5 * Theme.tSm
                Row {
                    spacing: 0.2 * Theme.rem
                    anchors.verticalCenter: parent.verticalCenter
                    Glyph { action: modelData[0] === "tabs" ? "prevTab" : modelData[0] }
                    Glyph { visible: modelData[0] === "tabs"; action: "nextTab" }
                }
                VText {
                    anchors.verticalCenter: parent.verticalCenter
                    text: modelData[1]
                    size: Theme.tSm
                    weight: Font.Medium
                }
            }
        }
    }
}
