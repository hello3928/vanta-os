// Downloads: what Steam is downloading or installing, with its progress, read from Steam's
// manifests every two seconds while anything is in progress (Games.qml). Steam runs the
// downloads; selecting one opens its game.
import QtQuick
import dev.vanta.shell

VPanel {
    id: d

    title: I18n.t("downloads")
    readonly property var list: { Games.revision; Games.downloadRevision; return Games.downloads() }

    function stateText(g) {
        const s = Games.downloadState(g)
        const label = s === "paused" ? I18n.t("downloadPaused") : s === "installing" ? I18n.t("installingGame")
                    : s === "queued" ? I18n.t("downloadQueued") : I18n.t("downloading")
        if (s !== "downloading" || !g.bytesToDownload) return label
        const parts = [label, I18n.t("bytesOf", { done: Games.sizeText(g.bytesDownloaded) || "0 MB", total: Games.sizeText(g.bytesToDownload) })]
        if (g.rate >= 1e5) parts.push((g.rate / 1e6).toFixed(1) + " MB/s")
        return parts.join(" · ")
    }

    VText {
        visible: d.list.length === 0
        width: parent.width
        topPadding: Theme.s4
        text: I18n.t("noDownloads")
        color: Theme.fg3
    }
    Repeater {
        model: d.list
        Column {
            required property var modelData
            width: parent.width
            spacing: Theme.s1
            VListItem {
                width: parent.width
                label: modelData.title
                detail: d.stateText(modelData)
                trailText: ["downloading", "installing"].indexOf(Games.downloadState(modelData)) >= 0 && Games.downloadProgress(modelData) > 0
                           ? Math.round(Games.downloadProgress(modelData) * 100) + "%" : ""
                chevron: true
                onActivated: { d.close(true); App.openGame(modelData) }
            }
            VProgress {
                width: parent.width
                showValue: false
                indeterminate: Games.downloadState(modelData) === "queued" || Games.downloadProgress(modelData) <= 0
                value: Games.downloadProgress(modelData)
                tone: Games.downloadState(modelData) === "paused" ? "light" : "accent"
            }
            Item { width: 1; height: Theme.s3 }
        }
    }
}
