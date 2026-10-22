// Renders the setup background, shell/data/setup-wall.jpg: a tilted wall of popular games'
// Steam capsules, like a streaming service's sign-up page. It's made once and shipped, so setup
// shows it even before Wi-Fi. The shell darkens it on screen (components/ArtWall.qml).
// Run in WSL: tools/wsl/render-setup-wall.sh
import QtQuick
import QtQuick.Window

Window {
    id: win

    width: 1920
    height: 1080
    visible: true
    color: "#1a1d23"

    // Popular Steam games.
    readonly property var appids: [1245620, 1086940, 1145350, 1091500, 367520, 2379780, 553850, 1174180, 292030, 413150,
        1551360, 504230, 814380, 2358720, 632470, 620, 730, 570, 271590, 1172470, 105600, 252490, 1145360, 1623730,
        1966720, 2246340, 578080, 1903340, 275850, 239140, 435150, 945360]
    readonly property int columns: 14
    readonly property int rows: 6
    readonly property real tileW: 230
    readonly property real gap: 18
    property int done: 0
    readonly property string out: Qt.application.arguments[Qt.application.arguments.length - 1]

    Grid {
        id: grid
        anchors.centerIn: parent
        columns: win.columns
        spacing: win.gap
        // Tilted back and to the side, a little in depth.
        transform: [
            Rotation { origin.x: grid.width / 2; origin.y: grid.height / 2; axis { x: 0; y: 1; z: 0 } angle: -14 },
            Rotation { origin.x: grid.width / 2; origin.y: grid.height / 2; axis { x: 1; y: 0; z: 0 } angle: 10 },
            Rotation { origin.x: grid.width / 2; origin.y: grid.height / 2; angle: -12 }
        ]
        Repeater {
            model: win.columns * win.rows
            Rectangle {
                required property int index
                // Shift each row so the same games don't line up.
                readonly property int appid: win.appids[(index + Math.floor(index / win.columns) * 5) % win.appids.length]
                width: win.tileW
                height: win.tileW * 1.5
                radius: 6
                color: "#2b2f38"
                clip: true
                Image {
                    anchors.fill: parent
                    source: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/" + parent.appid + "/library_600x900_2x.jpg"
                    sourceSize.width: 460
                    fillMode: Image.PreserveAspectCrop
                    asynchronous: true
                    smooth: true
                    onStatusChanged: if (status === Image.Ready || status === Image.Error) win.done++
                }
            }
        }
    }

    Timer {
        interval: 500
        repeat: true
        running: true
        property int waited: 0
        onTriggered: {
            waited += interval
            if (win.done < win.columns * win.rows && waited < 30000) return
            stop()
            win.contentItem.grabToImage(r => {
                r.saveToFile(win.out)
                console.log("saved " + win.out + " (" + win.done + " images)")
                Qt.quit()
            })
        }
    }
}
