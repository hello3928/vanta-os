// An inline message inside a page or panel, not a popup (the mockup's VBanner).
// tone: error | warning | info | success.
import QtQuick
import dev.vanta.shell

Rectangle {
    id: b

    property string tone: "info"
    property string title
    property string message

    width: parent ? parent.width : 300
    height: row.height + 1.6 * Theme.rem
    radius: Theme.rMd
    color: tone === "error" ? Theme.badSoft : tone === "warning" ? Theme.warnSoft : tone === "success" ? Theme.goodSoft : Theme.accentSoft

    Row {
        id: row
        x: Theme.rem
        width: parent.width - 2 * Theme.rem
        anchors.verticalCenter: parent.verticalCenter
        spacing: Theme.s3
        Icon {
            name: ({ error: "error", warning: "warning", success: "check_circle" })[b.tone] || "info"
            color: b.tone === "error" ? Theme.bad : b.tone === "warning" ? Theme.warn : b.tone === "success" ? Theme.good : Theme.accentHi
            anchors.verticalCenter: parent.verticalCenter
        }
        Column {
            width: parent.width - 1.25 * Theme.tMd - Theme.s3
            spacing: 0.1 * Theme.rem
            anchors.verticalCenter: parent.verticalCenter
            VText {
                width: parent.width
                visible: b.title !== ""
                text: b.title
                size: Theme.tSm
                weight: Font.DemiBold
                color: Theme.fg
                wrapMode: Text.Wrap
            }
            VText {
                width: parent.width
                visible: b.message !== ""
                text: b.message
                size: Theme.tSm
                wrapMode: Text.Wrap
            }
        }
    }
}
