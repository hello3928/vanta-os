// Interface language (the mockup's core/i18n.js). t("key", { vars }) looks up the current
// language; every dictionary already has English filled in for missing keys. The Intl wording
// the browser gave the mockup (relative days, units, weekdays, region names) comes precomputed
// in the same files: data/i18n/<lang>.json, written by tools/export-i18n.mjs.
// Bindings that call t() update when the language changes, because they read `dict`.
pragma Singleton
import QtQuick
import dev.vanta.shell

QtObject {
    id: i18n

    readonly property Sys sys: Sys {}
    readonly property string lang: Settings.language
    readonly property var languages: load("languages")
    readonly property var dict: load(lang) || load("en")
    readonly property var intl: dict.intl
    // Qt's locale for numbers and dates: language plus the chosen region (en_AU).
    readonly property var locale: Qt.locale(lang.split("-")[0] + "_" + (Settings.region || Region.detectedRegion))

    function load(code) {
        const text = sys.readText(sys.dataDir + "/i18n/" + code + ".json")
        try { return text ? JSON.parse(text) : null } catch (e) { return null }
    }

    // French and Portuguese count 0 and 1 as "one"; Japanese has no plural forms.
    function isOne(n) {
        if (lang === "ja") return false
        if (lang === "fr" || lang === "pt-BR") return n === 0 || n === 1
        return n === 1
    }

    function t(key, vars) {
        const d = dict
        vars = vars || {}
        let s = ("n" in vars && isOne(vars.n) && (key + "_one") in d) ? d[key + "_one"] : (key in d ? d[key] : key)
        for (const k in vars) s = s.split("{" + k + "}").join(String(vars[k]))
        return s
    }

    // Display name for a setting value stored in English ("Off", "High", ...).
    function opt(value) {
        const o = dict.opt || {}
        return value in o ? o[value] : String(value)
    }

    // Days ago → "today", "yesterday", "3 weeks ago", "2 months ago".
    function relDays(days) {
        if (days === null || days === undefined) return t("never")
        if (days < 7) return intl.days[Math.max(0, days)]
        if (days < 30) return intl.weeks[Math.min(5, Math.round(days / 7))]
        return intl.months[Math.min(36, Math.round(days / 30))]
    }

    // Calendar days between an epoch time (seconds) and today.
    function daysSince(epoch) {
        if (!epoch) return null
        const then = new Date(epoch * 1000)
        const now = new Date()
        return Math.round((new Date(now.getFullYear(), now.getMonth(), now.getDate())
                           - new Date(then.getFullYear(), then.getMonth(), then.getDate())) / 86400000)
    }

    // "2 h 40 min" style durations.
    function duration(minutes) {
        const unit = (u, v) => (v === 1 ? intl[u].one : intl[u].other).split("{n}").join(number(v))
        const h = Math.floor(minutes / 60)
        const m = minutes % 60
        const parts = []
        if (h) parts.push(unit("hour", h))
        if (m) parts.push(unit("minute", m))
        return parts.length ? parts.join(" ") : unit("minute", 0)
    }

    function number(n) {
        return Number(n).toLocaleString(locale, "f", 0)
    }

    // Narrow weekday for a Date (S M T W T F S in English).
    function weekday(date) { return intl.weekdays[date.getDay()] }

    function regionName(code) { return intl.regions[code] || code }

    // Capitalised first letter ("Yesterday" at the start of a line).
    function capitalize(s) { return s ? s.charAt(0).toLocaleUpperCase() + s.slice(1) : s }
}
