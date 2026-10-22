// An icon from the shared set (Phosphor, MIT), drawn from data/icons/<name>.svg in white.
import QtQuick
import dev.vanta.shell

Image {
    property string name
    property string dataDir
    property real size: Theme.tLg
    width: size
    height: size
    sourceSize: Qt.size(size * 2, size * 2)
    source: name ? "file://" + dataDir + "/icons/" + name + ".svg" : ""
    fillMode: Image.PreserveAspectFit
    smooth: true
}
