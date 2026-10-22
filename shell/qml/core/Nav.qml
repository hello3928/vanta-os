// Spatial focus navigation for controller and keyboard (the mockup's core/FocusManager.js).
// - Scopes form a stack: the page is the root scope; panels and dialogs push their own.
// - Moving picks the nearest focusable item in that direction, scored on screen geometry.
// - Containers with `focusGroup: true` (rows, lists) remember their last focused item, so
//   going back into a row returns you to where you were.
// - A container can route a direction to a specific item: `navDown: someItem`.
// Focusable items are VFocusable (components/VFocusable.qml); they register themselves.
pragma Singleton
import QtQuick

QtObject {
    id: nav

    property var items: []
    property var scopes: []
    property var current: null
    // The top bar: clickable whenever no panel is open; reachable with Up from the page when
    // chromeNav is on (Home turns it off: Up opens the trailer there).
    property var chrome: null
    property bool chromeNav: true
    property var beforeChrome: null
    // How the user is driving the UI: "keyboard", "gamepad" or "pointer".
    property string device: "keyboard"

    function register(item) { items.push(item) }
    function unregister(item) {
        const i = items.indexOf(item)
        if (i >= 0) items.splice(i, 1)
        if (current === item) current = null
        if (beforeChrome === item) beforeChrome = null
    }

    function contains(ancestor, item) {
        for (let p = item; p; p = p.parent) if (p === ancestor) return true
        return false
    }
    function inChrome(item) { return !!chrome && !!item && contains(chrome, item) }
    function chromeActive() { return !!chrome && scopes.length === 1 && chrome.visible && chrome.opacity > 0 }
    readonly property var scope: scopes.length ? scopes[scopes.length - 1] : null

    function usable(item) {
        return item && item.focusable && item.visible && item.enabled && item.width > 0 && item.height > 0
    }

    function inScope(item) {
        return !!scope && (contains(scope.item, item) || (chromeActive() && inChrome(item)))
    }

    function focusables() {
        if (!scope) return []
        const root = scope.item
        const withChrome = scopes.length === 1 && chromeNav && chromeActive()
        return items.filter(it => usable(it) && (contains(root, it) || (withChrome && inChrome(it))))
    }

    function setRoot(item, onBack) {
        if (current) current.setFocused(false, true)
        current = null
        scopes = [{ item: item, onBack: onBack, memory: new Map(), prev: null }]
        beforeChrome = null
    }

    function pushScope(item, opts) {
        opts = opts || {}
        scopes = scopes.concat([{ item: item, onBack: opts.onBack, memory: new Map(), prev: current }])
        if (current) current.setFocused(false, true)
        current = null
        focusFirst(opts.initial)
    }

    function popScope(item) {
        const i = scopes.findIndex(s => s.item === item)
        if (i <= 0) return
        const wasTop = i === scopes.length - 1
        const s = scopes[i]
        const next = scopes.slice()
        next.splice(i, 1)
        scopes = next
        if (!wasTop) return
        if (current) current.setFocused(false, true)
        current = null
        if (s.prev && items.indexOf(s.prev) >= 0 && usable(s.prev)) focus(s.prev, true)
        else focusFirst()
    }

    // Positioners (Column, Row, Flow) lay out lazily; picking by position needs them done.
    function settle(root) {
        if (!root || !root.visible) return
        if (typeof root.forceLayout === "function") root.forceLayout()
        const kids = root.children
        for (let i = 0; i < kids.length; i++) settle(kids[i])
        if (root.contentItem && root.contentItem !== root) settle(root.contentItem)
    }

    function focusFirst(initial) {
        if (!(initial && items.indexOf(initial) >= 0 && usable(initial)) && scope) settle(scope.item)
        const target = initial && items.indexOf(initial) >= 0 && usable(initial) ? initial : orderFirst(focusables())
        if (target) focus(target, true)
    }

    // The first item in reading order (top to bottom, then left to right).
    function orderFirst(list) {
        let best = null, bestKey = null
        for (const it of list) {
            const r = rect(it)
            const key = [Math.round(r.y), Math.round(r.x)]
            if (!best || key[0] < bestKey[0] || (key[0] === bestKey[0] && key[1] < bestKey[1])) { best = it; bestKey = key }
        }
        return best
    }

    function groupOf(item) {
        for (let p = item.parent; p; p = p.parent) if (p.focusGroup === true) return p
        return null
    }

    function focus(item, silent) {
        if (!item || item === current) return
        if (inChrome(item) && current && !inChrome(current)) beforeChrome = current
        if (current) current.setFocused(false, silent)
        current = item
        item.setFocused(true, silent)
        reveal(item)
        const g = groupOf(item)
        if (g && scope) scope.memory.set(g, item)
    }

    function rect(item) {
        const p = item.mapToItem(null, 0, 0)
        return { x: p.x, y: p.y, w: item.width, h: item.height, l: p.x, r: p.x + item.width, t: p.y, b: p.y + item.height }
    }

    function gap(a1, a2, b1, b2) {
        if (b2 < a1) return a1 - b2
        if (b1 > a2) return b1 - a2
        return 0
    }

    // Back from the top bar to the page item you came from.
    function leaveChrome() {
        if (!inChrome(current)) return false
        const back = beforeChrome
        if (back && items.indexOf(back) >= 0 && usable(back) && contains(scope.item, back)) focus(back)
        else focusFirst()
        return true
    }

    function move(dir) {
        const cur = current
        if (cur && usable(cur) && !cur.disabled && cur.handleDirection(dir)) return
        const list = focusables()
        if (!cur || list.indexOf(cur) < 0) { focusFirst(); return }
        if (dir === "down" && inChrome(cur)) { leaveChrome(); return }

        // A container can send a direction to a specific item or group.
        const key = "nav" + dir.charAt(0).toUpperCase() + dir.slice(1)
        for (let p = cur.parent; p; p = p.parent) {
            const target = p[key]
            if (target && typeof target === "object" && !contains(target, cur)) {
                const remembered = scope.memory.get(target)
                const pick = remembered && list.indexOf(remembered) >= 0 ? remembered
                    : (target.focusable ? target : orderFirst(list.filter(it => contains(target, it))))
                if (pick) { focus(pick); return }
                break
            }
            if (target) break
        }

        const r = rect(cur)
        const tolX = r.w * 0.2, tolY = r.h * 0.2
        const rcx = (r.l + r.r) / 2, rcy = (r.t + r.b) / 2
        let best = null, bestScore = Infinity
        for (const it of list) {
            if (it === cur) continue
            const c = rect(it)
            const ccx = (c.l + c.r) / 2, ccy = (c.t + c.b) / 2
            let primary, secondary
            if (dir === "right") {
                if (c.l < r.r - tolX || ccx <= rcx) continue
                primary = Math.max(0, c.l - r.r)
                secondary = gap(r.t, r.b, c.t, c.b) + Math.abs(ccy - rcy) * 0.1
            } else if (dir === "left") {
                if (c.r > r.l + tolX || ccx >= rcx) continue
                primary = Math.max(0, r.l - c.r)
                secondary = gap(r.t, r.b, c.t, c.b) + Math.abs(ccy - rcy) * 0.1
            } else if (dir === "down") {
                if (c.t < r.b - tolY || ccy <= rcy) continue
                primary = Math.max(0, c.t - r.b)
                secondary = gap(r.l, r.r, c.l, c.r) + Math.abs(ccx - rcx) * 0.1
            } else {
                if (c.b > r.t + tolY || ccy >= rcy) continue
                primary = Math.max(0, r.t - c.b)
                secondary = gap(r.l, r.r, c.l, c.r) + Math.abs(ccx - rcx) * 0.1
            }
            const score = primary + secondary * 2.5
            if (score < bestScore) { bestScore = score; best = it }
        }
        if (!best) { cur.edge(dir); return }

        // Entering a different group: return to the item remembered there.
        const g = groupOf(best)
        if (g && !contains(g, cur)) {
            const remembered = scope.memory.get(g)
            if (remembered && list.indexOf(remembered) >= 0) best = remembered
        }
        focus(best)
    }

    function accept() { if (current) current.activate() }
    function options() { if (current) current.options() }

    function back() {
        if (current && current.handleBack()) return
        if (scope && scope.onBack) scope.onBack()
    }

    // Keeps the focused item in view: shelves glide sideways, pages and panels vertically.
    // Scrollable containers are VScroll (components/VScroll.qml).
    function reveal(item) {
        let block = item
        for (let p = item.parent; p; p = p.parent) {
            if (p.isVScroll !== true) {
                if (p.revealBlock === true && block === item) block = p
                continue
            }
            // Not laid out yet: nothing to keep in view.
            if (p.width <= 0 || p.height <= 0) return
            if (p.horizontal) {
                const x = item.mapToItem(p.contentItem, 0, 0).x
                const start = x - p.padStart
                const end = x + item.width + p.padEnd - p.width
                if (p.alignStart) p.scrollTo(start, null)
                else if (start < p.contentX) p.scrollTo(start, null)
                else if (end > p.contentX) p.scrollTo(end, null)
            } else {
                let top = false
                for (let q = item; q && q !== p; q = q.parent) if (q.scrollTop === true) { top = true; break }
                if (top) { p.scrollTo(null, 0); return }
                const topGap = p.pageScroll ? p.height * 0.12 : 24
                const bottomGap = p.pageScroll ? 96 : 24
                const by = block.mapToItem(p, 0, 0).y
                const ey = item.mapToItem(p, 0, 0).y + item.height
                let target = p.contentY
                if (by < topGap) target += by - topGap
                else if (ey > p.height - bottomGap) target += ey - (p.height - bottomGap)
                p.scrollTo(null, target)
                return
            }
        }
    }
}
