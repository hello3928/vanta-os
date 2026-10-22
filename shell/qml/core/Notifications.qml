// Notifications for Quick access: controllers, system updates and other events this session.
// The bell in the top bar shows a dot until the list has been seen.
pragma Singleton
import QtQuick

QtObject {
    id: n

    property var list: []
    property bool unread: false

    function add(label, detail, icon) {
        list = [{ label: label, detail: detail || "", icon: icon || "bell", time: Date.now() }].concat(list).slice(0, 20)
        unread = true
    }
    function seen() { unread = false }
}
