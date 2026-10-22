// VTopBar: page title on the left; notifications, Wi-Fi, battery, clock and quick access on the right.
import QtQuick
import dev.vanta.shell

Item {
    id: bar
    property string title: ""
    property string dataDir
    height: Theme.barH

    Text {
        anchors { left: parent.left; leftMargin: Theme.gutter; verticalCenter: parent.verticalCenter }
        text: bar.title
        color: Theme.fg
        font { family: Theme.font; pixelSize: Theme.tLg; weight: Font.DemiBold }
    }

    Row {
        anchors { right: parent.right; rightMargin: Theme.gutter; verticalCenter: parent.verticalCenter }
        spacing: 1.375 * Theme.rem

        Icon { name: "statusBell"; dataDir: bar.dataDir; size: Theme.tLg; anchors.verticalCenter: parent.verticalCenter }
        Icon { name: "wifi3"; dataDir: bar.dataDir; size: Theme.tLg; anchors.verticalCenter: parent.verticalCenter }
        Row {
            spacing: Theme.s1 * 1.5
            anchors.verticalCenter: parent.verticalCenter
            Text {
                text: "100%"
                color: Theme.fg2
                font { family: Theme.font; pixelSize: Theme.tSm; weight: Font.Medium }
                anchors.verticalCenter: parent.verticalCenter
            }
            Icon { name: "batteryFull"; dataDir: bar.dataDir; size: Theme.tLg; anchors.verticalCenter: parent.verticalCenter }
        }
        Text {
            id: clock
            color: Theme.fg
            font { family: Theme.font; pixelSize: Theme.tSm; weight: Font.DemiBold }
            anchors.verticalCenter: parent.verticalCenter
            function tick() { text = Qt.formatTime(new Date(), Qt.locale().timeFormat(Locale.ShortFormat)) }
            Component.onCompleted: tick()
            Timer { interval: 15000; running: true; repeat: true; onTriggered: clock.tick() }
        }
        Icon { name: "statusMore"; dataDir: bar.dataDir; size: Theme.tLg; anchors.verticalCenter: parent.verticalCenter }
    }
}
