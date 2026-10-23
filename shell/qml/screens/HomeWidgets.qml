// Home widgets, like the PS5's (the mockup's screens/widgets.js): play time this week,
// achievements, friends, downloads and storage. Play time is counted by Vanta while games run;
// storage is the home drive. Achievements and friends need Steam's Web API, so outside the
// sample library they stay hidden until that's connected.
import QtQuick
import dev.vanta.shell

VRow {
    id: row

    readonly property var week: { Games.revision; Games.daily; return Games.week() }
    readonly property real weekMax: Math.max(1, ...week)
    readonly property int weekMinutes: Math.round(week.reduce((a, b) => a + b, 0) * 60)
    readonly property var achGames: { Games.revision; return Games.all.filter(g => g.ach && g.ach[0] !== null) }
    readonly property int achGot: achGames.reduce((a, g) => a + g.ach[0], 0)
    readonly property int achAll: achGames.reduce((a, g) => a + g.ach[1], 0)
    readonly property int notInstalled: { Games.revision; return Games.all.filter(g => !g.installed).length }
    readonly property int updating: { Games.revision; return Games.all.filter(g => g.updating).length }
    readonly property var friends: Games.sample ? [
        { name: "rook", color: "#3d5a80", game: "Helldivers 2" },
        { name: "mira", color: "#7a3e52", game: null },
        { name: "jaxx", color: "#2f6f69", game: "Balatro" }
    ] : []
    readonly property var storage: App.sample ? { free: 412e9, total: 1e12 } : System.storageInfo

    function bytes(n) {
        if (n >= 1e12) return (Math.round(n / 1e11) / 10) + " TB"
        return Math.round(n / 1e9) + " GB"
    }

    component Value: Column {
        property string value
        property string detail
        spacing: Theme.s1
        VText { text: parent.value; size: Theme.tXl; weight: Font.DemiBold; color: Theme.fg; font.features: { "tnum": 1 } }
        VText { visible: text !== ""; text: parent.detail; size: Theme.tSm; color: Theme.fg3 }
    }
    component Bar: Rectangle {
        property real ratio: 0
        height: 4
        radius: 2
        color: Theme.track
        Rectangle { width: parent.width * Math.max(0, Math.min(1, parent.ratio)); height: 4; radius: 2; color: Theme.chart1 }
    }

    // Play time: the week's total and a bar per day (today in bold). One series, so no legend.
    Widget {
        size: "m"
        label: I18n.t("thisWeek")
        onActivated: App.go("library")
        Value {
            anchors.bottom: parent.bottom
            value: I18n.duration(row.weekMinutes)
        }
        Row {
            anchors { right: parent.right; bottom: parent.bottom }
            width: Math.min(10 * Theme.rem, parent.width * 0.55)
            height: 4.2 * Theme.rem
            spacing: 3
            Repeater {
                model: row.week
                Column {
                    required property real modelData
                    required property int index
                    readonly property bool today: index === 6
                    width: (parent.width - 18) / 7
                    anchors.bottom: parent.bottom
                    spacing: 3
                    Rectangle {
                        width: parent.width
                        height: Math.max(2, modelData / row.weekMax * 3 * Theme.rem)
                        color: modelData ? Theme.chart1 : Theme.track
                        radius: 4
                        Rectangle { anchors { left: parent.left; right: parent.right; bottom: parent.bottom } height: Math.min(4, parent.height / 2); color: parent.color }
                    }
                    VText {
                        anchors.horizontalCenter: parent.horizontalCenter
                        text: {
                            const d = new Date()
                            d.setDate(d.getDate() - (6 - index))
                            return I18n.weekday(d)
                        }
                        size: 0.65 * Theme.rem
                        weight: today ? Font.DemiBold : Font.Normal
                        color: today ? Theme.fg : Theme.fg4
                    }
                }
            }
        }
    }

    Widget {
        visible: row.achAll > 0
        label: I18n.t("achievements")
        onActivated: App.go("library")
        Column {
            anchors.bottom: parent.bottom
            width: parent.width
            spacing: Theme.s2
            Value { value: I18n.number(row.achGot); detail: I18n.t("ofTotal", { n: I18n.number(row.achAll) }) }
            Bar { width: parent.width; ratio: row.achGot / Math.max(1, row.achAll) }
        }
    }

    Widget {
        visible: row.friends.length > 0
        size: "m"
        label: I18n.t("friendsOnlineCount", { n: row.friends.length })
        onActivated: App.toast(I18n.t("notAvailable"), { icon: "group" })
        Column {
            anchors.bottom: parent.bottom
            width: parent.width
            spacing: 0.4 * Theme.rem
            Repeater {
                model: row.friends
                Row {
                    required property var modelData
                    spacing: Theme.s2
                    Avatar {
                        profile: modelData
                        size: 1.5 * Theme.rem
                        anchors.verticalCenter: parent.verticalCenter
                    }
                    VText { text: modelData.name; size: Theme.tSm; weight: Font.Medium; color: Theme.fg; anchors.verticalCenter: parent.verticalCenter }
                    VText {
                        text: modelData.game || I18n.t("online")
                        size: Theme.tSm
                        color: modelData.game ? "#8bc26f" : Theme.fg3
                        anchors.verticalCenter: parent.verticalCenter
                    }
                }
            }
        }
    }

    Widget {
        label: I18n.t("downloads")
        onActivated: App.toast(I18n.t("noDownloads"), { icon: "download" })
        Value {
            anchors.bottom: parent.bottom
            value: row.updating ? I18n.t("updatingCount", { n: row.updating }) : I18n.t("upToDate")
            detail: row.notInstalled ? I18n.t("notInstalledCount", { n: row.notInstalled }) : ""
        }
    }

    Widget {
        visible: row.storage.total > 0
        label: I18n.t("storage")
        onActivated: App.go("settings", { section: "about" })
        Column {
            anchors.bottom: parent.bottom
            width: parent.width
            spacing: Theme.s2
            Value { value: row.bytes(row.storage.free); detail: I18n.t("freeOf", { total: row.bytes(row.storage.total) }) }
            Bar { width: parent.width; ratio: 1 - row.storage.free / Math.max(1, row.storage.total) }
        }
    }
}
