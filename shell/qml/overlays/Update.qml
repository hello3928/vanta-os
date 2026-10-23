// System update: a full screen over everything, opened from Settings > System when an update
// is found. Shows the version change, then rpm-ostree's progress (System.qml) through preparing,
// downloading and installing, then Restart now. Hiding it leaves the update running; Settings
// opens it again.
import QtQuick
import dev.vanta.shell

Overlay {
    id: u

    readonly property bool isUpdate: true
    readonly property string st: System.updateState
    readonly property bool working: st === "downloading"
    readonly property string stageText: System.updateStage === "downloading" ? I18n.t("updateDownloadingStage")
        : System.updateStage === "installing" ? I18n.t("updateInstallingStage") : I18n.t("updatePreparing")
    readonly property string versionLine: System.updateVersion && st !== "none"
        ? "Vanta OS " + System.osVersion + "  →  " + System.updateVersion : "Vanta OS " + System.osVersion

    z: 40
    exitMs: 320

    function open() {
        isOpen = true
        shown = true
        Sound.play("open")
        Haptics.play("select")
        Nav.pushScope(box, { onBack: () => u.close(), initial: initialButton() })
        // Opened with nothing known yet: look for an update first.
        if (st === "" || st === "none" || st === "failed") System.checkUpdates()
    }
    function close(silent) {
        if (!isOpen) return
        if (!silent) { Sound.play("back"); Haptics.play("back") }
        Nav.popScope(box)
        finish()
    }

    function initialButton() {
        return st === "available" ? install : working ? hideButton : st === "ready" ? restart
             : st === "installFailed" ? retry : closeButton
    }
    onStChanged: {
        if (!isOpen) return
        if (st === "ready") { Sound.play("notify"); Haptics.play("notify") }
        else if (st === "installFailed") { Sound.play("error"); Haptics.play("error") }
        App.later(0, () => { if (u.isOpen) Nav.focus(u.initialButton(), true) })
    }

    function timeLeft() {
        if (System.updateStage !== "downloading" || !System.updateTotal || System.updateSpeed < 1e5) return ""
        const secs = (System.updateTotal - System.updateDownloaded) / System.updateSpeed
        return secs < 60 ? I18n.t("lessThanMin") : I18n.t("minLeft", { n: Math.ceil(secs / 60) })
    }
    function amountLine() {
        if (System.updateStage !== "downloading" || !System.updateTotal) return ""
        const parts = [I18n.t("bytesOf", { done: Games.sizeText(System.updateDownloaded) || "0 MB", total: Games.sizeText(System.updateTotal) })]
        if (System.updateSpeed >= 1e6) parts.push(Games.sizeText(System.updateSpeed) + "/s")
        return parts.join("  ·  ")
    }

    Rectangle {
        anchors.fill: parent
        color: Theme.bg2
        opacity: u.shown ? 1 : 0
        Behavior on opacity { NumberAnimation { duration: u.shown ? Theme.tBase : Theme.tFast; easing.type: Easing.OutCubic } }
        MouseArea { anchors.fill: parent }
    }

    Item {
        id: box
        width: Math.min(40 * Theme.rem, u.width - 2 * Theme.s7)
        height: col.height
        anchors.centerIn: parent
        opacity: u.shown ? 1 : 0
        scale: u.shown ? 1 : 0.98
        Behavior on opacity { NumberAnimation { duration: u.shown ? Theme.tSlow : Theme.tFast; easing.type: Easing.OutCubic } }
        Behavior on scale { NumberAnimation { duration: u.shown ? Theme.tSlow : Theme.tFast; easing.type: Easing.OutCubic } }

        Column {
            id: col
            width: parent.width
            spacing: Theme.s6

            Column {
                width: parent.width
                spacing: Theme.s3
                Logo { size: 3 * Theme.rem }
                Item { width: 1; height: Theme.s2 }
                VText { text: I18n.t("sysUpdate"); size: Theme.t2xl; weight: Font.DemiBold; color: Theme.fg }
                VText { text: u.versionLine; size: Theme.tLg; color: Theme.fg3; font.features: { "tnum": 1 } }
            }

            // Found, not started
            VText {
                visible: u.st === "available"
                width: parent.width
                text: I18n.t("updateBody")
                wrapMode: Text.Wrap
                color: Theme.fg2
                lineHeight: 1.15
            }

            // Checking
            Row {
                visible: u.st === "checking"
                spacing: Theme.s3
                VSpinner { size: "sm"; anchors.verticalCenter: parent.verticalCenter }
                VText { text: I18n.t("checkingUpdates"); color: Theme.fg2; anchors.verticalCenter: parent.verticalCenter }
            }

            // Preparing, downloading, installing
            Column {
                visible: u.working
                width: parent.width
                spacing: Theme.s3
                Item {
                    width: parent.width
                    height: stage.implicitHeight
                    VText { id: stage; text: u.stageText; size: Theme.tLg; weight: Font.DemiBold; color: Theme.fg }
                    VText {
                        anchors { right: parent.right; baseline: stage.baseline }
                        visible: System.updateStage === "downloading" && System.updateProgress > 0
                        text: Math.floor(System.updateProgress * 100) + "%"
                        size: Theme.tLg
                        color: Theme.fg2
                        font.features: { "tnum": 1 }
                    }
                }
                VProgress {
                    width: parent.width
                    size: "lg"
                    showValue: false
                    indeterminate: System.updateStage !== "downloading" || System.updateProgress <= 0
                    value: System.updateProgress
                }
                Item {
                    width: parent.width
                    height: amount.implicitHeight
                    VText { id: amount; text: u.amountLine(); size: Theme.tSm; color: Theme.fg3; font.features: { "tnum": 1 } }
                    VText { anchors.right: parent.right; text: u.timeLeft(); size: Theme.tSm; color: Theme.fg3; font.features: { "tnum": 1 } }
                }
                VText {
                    topPadding: Theme.s2
                    width: parent.width
                    text: I18n.t("updateHideNote")
                    size: Theme.tSm
                    color: Theme.fg4
                    wrapMode: Text.Wrap
                }
            }

            // Staged
            Row {
                visible: u.st === "ready"
                width: parent.width
                spacing: Theme.s3
                Icon { name: "check_circle"; color: Theme.good; size: 1.5 * Theme.rem; anchors.top: parent.top }
                Column {
                    width: parent.width - 1.5 * Theme.rem - Theme.s3
                    spacing: Theme.s1
                    VText { text: I18n.t("updateReadyTitle"); size: Theme.tLg; weight: Font.DemiBold; color: Theme.fg }
                    VText {
                        width: parent.width
                        text: I18n.t("updateReadyBody", { version: System.updateVersion || "" }).replace("  ", " ")
                        wrapMode: Text.Wrap
                        color: Theme.fg2
                    }
                }
            }

            // Up to date (opened while a check found nothing)
            VText { visible: u.st === "none"; text: I18n.t("latest"); color: Theme.fg2 }

            // Failed
            Row {
                visible: u.st === "installFailed" || u.st === "failed"
                width: parent.width
                spacing: Theme.s3
                Icon { name: "warning"; color: Theme.bad; size: 1.5 * Theme.rem; anchors.top: parent.top }
                Column {
                    width: parent.width - 1.5 * Theme.rem - Theme.s3
                    spacing: Theme.s1
                    VText {
                        text: u.st === "failed" ? I18n.t("updateFailed") : I18n.t("installFailed")
                        size: Theme.tLg
                        weight: Font.DemiBold
                        color: Theme.fg
                    }
                    VText {
                        width: parent.width
                        text: System.updateError === "busy" ? I18n.t("updateBusy") : I18n.t("installFailedBody")
                        wrapMode: Text.Wrap
                        color: Theme.fg2
                    }
                    VText {
                        visible: System.updateError !== "" && System.updateError !== "busy"
                        width: parent.width
                        topPadding: Theme.s1
                        text: System.updateError
                        size: Theme.tXs
                        color: Theme.fg4
                        font.family: "monospace"
                        wrapMode: Text.Wrap
                    }
                }
            }

            Row {
                spacing: Theme.s3
                VButton { id: install; visible: u.st === "available"; label: I18n.t("updateDownloadInstall"); variant: "primary"; onActivated: System.installUpdate() }
                VButton { id: restart; visible: u.st === "ready"; label: I18n.t("restartNow"); variant: "primary"; onActivated: { u.close(true); App.restart() } }
                VButton { id: retry; visible: u.st === "installFailed"; label: I18n.t("tryAgain"); variant: "primary"; onActivated: System.installUpdate() }
                VButton { id: hideButton; visible: u.working; label: I18n.t("hide"); onActivated: u.close() }
                VButton { visible: u.st === "available" || u.st === "ready"; label: I18n.t("notNow"); onActivated: u.close() }
                VButton { id: closeButton; visible: !u.working && u.st !== "available" && u.st !== "ready"; label: I18n.t("close"); onActivated: u.close() }
            }
        }
    }
}
