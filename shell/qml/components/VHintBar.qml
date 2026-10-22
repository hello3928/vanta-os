// VHintBar: button prompts along the bottom. Keycaps for now; controller glyphs come with input.
import QtQuick
import dev.vanta.shell

Rectangle {
    id: bar
    property var hints: []   // [[key, label], ...]
    height: Theme.hintH
    color: Qt.rgba(26 / 255, 29 / 255, 35 / 255, 0.92)

    Rectangle { anchors { left: parent.left; right: parent.right; top: parent.top } height: 1; color: Theme.line }

    Row {
        anchors { right: parent.right; rightMargin: Theme.gutter; verticalCenter: parent.verticalCenter }
        spacing: Theme.s5
        Repeater {
            model: bar.hints
            Row {
                spacing: Theme.s2
                Rectangle {
                    anchors.verticalCenter: parent.verticalCenter
                    width: Math.max(height, keyText.implicitWidth + Theme.s3)
                    height: Theme.tSm * 1.6
                    radius: Theme.rSm + 1
                    color: "#f4f6f9"
                    Text {
                        id: keyText
                        anchors.centerIn: parent
                        text: modelData[0]
                        color: "#1a1f27"
                        font { family: Theme.font; pixelSize: Theme.tXs; weight: Font.Bold }
                    }
                }
                Text {
                    anchors.verticalCenter: parent.verticalCenter
                    text: modelData[1]
                    color: Theme.fg2
                    font { family: Theme.font; pixelSize: Theme.tSm; weight: Font.Medium }
                }
            }
        }
    }
}
