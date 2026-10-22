// Pick a photo for a profile: pictures from ~/Pictures, Steam screenshots and USB drives, newest
// first. A console has no file dialog, so this is a plain grid. picked(path) gives the file.
import QtQuick
import dev.vanta.shell

VPanel {
    id: p

    signal picked(string path)
    readonly property var photos: {
        const sys = App.sys
        const roots = [sys.home + "/Pictures", sys.home + "/Pictures/Screenshots"]
        JSON.parse(sys.glob("/run/media/*/*")).forEach(d => roots.push(d))
        const steam = Games.lib.steamRoot
        if (steam) JSON.parse(sys.glob(steam + "/userdata/*/760/remote/*/screenshots")).forEach(d => roots.push(d))
        let files = []
        for (const r of roots) files = files.concat(JSON.parse(sys.listDir(r)).filter(f => !f.dir && /\.(jpe?g|png|webp)$/i.test(f.name)))
        return files.sort((a, b) => b.mtime - a.mtime).slice(0, 60)
    }

    title: I18n.t("uploadPhoto")
    subtitle: photos.length ? "" : I18n.t("noPhotos")

    Flow {
        readonly property bool focusGroup: true
        width: parent.width
        spacing: Theme.s2
        leftPadding: Theme.s1
        Repeater {
            model: p.photos
            VTile {
                required property var modelData
                shape: "landscape"
                artWidth: (p.panelWidth - 2 * Theme.s3 - Theme.s2 - 2 * Theme.s1) / 2
                src: "file://" + modelData.path
                title: modelData.name
                onActivated: {
                    p.close(true)
                    p.picked(modelData.path)
                }
            }
        }
    }
}
