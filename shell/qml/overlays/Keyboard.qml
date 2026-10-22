// On-screen keyboard, Steam Deck style (the mockup's VKeyboard). Slides up from the bottom with a
// preview of the text.
// Controller: D-pad moves between keys, A types, B deletes, X adds a space, Start finishes,
// LB/RB move the cursor. Physical keyboard: typing goes straight in; Enter finishes, Esc closes.
import QtQuick
import dev.vanta.shell

Overlay {
    id: kb

    property string label
    property string text
    property bool password: false
    property int maxLength: 64
    property int caret: text.length
    property bool shift: text === "" && !password
    property bool caps: false
    property string page: "letters"
    signal input(string text)
    signal finished(string text)

    readonly property var layouts: ({
        letters: [
            ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
            ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
            ["a", "s", "d", "f", "g", "h", "j", "k", "l", "@"],
            ["shift", "z", "x", "c", "v", "b", "n", "m", ".", "backspace"],
            ["symbols", "left", "space", "right", "done"]
        ],
        symbols: [
            ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
            ["!", "@", "#", "$", "%", "&", "*", "(", ")", "-"],
            ["_", "=", "+", "[", "]", "{", "}", ";", ":", "'"],
            ["\"", ",", ".", "/", "?", "<", ">", "\\", "|", "backspace"],
            ["letters", "left", "space", "right", "done"]
        ]
    })
    readonly property var grow: ({ shift: 1.5, backspace: 1.5, symbols: 1.6, letters: 1.6, done: 1.6, space: 5 })
    readonly property real keyH: Math.max(2.5 * Theme.rem, Math.min(3.25 * Theme.rem, height * 0.072))
    readonly property real gap: 0.375 * Theme.rem

    function open() {
        isOpen = true
        Sound.play("open")
        Haptics.play("tick")
        shown = true
        Nav.pushScope(keys, { onBack: () => kb.backspace(), initial: keyById("q") })
    }

    function close(silent) {
        if (!isOpen) return
        Nav.popScope(keys)
        finish()
    }

    function keyById(id) {
        for (let r = 0; r < rowsRep.count; r++) {
            const row = rowsRep.itemAt(r)
            for (let k = 0; k < row.repeater.count; k++) {
                const key = row.repeater.itemAt(k)
                if (key && key.keyId === id) return key
            }
        }
        return null
    }

    function insert(ch) {
        if (text.length >= maxLength) {
            Sound.play("error")
            Haptics.play("error")
            return
        }
        const c = shift || caps ? ch.toUpperCase() : ch
        text = text.slice(0, caret) + c + text.slice(caret)
        caret += c.length
        if (shift && !caps) shift = false
        Sound.play("key")
        Haptics.play("slider")
        input(text)
    }

    function backspace() {
        if (!caret) {
            Sound.play("error")
            return
        }
        text = text.slice(0, caret - 1) + text.slice(caret)
        caret -= 1
        Sound.play("keyDelete")
        Haptics.play("slider")
        input(text)
    }

    function moveCaret(d) {
        caret = Math.max(0, Math.min(text.length, caret + d))
        Sound.play("key")
    }

    function done() {
        if (!isOpen) return
        Sound.play("select")
        Haptics.play("select")
        const t = text
        close(true)
        finished(t)
    }

    function press(id) {
        if (id.length === 1) return insert(id)
        switch (id) {
        case "space": return insert(" ")
        case "backspace": return backspace()
        case "left": return moveCaret(-1)
        case "right": return moveCaret(1)
        case "shift":
            // Tap: one capital. Tap again while on: caps lock. Tap again: off.
            if (caps) caps = shift = false
            else if (shift) caps = true
            else shift = true
            Sound.play("toggleOn")
            return
        case "symbols": case "letters": {
            const focusedId = Nav.current && Nav.current.keyId
            page = id
            Sound.play("tab")
            App.later(0, () => {
                const again = keyById(focusedId) || keyById(id === "symbols" ? "letters" : "symbols")
                if (again) Nav.focus(again, true)
            })
            return
        }
        case "done": return done()
        }
    }

    // Controller shortcuts while the keyboard is open.
    function handleAction(action) {
        switch (action) {
        case "back": backspace(); return true
        case "options": insert(" "); return true
        case "qam": done(); return true
        case "prevTab": moveCaret(-1); return true
        case "nextTab": moveCaret(1); return true
        case "mainMenu": return true
        default: return false
        }
    }

    // A physical keyboard types straight in while the keyboard is up.
    function handleKey(event) {
        if (event.modifiers & (Qt.ControlModifier | Qt.AltModifier | Qt.MetaModifier)) return false
        if (event.key === Qt.Key_Return || event.key === Qt.Key_Enter || event.key === Qt.Key_Escape) { done(); return true }
        if (event.key === Qt.Key_Backspace) { backspace(); return true }
        if (event.key === Qt.Key_Left || event.key === Qt.Key_Right || event.key === Qt.Key_Up || event.key === Qt.Key_Down) return false
        if (event.text && event.text.length === 1 && event.text >= " ") {
            const wasShift = shift
            shift = false
            const lock = caps
            caps = false
            insert(event.text)
            caps = lock
            shift = wasShift && !lock ? false : shift
            return true
        }
        return false
    }

    Rectangle {
        anchors.fill: parent
        color: Qt.rgba(5 / 255, 7 / 255, 10 / 255, 0.45)
        opacity: kb.shown ? 1 : 0
        Behavior on opacity { NumberAnimation { duration: kb.shown ? Theme.tBase : Theme.tFast } }
        MouseArea { anchors.fill: parent; onClicked: kb.done() }
    }

    Rectangle {
        id: sheet
        width: Math.min(54 * Theme.rem, kb.width)
        height: sheetCol.height + Theme.s4 + Theme.s3
        x: (kb.width - width) / 2
        y: kb.shown ? kb.height - height : kb.height
        color: Theme.panel
        radius: Theme.rLg
        Behavior on y { NumberAnimation { duration: kb.shown ? Theme.tSlow : Theme.tFast; easing.type: Easing.BezierSpline; easing.bezierCurve: kb.shown ? Theme.easeOut : Theme.easeIn } }
        MouseArea { anchors.fill: parent }
        // Square bottom corners.
        Rectangle { anchors { left: parent.left; right: parent.right; bottom: parent.bottom } height: Theme.rLg; color: Theme.panel }
        Rectangle { anchors { left: parent.left; right: parent.right; top: parent.top } height: 1; color: Theme.line; radius: Theme.rLg }

        Column {
            id: sheetCol
            x: Theme.s4
            y: Theme.s4
            width: parent.width - 2 * Theme.s4
            spacing: Theme.s3

            // Preview of the text with a blinking caret.
            Rectangle {
                width: parent.width
                height: preview.height + 1.2 * Theme.rem
                radius: Theme.rMd
                color: Theme.bg2
                border.width: 1
                border.color: Theme.line
                Column {
                    id: preview
                    x: 0.9 * Theme.rem
                    y: 0.6 * Theme.rem
                    width: parent.width - 1.8 * Theme.rem
                    spacing: 0.15 * Theme.rem
                    VText {
                        visible: kb.label !== ""
                        text: kb.label
                        size: Theme.tXs
                        weight: Font.Medium
                        color: Theme.fg3
                    }
                    Row {
                        height: 1.6 * Theme.tLg
                        readonly property string shownText: kb.password ? "•".repeat(kb.text.length) : kb.text
                        VText {
                            text: parent.shownText.slice(0, kb.caret)
                            size: Theme.tLg
                            weight: Font.Medium
                            color: Theme.fg
                            elide: Text.ElideNone
                            anchors.verticalCenter: parent.verticalCenter
                        }
                        Rectangle {
                            width: 2
                            height: 1.15 * Theme.tLg
                            radius: 1
                            color: Theme.accentHi
                            anchors.verticalCenter: parent.verticalCenter
                            SequentialAnimation on opacity {
                                loops: Animation.Infinite
                                running: kb.shown
                                PropertyAction { value: 1 }
                                PauseAnimation { duration: 500 }
                                PropertyAction { value: 0 }
                                PauseAnimation { duration: 500 }
                            }
                        }
                        VText {
                            text: parent.shownText.slice(kb.caret)
                            size: Theme.tLg
                            weight: Font.Medium
                            color: Theme.fg
                            elide: Text.ElideNone
                            anchors.verticalCenter: parent.verticalCenter
                        }
                        VText {
                            visible: kb.text === ""
                            text: I18n.t("startTyping")
                            size: Theme.tLg
                            weight: Font.Medium
                            color: Theme.fg4
                            anchors.verticalCenter: parent.verticalCenter
                        }
                    }
                }
            }

            Column {
                id: keys
                width: parent.width
                spacing: kb.gap
                Repeater {
                    id: rowsRep
                    model: kb.layouts[kb.page]
                    Row {
                        id: keyRow
                        required property var modelData
                        property alias repeater: keyRep
                        readonly property real units: modelData.reduce((sum, id) => sum + (kb.grow[id] || 1), 0)
                        readonly property real unitW: (keys.width - kb.gap * (modelData.length - 1)) / units
                        spacing: kb.gap
                        Repeater {
                            id: keyRep
                            model: keyRow.modelData
                            VFocusable {
                                id: key
                                required property string modelData
                                readonly property string keyId: modelData
                                readonly property bool special: ["shift", "backspace", "symbols", "letters", "left", "right"].indexOf(keyId) >= 0
                                readonly property bool isDone: keyId === "done"
                                readonly property bool lit: keyId === "shift" && (kb.shift || kb.caps)
                                width: keyRow.unitW * (kb.grow[keyId] || 1)
                                height: kb.keyH
                                activateSound: ""
                                activateHaptic: ""
                                function activate() {
                                    press()
                                    kb.press(keyId)
                                }
                                scale: pressed ? 0.94 : 1
                                Behavior on scale { NumberAnimation { duration: Theme.tInstant } }

                                Rectangle {
                                    anchors.fill: parent
                                    anchors.margins: key.isDone && key.focused ? -4 : 0
                                    radius: Theme.rSm + (key.isDone && key.focused ? 4 : 0)
                                    color: "transparent"
                                    border.width: key.isDone && key.focused ? 2 : 0
                                    border.color: "#ffffff"
                                }
                                Rectangle {
                                    anchors.fill: parent
                                    radius: Theme.rSm
                                    color: key.focused ? (key.isDone ? Theme.accentHi : Theme.light)
                                         : key.isDone ? Theme.accent : key.special ? Theme.surface : Theme.surface2
                                    Behavior on color { ColorAnimation { duration: Theme.tInstant } }
                                }
                                readonly property color ink: key.focused && !key.isDone ? Theme.inkOnLight
                                    : key.lit ? Theme.accentHi : key.isDone ? "#ffffff" : key.special ? Theme.fg2 : key.keyId === "space" ? Theme.fg3 : Theme.fg
                                readonly property var icons: ({ shift: kb.caps ? "keyboard_capslock" : "shift", backspace: "backspace", left: "chevron_left", right: "chevron_right" })
                                Icon {
                                    anchors.centerIn: parent
                                    visible: !!key.icons[key.keyId]
                                    name: key.icons[key.keyId] || ""
                                    size: 1.3 * Theme.tLg
                                    color: key.ink
                                }
                                VText {
                                    anchors.centerIn: parent
                                    visible: !key.icons[key.keyId]
                                    text: key.keyId === "space" ? I18n.t("space") : key.keyId === "symbols" ? "&123" : key.keyId === "letters" ? "ABC"
                                        : key.isDone ? I18n.t("done") : (kb.shift || kb.caps ? key.keyId.toUpperCase() : key.keyId)
                                    size: key.special || key.isDone || key.keyId === "space" ? Theme.tSm : Theme.tLg
                                    weight: key.special || key.isDone ? Font.DemiBold : Font.Medium
                                    color: key.ink
                                }
                            }
                        }
                    }
                }
            }

            // Controller: B delete, X space, LB/RB cursor, Start done. Keyboard: the matching keys.
            Row {
                anchors.right: parent.right
                spacing: Theme.s5
                readonly property bool pad: Nav.device === "gamepad" || Settings.glyphs !== "Automatic"
                Repeater {
                    model: [["back", "Backspace", I18n.t("delete")], ["options", "Space", I18n.t("space")], ["tabs", "← →", I18n.t("moveCursor")], ["qam", "Enter", I18n.t("done")]]
                    Row {
                        required property var modelData
                        spacing: 0.5 * Theme.tSm
                        Glyph {
                            anchors.verticalCenter: parent.verticalCenter
                            action: parent.parent.pad ? (parent.modelData[0] === "tabs" ? "prevTab" : parent.modelData[0]) : parent.modelData[1]
                            forceDevice: parent.parent.pad ? "" : "keyboard"
                        }
                        Glyph {
                            anchors.verticalCenter: parent.verticalCenter
                            visible: parent.parent.pad && parent.modelData[0] === "tabs"
                            action: "nextTab"
                        }
                        VText {
                            anchors.verticalCenter: parent.verticalCenter
                            text: parent.modelData[2]
                            size: Theme.tSm
                            weight: Font.Medium
                            color: Theme.fg3
                        }
                    }
                }
            }
        }
    }
}
