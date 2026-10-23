// Vanta account: email and password, then create an account or sign in (the mockup's
// Accounts.js vantaSignIn). The password is never kept. The account service isn't running yet:
// set VANTA_ACCOUNT_URL to point at one. Without it the option isn't offered (App.vantaAccounts),
// except with VANTA_SAMPLE=1, where the mockup's simulated sign-in runs.
import QtQuick
import dev.vanta.shell

Column {
    id: v

    signal done(var account)
    property string message
    property bool busy: false
    readonly property string service: App.sys.env("VANTA_ACCOUNT_URL")

    width: parent ? parent.width : 0
    spacing: Theme.s4

    function submit(mode) {
        const problem = !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value) ? I18n.t("emailInvalid")
            : password.value.length < 8 ? I18n.t("passwordShort") : ""
        if (problem) return fail(problem)
        if (!App.sample && !service) return fail(I18n.t("vantaUnavailable"))
        busy = true
        message = ""
        if (!service) {
            App.later(1300, () => finish({ email: email.value }))
            return
        }
        const xhr = new XMLHttpRequest()
        xhr.onreadystatechange = () => {
            if (xhr.readyState !== XMLHttpRequest.DONE) return
            busy = false
            if (xhr.status === 200) finish({ email: email.value })
            else fail(xhr.status === 401 ? I18n.t("wrongPassword") : I18n.t("vantaUnavailable"))
        }
        xhr.open("POST", service + (mode === "create" ? "/accounts" : "/sessions"))
        xhr.setRequestHeader("Content-Type", "application/json")
        xhr.send(JSON.stringify({ email: email.value, password: password.value }))
    }

    function finish(account) {
        busy = false
        password.value = ""
        done(account)
    }

    function fail(text) {
        busy = false
        message = text
        Sound.play("error")
        Haptics.play("error")
        shake.restart()
    }

    Column {
        readonly property bool focusGroup: true
        width: parent.width
        spacing: 4
        VTextField { id: email; label: I18n.t("email"); placeholder: I18n.t("notSet"); maxLength: 64; icon: "mail"; scrollTop: true }
        VTextField { id: password; label: I18n.t("password"); placeholder: I18n.t("notSet"); maxLength: 64; icon: "lock"; password: true }
    }
    Item {
        width: parent.width
        height: v.busy || v.message ? banner.height : 0
        visible: v.busy || v.message !== ""
        transform: Translate { id: shiftX }
        VBanner { id: banner; visible: !v.busy; tone: "error"; message: v.message }
        Row {
            visible: v.busy
            spacing: Theme.s3
            VSpinner { size: "sm" }
            VText { text: I18n.t("signingIn"); size: Theme.tSm }
        }
    }
    Row {
        spacing: Theme.s3
        VButton { label: I18n.t("createAccount"); variant: "primary"; onActivated: v.submit("create") }
        VButton { label: I18n.t("signIn"); onActivated: v.submit("signin") }
    }
    SequentialAnimation {
        id: shake
        NumberAnimation { target: shiftX; property: "x"; to: -8; duration: 60 }
        NumberAnimation { target: shiftX; property: "x"; to: 7; duration: 70 }
        NumberAnimation { target: shiftX; property: "x"; to: 0; duration: 80 }
    }
}
