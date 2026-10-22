// Text in the UI typeface. size and weight follow the mockup's type scale (Theme.t*).
import QtQuick
import dev.vanta.shell

Text {
    property real size: Theme.tMd
    property int weight: Font.Normal
    color: Theme.fg2
    font.family: Theme.font
    font.pixelSize: size
    font.weight: weight
    // Figtree is a variable font whose default instance is Light; set the weight axis directly.
    font.variableAxes: ({ "wght": weight })
    elide: Text.ElideRight
    textFormat: Text.PlainText
}
