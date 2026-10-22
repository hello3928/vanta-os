// Region, time zone and clock format (the mockup's core/Region.js).
// The zone and NTP are set on the real system with timedatectl, the language with localectl
// (see System.qml). The clock here formats with the chosen zone's offset, so it is right the
// moment the zone changes.
pragma Singleton
import QtQuick
import dev.vanta.shell

QtObject {
    id: region

    readonly property Sys sys: Sys {}
    property string detectedZone: "UTC"
    readonly property string detectedRegion: {
        const m = /^[a-z]+_([A-Z]{2})/.exec(sys.env("LANG"))
        return m ? m[1] : "US"
    }
    readonly property var zoneList: ["Pacific/Honolulu", "America/Anchorage", "America/Los_Angeles", "America/Denver",
        "America/Chicago", "America/New_York", "America/Sao_Paulo", "Europe/London", "Europe/Madrid", "Europe/Paris",
        "Europe/Berlin", "Europe/Moscow", "Asia/Dubai", "Asia/Kolkata", "Asia/Shanghai", "Asia/Tokyo", "Australia/Perth",
        "Australia/Sydney", "Pacific/Auckland"]
    readonly property var regionList: ["US", "CA", "BR", "GB", "ES", "FR", "DE", "JP", "AU", "NZ"]
    // Minutes east of UTC per zone, filled in by `date` once at start.
    property var offsets: ({})
    readonly property string zone: Settings.tzAuto ? detectedZone : (Settings.timeZone || detectedZone)
    // Ticks every 15 s so clocks bound to time() stay current.
    property date now: new Date()
    readonly property Timer ticker: Timer {
        interval: 15000
        running: true
        repeat: true
        onTriggered: region.now = new Date()
    }

    function offsetLabel(minutes) {
        const sign = minutes < 0 ? "−" : "+"
        const a = Math.abs(minutes)
        const pad = v => (v < 10 ? "0" : "") + v
        return "UTC" + sign + pad(Math.floor(a / 60)) + ":" + pad(a % 60)
    }

    // "UTC+10:00  Sydney"
    function zoneLabel(z) {
        const city = z.split("/").pop().split("_").join(" ")
        return (z in offsets ? offsetLabel(offsets[z]) + "  " : "") + city
    }

    function timeZones() {
        const list = zoneList.indexOf(detectedZone) >= 0 ? zoneList.slice() : zoneList.concat([detectedZone])
        return list.map(z => ({ value: z, label: zoneLabel(z), offset: offsets[z] || 0 }))
                   .sort((a, b) => a.offset - b.offset)
    }

    function regions() {
        const list = regionList.indexOf(detectedRegion) >= 0 ? regionList.slice() : regionList.concat([detectedRegion])
        return list.map(c => ({ value: c, label: I18n.regionName(c) })).sort((a, b) => a.label.localeCompare(b.label))
    }

    // The date as it is in the chosen zone.
    function inZone(date) {
        if (!(zone in offsets)) return date
        return new Date(date.getTime() + (offsets[zone] + date.getTimezoneOffset()) * 60000)
    }

    function time(date) {
        const d = inZone(date || now)
        // Japanese puts 午前/午後 before the time.
        return d.toLocaleTimeString(I18n.locale, Settings.clock24 ? "H:mm" : I18n.lang === "ja" ? "AP h:mm" : "h:mm AP")
    }

    function date(d) {
        d = inZone(d || now)
        if (I18n.lang === "ja") return d.toLocaleDateString(I18n.locale, "yyyy/M/d (ddd)")
        if ((Settings.region || detectedRegion) === "US") return d.toLocaleDateString(I18n.locale, "ddd, MMM d, yyyy")
        return d.toLocaleDateString(I18n.locale, "ddd d MMM yyyy")
    }

    readonly property Connections replies: Connections {
        target: region.sys
        function onFinished(tag, code, out, err) {
            if (tag === "tz-detect") {
                const z = out.trim()
                if (code === 0 && z) region.detectedZone = z
                region.measure()
            } else if (tag.indexOf("tz-off:") === 0 && code === 0) {
                const m = /([+-])(\d\d)(\d\d)/.exec(out)
                if (!m) return
                const next = Object.assign({}, region.offsets)
                next[tag.slice(7)] = (m[1] === "-" ? -1 : 1) * (parseInt(m[2]) * 60 + parseInt(m[3]))
                region.offsets = next
            }
        }
    }

    function measure() {
        const list = zoneList.concat([detectedZone])
        if (Settings.timeZone) list.push(Settings.timeZone)
        for (const z of list) sys.exec("tz-off:" + z, "env", JSON.stringify(["TZ=" + z, "date", "+%z"]))
    }

    Component.onCompleted: sys.exec("tz-detect", "timedatectl", JSON.stringify(["show", "-p", "Timezone", "--value"]))
}
