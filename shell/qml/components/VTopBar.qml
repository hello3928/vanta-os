// The page title on the left; on the right, buttons for notifications, Wi-Fi, battery, the clock,
// your profile and quick access. Each opens the matching panel; the same
// button again closes it. Controller: Up from the top of a page moves into the bar; Down or B
// returns to the page. One bar for every page.
import QtQuick
import dev.vanta.shell

Item {
    id: bar

    property string title
    property bool scrolled: false
    // A page with a dark side strip (Settings) continues it up through the bar.
    property real strip: 0
    readonly property bool focusGroup: true
    property alias statusArea: status

    height: Theme.barH

    Rectangle {
        anchors.fill: parent
        color: Qt.rgba(26 / 255, 29 / 255, 35 / 255, 0.94)
        opacity: bar.scrolled ? 1 : 0
        Behavior on opacity { NumberAnimation { duration: Theme.tBase } }
        Rectangle { anchors { left: parent.left; right: parent.right; bottom: parent.bottom } height: 1; color: Theme.line }
    }
    Rectangle {
        width: bar.strip
        height: parent.height
        color: Theme.bg2
    }

    VText {
        id: titleText
        anchors { left: parent.left; leftMargin: Theme.gutter; verticalCenter: parent.verticalCenter }
        width: status.x - Theme.gutter - Theme.s3
        text: bar.title
        size: Theme.tLg
        weight: Font.DemiBold
        color: Theme.fg
        onTextChanged: fade.restart()
        NumberAnimation on opacity { id: fade; from: 0; to: 1; duration: Theme.tBase; easing.type: Easing.OutCubic }
    }

    component BarButton: VFocusable {
        id: btn
        property alias contentRow: inner
        default property alias content: inner.data
        property bool round: false
        width: round ? 2.125 * Theme.rem : Math.max(2.125 * Theme.rem, inner.width + Theme.rem)
        height: 2.125 * Theme.rem
        readonly property color ink: focused ? Theme.inkOnLight : Theme.fg2
        function handleBack() { return Nav.leaveChrome() }
        scale: pressed ? 0.94 : 1
        Rectangle {
            anchors.fill: parent
            radius: btn.round ? width / 2 : Theme.rSm
            color: btn.focused ? Theme.light : "transparent"
            Behavior on color { ColorAnimation { duration: Theme.tFast } }
        }
        Row {
            id: inner
            anchors.centerIn: parent
            spacing: 0.4 * Theme.rem
        }
    }

    Row {
        id: status
        anchors { right: parent.right; rightMargin: Theme.gutter - 0.5 * Theme.rem; verticalCenter: parent.verticalCenter }
        spacing: 0.25 * Theme.rem

        BarButton {
            id: bell
            onActivated: App.openQuickAccess("notifications")
            Icon { name: "statusBell"; color: bell.ink; anchors.verticalCenter: parent.verticalCenter }
            // Unread notifications
            Rectangle {
                parent: bell
                x: bell.width - 0.45 * Theme.rem - width
                y: 0.4 * Theme.rem
                width: 0.45 * Theme.rem
                height: width
                radius: width / 2
                color: Theme.accent
                border.width: 2
                border.color: bell.focused ? Theme.light : Theme.bg
                visible: Notifications.unread
            }
        }
        BarButton {
            id: wifi
            onActivated: App.openQuickAccess("quick")
            Icon {
                name: !Settings.wifi ? "wifiOff" : !System.hasNetworkManager ? "wifi3" : !System.wifiSsid && !System.wired ? "wifiOff"
                    : System.wired && !System.wifiSsid ? "wifi3" : "wifi" + Math.max(1, Math.min(3, Math.ceil(System.wifiSignal / 34)))
                color: wifi.ink
                anchors.verticalCenter: parent.verticalCenter
            }
        }
        BarButton {
            id: battery
            visible: System.hasBattery
            onActivated: App.openQuickAccess("performance")
            VText {
                text: Math.round(System.battery * 100) + "%"
                size: Theme.tSm
                weight: Font.Medium
                color: battery.ink
                anchors.verticalCenter: parent.verticalCenter
            }
            Icon {
                readonly property real level: System.battery
                name: System.charging ? "batteryCharging" : level >= 0.9 ? "batteryFull" : level >= 0.6 ? "batteryHigh" : level >= 0.35 ? "batteryMedium" : level >= 0.15 ? "batteryLow" : "batteryWarning"
                color: level < 0.15 && !System.charging ? Theme.bad : battery.ink
                anchors.verticalCenter: parent.verticalCenter
            }
        }
        BarButton {
            id: clock
            width: Math.max(3.6 * Theme.tSm, contentRow.width + Theme.rem)
            onActivated: App.openQuickAccess("quick")
            VText {
                text: Region.time(Region.now)
                size: Theme.tSm
                weight: Font.DemiBold
                color: clock.focused ? Theme.inkOnLight : Theme.fg
                anchors.verticalCenter: parent.verticalCenter
            }
        }
        BarButton {
            id: me
            round: true
            onActivated: App.toggleMainMenu()
            Avatar {
                profile: Profiles.current
                size: 1.625 * Theme.rem
                anchors.verticalCenter: parent.verticalCenter
                Rectangle {
                    anchors.fill: parent
                    anchors.margins: me.focused ? -2 : -1.5
                    radius: width / 2
                    color: "transparent"
                    border.width: me.focused ? 2 : 1.5
                    border.color: me.focused ? Theme.inkOnLight : Qt.rgba(1, 1, 1, 0.22)
                }
            }
        }
        BarButton {
            id: qam
            onActivated: App.toggleQuickAccess()
            Icon { name: "statusMore"; color: qam.ink; anchors.verticalCenter: parent.verticalCenter }
        }
    }
}
