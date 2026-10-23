// Round profile picture: the cropped photo if there is one, otherwise
// the name's first letter on the profile colour. No profile (guest) shows a person icon;
// `empty` draws an outlined circle with an icon (Add user).
import QtQuick
import QtQuick.Effects
import dev.vanta.shell

Item {
    id: a

    property var profile: null
    property real size: 1.75 * Theme.rem
    property string emptyIcon
    readonly property string photo: profile && profile.photo ? profile.photo : ""

    width: size
    height: size

    Rectangle {
        anchors.fill: parent
        radius: width / 2
        color: a.emptyIcon ? "transparent" : a.profile && !a.photo ? (a.profile.color || "#4a5262") : Theme.surface2
        border.width: a.emptyIcon ? 2 : 0
        border.color: Theme.surface2
    }
    VText {
        visible: !!a.profile && !a.photo && !a.emptyIcon
        anchors.centerIn: parent
        text: a.profile ? Profiles.initial(a.profile.name) : ""
        size: a.size * 0.45
        weight: Font.Bold
        color: "#ffffff"
        elide: Text.ElideNone
    }
    Icon {
        visible: !a.profile || a.emptyIcon !== ""
        anchors.centerIn: parent
        name: a.emptyIcon || "user"
        size: a.size * 0.45
        color: Theme.fg2
    }
    Image {
        id: img
        anchors.fill: parent
        visible: false
        source: a.photo
        fillMode: Image.PreserveAspectCrop
        sourceSize: Qt.size(Math.ceil(a.size * 2), Math.ceil(a.size * 2))
        cache: false
    }
    Connections {
        target: System
        function onNetEpochChanged() { App.reloadIfFailed(img, () => a.photo) }
    }
    MultiEffect {
        anchors.fill: parent
        visible: a.photo !== ""
        source: img
        maskEnabled: true
        maskSource: circle
    }
    Rectangle {
        id: circle
        anchors.fill: parent
        radius: width / 2
        visible: false
        layer.enabled: true
    }
}
