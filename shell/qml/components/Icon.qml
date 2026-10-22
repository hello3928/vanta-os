// An icon from the shared set (Phosphor, MIT): data/icons/<name>.svg, tinted to `color`.
import QtQuick
import QtQuick.Controls.impl
import dev.vanta.shell

Item {
    id: icon

    property string name
    property real size: 1.25 * Theme.tMd
    property color color: Theme.fg2

    width: size
    height: size

    IconImage {
        anchors.fill: parent
        sourceSize: Qt.size(Math.ceil(icon.size * 2), Math.ceil(icon.size * 2))
        source: icon.name ? "file://" + App.sys.dataDir + "/icons/" + icon.name + ".svg" : ""
        color: icon.color
        fillMode: Image.PreserveAspectFit
    }
}
