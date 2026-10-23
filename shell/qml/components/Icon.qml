// An icon from the shared set (Phosphor, MIT): data/icons/<name>.svg, tinted to `color`.
// Drawn by the icon provider (src/icons.cpp), so each name, colour and size is rendered once and
// shared by every Icon showing it.
import QtQuick
import dev.vanta.shell

Item {
    id: icon

    property string name
    property real size: 1.25 * Theme.tMd
    property color color: Theme.fg2

    width: size
    height: size

    Image {
        anchors.fill: parent
        sourceSize: Qt.size(Math.ceil(icon.size * 2), Math.ceil(icon.size * 2))
        // "#aarrggbb" without the '#', which a URL would read as a fragment.
        source: icon.name ? "image://icon/" + icon.name + "/" + String(icon.color).slice(1) : ""
        fillMode: Image.PreserveAspectFit
        smooth: true
    }
}
