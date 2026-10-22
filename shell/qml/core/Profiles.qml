// Profiles for "Who's playing?" (the mockup's core/Profiles.js). Each has a name, a colour, and
// optionally a cropped photo (a JPEG under ~/.config/vanta/profiles/), plus the Steam and Vanta
// accounts linked to it. Saved to ~/.config/vanta/profiles.json.
pragma Singleton
import QtQuick
import dev.vanta.shell

QtObject {
    id: p

    // Muted, distinct colours that keep white initials readable.
    readonly property var colors: ["#3d5a80", "#2f6f69", "#6b4c7a", "#8a4b33", "#5d6b3a", "#4a5262", "#7a3e52", "#2f5f8a"]
    property var list: []
    property string currentId: ""
    readonly property var current: list.find(x => x.id === currentId) || null
    readonly property Sys sys: Sys {}
    readonly property string file: sys.configDir + "/profiles.json"
    readonly property string photoDir: sys.configDir + "/profiles"

    function nextColor() { return colors[list.length % colors.length] }
    function byId(id) { return list.find(x => x.id === id) || null }

    function save() {
        sys.writeText(file, JSON.stringify({ list: list, current: currentId }, null, 1))
    }

    function add(o) {
        const item = {
            id: "p" + Date.now().toString(36),
            name: (o.name || "").trim() || I18n.t("defaultName"),
            color: o.color || nextColor(),
            photo: o.photo || "",
            steam: o.steam || null,
            vanta: o.vanta || null
        }
        list = list.concat([item])
        save()
        return item
    }

    function update(id, changes) {
        list = list.map(x => {
            if (x.id !== id) return x
            const next = Object.assign({}, x, changes)
            if ("name" in changes) next.name = (changes.name || "").trim() || x.name
            return next
        })
        save()
    }

    function remove(id) {
        const gone = byId(id)
        if (gone && gone.photo && gone.photo.indexOf(photoDir) >= 0) sys.remove(gone.photo.replace("file://", ""))
        list = list.filter(x => x.id !== id)
        if (currentId === id) currentId = ""
        save()
    }

    function use(id) { currentId = id; save() }
    function guest() { currentId = ""; save() }

    function reload() {
        const text = sys.readText(file)
        try {
            const data = text ? JSON.parse(text) : {}
            list = data.list || []
            currentId = data.current || ""
        } catch (e) {
            list = []
            currentId = ""
        }
    }

    // The first letter of the name, for pictures without a photo.
    function initial(name) {
        const s = (name || "").trim()
        return s ? Array.from(s)[0].toLocaleUpperCase() : "?"
    }

    Component.onCompleted: reload()
}
