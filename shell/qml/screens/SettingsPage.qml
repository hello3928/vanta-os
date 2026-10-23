// Settings, laid out like SteamOS: a darker category strip on
// the left running the full height, the focused category's rows on the right. Rows are label +
// value, with a second line only where it tells you something you need. B in the rows returns
// to the list; B on the list leaves Settings.
import QtQuick
import dev.vanta.shell

Screen {
    id: page

    readonly property var sections: [
        { id: "accounts", label: I18n.t("accounts"), icon: "account_circle", page: accounts },
        { id: "profile", label: I18n.t("profile"), icon: "person", page: profile },
        { id: "display", label: I18n.t("display"), icon: "desktop", page: display },
        { id: "sound", label: I18n.t("sound"), icon: "volume", page: sound },
        { id: "controllers", label: I18n.t("controllers"), icon: "gamepad", page: controllers },
        { id: "performance", label: I18n.t("performance"), icon: "bolt", page: performance },
        { id: "emulation", label: I18n.t("emulation"), icon: "disc", page: emulation },
        { id: "appearance", label: I18n.t("appearance"), icon: "palette", page: appearance },
        { id: "language", label: I18n.t("language"), icon: "language", page: language },
        { id: "datetime", label: I18n.t("dateTime"), icon: "clock", page: datetime },
        { id: "system", label: I18n.t("system"), icon: "update", page: system },
        { id: "about", label: I18n.t("about"), icon: "info", page: about }
    ]
    property string section: params.section || "accounts"
    readonly property var current: sections.find(s => s.id === section) || sections[0]

    shell: ({ title: I18n.t("settings"), strip: Theme.settingsNav, hints: [["accept", I18n.t("select")], ["back", I18n.t("back")]] })

    function enter() {
        Nav.focus(navRep.itemAt(sections.findIndex(s => s.id === section)), true)
    }

    function onBack() {
        if (Nav.current && Nav.contains(pane, Nav.current)) {
            Nav.focus(navRep.itemAt(sections.findIndex(s => s.id === section)), true)
            return true
        }
        return false
    }

    // Sub-heading and note inside a section.
    component Label: VText {
        width: parent ? parent.width - 2 * Theme.s3 : 0
        x: Theme.s3
        topPadding: Theme.s5
        bottomPadding: Theme.s1
        size: Theme.tMd
        weight: Font.DemiBold
        color: Theme.fg
    }
    component Note: VText {
        width: Math.min(parent ? parent.width - 2 * Theme.s3 : 0, 60 * Theme.tSm * 0.5)
        x: Theme.s3
        bottomPadding: Theme.s2
        size: Theme.tSm
        color: Theme.fg3
        wrapMode: Text.Wrap
        elide: Text.ElideNone
    }

    // Category strip
    Rectangle {
        id: strip
        width: Theme.settingsNav
        height: parent.height
        color: Theme.bg2
        Column {
            id: navCol
            readonly property bool focusGroup: true
            x: Math.max(Theme.s2, Theme.gutter - Theme.s4)
            y: Theme.barH + Theme.s3
            width: parent.width - x - Theme.s2
            spacing: 1
            Repeater {
                id: navRep
                model: page.sections
                VControl {
                    id: navItem
                    required property var modelData
                    readonly property bool chosen: modelData.id === page.section
                    label: modelData.label
                    icon: modelData.icon
                    minHeight: 2.6 * Theme.rem
                    padX: 0.85 * Theme.rem
                    hairline: false
                    fill: focused ? Theme.light : chosen ? Theme.surface2 : "transparent"
                    labelColor: focused ? Theme.inkOnLight : chosen ? Theme.fg : Theme.fg2
                    iconColor: focused ? Theme.inkOnLight : chosen ? Theme.fg : Theme.fg3
                    onFocusIn: page.section = modelData.id
                    onActivated: {
                        const first = Nav.orderFirst(Nav.focusables().filter(it => Nav.contains(pane, it)))
                        if (first) Nav.focus(first, true)
                    }
                }
            }
        }
    }

    VScroll {
        id: paneScroll
        x: Theme.settingsNav
        width: parent.width - x
        height: parent.height
        contentHeight: pane.y + pane.height + Theme.s7 + Theme.hintH
        onContentYChanged: App.shellScrolled = contentY > 4
        Column {
            id: pane
            readonly property bool focusGroup: true
            x: Theme.s6
            y: Theme.barH + Theme.s4
            width: Math.min(50 * Theme.rem, paneScroll.width - Theme.s6 - Theme.gutter)
            VText {
                x: Theme.s3
                bottomPadding: Theme.s3
                text: page.current.label
                size: Theme.tXl
                weight: Font.DemiBold
                color: Theme.fg
            }
            Loader {
                id: loader
                width: parent.width
                sourceComponent: page.current.page
                onLoaded: paneScroll.contentY = 0
            }
        }
    }

    // ---------- sections ----------

    Component {
        id: accounts
        Column {
            readonly property var me: Profiles.current
            width: parent ? parent.width : 0
            Note { visible: !parent.me; text: I18n.t("accountsGuest") }
            Label { visible: !!parent.me; text: "Steam"; topPadding: 0 }
            VListItem {
                visible: !!parent.me && !!parent.me.steam
                label: parent.me && parent.me.steam ? parent.me.steam.persona : ""
                detail: parent.me && parent.me.steam && parent.me.steam.level ? I18n.t("steamSummary", { level: parent.me.steam.level, since: parent.me.steam.since }) : ""
                badge: ({ text: I18n.t("signedIn"), tone: "good" })
            }
            VToggle { visible: !!parent.me && !!parent.me.steam; label: I18n.t("syncAchievements"); key: "steamAchievements" }
            VToggle { visible: !!parent.me && !!parent.me.steam; label: I18n.t("syncScreenshots"); key: "steamScreenshots" }
            VToggle { visible: !!parent.me && !!parent.me.steam; label: I18n.t("showFriends"); key: "steamFriends" }
            VListItem {
                visible: !!parent.me && !!parent.me.steam
                label: I18n.t("signOutSteam")
                chevron: true
                onActivated: App.confirm({ title: I18n.t("signOutSteamQ"), body: I18n.t("signOutSteamBody"), confirmLabel: I18n.t("signOut"), danger: true },
                                         () => {
                                             Steam.forget(Profiles.current.steam.steamId)
                                             Profiles.update(Profiles.current.id, { steam: null })
                                         })
            }
            VListItem {
                visible: !!parent.me && !parent.me.steam
                label: I18n.t("signInSteam")
                detail: I18n.t("steamOptionDetail")
                chevron: true
                onActivated: App.open("signIn", { kind: "steam" })
            }
            Label { visible: !!parent.me && App.vantaAccounts; text: I18n.t("vantaAccount") }
            VListItem {
                visible: !!parent.me && !!parent.me.vanta
                label: parent.me && parent.me.vanta ? parent.me.vanta.email : ""
                detail: I18n.t("vantaOptionDetail")
                badge: ({ text: I18n.t("signedIn"), tone: "good" })
            }
            VToggle { visible: !!parent.me && !!parent.me.vanta; label: I18n.t("syncSettings"); key: "vantaSync" }
            VListItem {
                visible: !!parent.me && !!parent.me.vanta
                label: I18n.t("signOut")
                chevron: true
                onActivated: App.confirm({ title: I18n.t("signOutVantaQ"), confirmLabel: I18n.t("signOut"), danger: true },
                                         () => Profiles.update(Profiles.current.id, { vanta: null }))
            }
            VListItem {
                visible: !!parent.me && !parent.me.vanta && App.vantaAccounts
                label: I18n.t("vantaAccount")
                detail: I18n.t("vantaOptionDetail")
                chevron: true
                onActivated: App.open("signIn", { kind: "vanta" })
            }
        }
    }

    Component {
        id: profile
        Column {
            width: parent ? parent.width : 0
            VListItem {
                visible: !!Profiles.current
                label: Profiles.current ? Profiles.current.name : ""
                detail: I18n.t("editProfile")
                chevron: true
                onActivated: App.open("profile", { profile: Profiles.current })
            }
            VListItem { label: I18n.t("switchUser"); chevron: true; onActivated: App.request("switchUser") }
        }
    }

    Component {
        id: display
        Column {
            width: parent ? parent.width : 0
            VSlider { label: I18n.t("brightness"); from: 10; to: 100; step: 5; key: "brightness" }
            VToggle { label: I18n.t("vrr"); key: "vrr"; unsupported: System.unsupported("vrr") }
            VToggle { label: I18n.t("hdr"); key: "hdr"; unsupported: System.unsupported("hdr") }
            PerfUpscaling { key: "upscaling" }
            VDropdown { label: I18n.t("frameLimit"); options: System.frameOptions(); key: "fpsLimit" }
        }
    }

    Component {
        id: sound
        Column {
            width: parent ? parent.width : 0
            VSlider { label: I18n.t("volume"); from: 0; to: 100; step: 5; key: "volume" }
            VToggle { label: I18n.t("gameMusic"); key: "gameMusic" }
            VSlider { label: I18n.t("musicVolume"); from: 0; to: 100; step: 5; key: "musicVolume" }
            VToggle { label: I18n.t("trailerBg"); key: "trailerVideo" }
            VToggle { label: I18n.t("interfaceSounds"); key: "sfx" }
            VSlider { label: I18n.t("uiVolume"); from: 0; to: 100; step: 5; key: "sfxVolume" }
            Label { text: I18n.t("preview") }
            Flow {
                readonly property bool focusGroup: true
                x: Theme.s3
                width: parent.width - 2 * Theme.s3
                topPadding: Theme.s2
                bottomPadding: Theme.s2
                spacing: Theme.s2
                Repeater {
                    model: [["select", I18n.t("previewSelect")], ["toggleOn", I18n.t("previewToggle")], ["notify", I18n.t("previewNotify")], ["error", I18n.t("previewError")]]
                    VButton {
                        required property var modelData
                        label: modelData[1]
                        size: "sm"
                        activateSound: ""
                        onActivated: Sound.play(modelData[0])
                    }
                }
            }
        }
    }

    Component {
        id: controllers
        Column {
            width: parent ? parent.width : 0
            VListItem { label: I18n.t("connectedControllers"); detail: App.pads && App.pads.names ? App.pads.names : I18n.t("noController") }
            VDropdown {
                label: I18n.t("buttonPrompts")
                detail: I18n.t("buttonPromptsDetail")
                options: ["Automatic", "Xbox", "PlayStation", "Nintendo", "Steam Deck"]
                key: "glyphs"
            }
            VDropdown { label: I18n.t("hapticsStrength"); options: ["Off", "Low", "High"]; key: "haptics" }
            VToggle { label: I18n.t("menuHaptics"); key: "menuHaptics" }
            VListItem { label: I18n.t("testHaptics"); chevron: true; onActivated: Haptics.play("test", { force: true }) }
            VListItem { label: I18n.t("buttonLayout"); chevron: true; onActivated: App.toast(I18n.t("notAvailable"), { icon: "info" }) }
        }
    }

    Component {
        id: performance
        Column {
            width: parent ? parent.width : 0
            PerfTdp { label: I18n.t("defaultTdp"); key: "tdp" }
            VDropdown { label: I18n.t("epp"); options: ["Power saver", "Balanced", "Performance"]; key: "epp" }
            VDropdown { label: I18n.t("scheduler"); options: ["scx_lavd", "Kernel default"]; key: "scheduler" }
            VToggle { label: "GameMode"; key: "gamemode" }
        }
    }

    Component {
        id: emulation
        Column {
            width: parent ? parent.width : 0
            VListItem {
                label: I18n.t("romFolder")
                detail: "~/Games/roms"
                trailText: I18n.t("gamesCount", { n: Games.emulated().length })
            }
            VListItem {
                label: I18n.t("rescan")
                chevron: true
                onActivated: {
                    Games.lib.refresh()
                    App.later(600, () => App.toast(I18n.t("libraryUpToDate"), { icon: "checkCircle" }))
                }
            }
            Label { text: I18n.t("systems") }
            Repeater {
                model: Games.systems
                VListItem {
                    required property var modelData
                    readonly property var bios: Games.biosLabel[Games.biosStatus(modelData)]
                    label: modelData.name
                    detail: modelData.emulator
                    badge: ({ text: I18n.t(bios.key), tone: bios.tone })
                }
            }
            Item { width: 1; height: Theme.s2 }
            Note { text: I18n.t("biosNote") }
        }
    }

    Component {
        id: appearance
        Column {
            width: parent ? parent.width : 0
            VDropdown {
                label: I18n.t("accent")
                options: [{ value: "ion", label: "Ion" }, { value: "ember", label: "Ember" }, { value: "mint", label: "Mint" }]
                key: "accent"
            }
        }
    }

    Component {
        id: language
        Column {
            width: parent ? parent.width : 0
            VDropdown {
                label: I18n.t("language")
                options: I18n.languages.map(l => ({ value: l.code, label: l.name }))
                key: "language"
            }
        }
    }

    Component {
        id: datetime
        Column {
            width: parent ? parent.width : 0
            VToggle { label: I18n.t("setTimeAuto"); key: "timeAuto" }
            VToggle { label: I18n.t("setZoneAuto"); key: "tzAuto" }
            VListItem {
                visible: Settings.tzAuto
                label: I18n.t("timeZone")
                trailText: Region.zoneLabel(Region.detectedZone)
            }
            VDropdown {
                visible: !Settings.tzAuto
                label: I18n.t("timeZone")
                options: Region.timeZones()
                value: Settings.timeZone || Region.detectedZone
                onPicked: z => Settings.timeZone = z
            }
            VToggle { label: I18n.t("clock24"); key: "clock24" }
            VDropdown {
                label: I18n.t("region")
                options: Region.regions()
                value: Settings.region || Region.detectedRegion
                onPicked: r => Settings.region = r
            }
            VListItem { label: I18n.t("formatExample"); detail: Region.date(Region.now) + " · " + Region.time(Region.now) }
        }
    }

    Component {
        id: system
        Column {
            width: parent ? parent.width : 0
            VListItem {
                label: "Vanta OS " + System.osVersion
                detail: System.imageRef
                badge: System.updateState === "available" || System.updateState === "ready"
                    ? { text: I18n.t(System.updateState === "ready" ? "restartToUpdate" : "updateAvailable"), tone: "accent" }
                    : { text: I18n.t("upToDate"), tone: "good" }
            }
            VDropdown {
                label: I18n.t("updateChannel")
                options: ["Stable", "Beta"]
                key: "channel"
            }
            VListItem {
                label: System.updateState === "available" ? I18n.t("installUpdate") : I18n.t("checkUpdates")
                chevron: true
                busy: System.updateState === "checking" || System.updateState === "downloading"
                onActivated: {
                    if (System.updateState === "available") return System.installUpdate()
                    System.checkUpdates()
                }
            }
            Connections {
                target: System
                function onUpdateStateChanged() {
                    const s = System.updateState
                    if (s === "none") App.toast(I18n.t("latest"), { icon: "checkCircle" })
                    else if (s === "available") App.toast(I18n.t("updateAvailable"), { icon: "update" })
                    else if (s === "ready") App.toast(I18n.t("restartToUpdate"), { icon: "restart" })
                    else if (s === "failed") App.toast(I18n.t("updateFailed"), { icon: "warning", tone: "bad" })
                }
            }
            VListItem {
                label: I18n.t("rollback")
                chevron: true
                onActivated: App.confirm({ title: I18n.t("rollbackQ"), body: I18n.t("rollbackBody"), confirmLabel: I18n.t("rollbackConfirm"), danger: true }, () => {
                    System.rollback()
                    App.toast(I18n.t("rollbackScheduled"), { icon: "restart" })
                })
            }
            VListItem { label: I18n.t("showTour"); chevron: true; onActivated: App.tour() }
            VListItem {
                label: I18n.t("resetSystem")
                chevron: true
                onActivated: App.confirm({ title: I18n.t("resetSystemQ"), body: I18n.t("resetSystemBody"), confirmLabel: I18n.t("resetSystem"), danger: true }, () => App.resetSystem())
            }
        }
    }

    Component {
        id: about
        Column {
            width: parent ? parent.width : 0
            function bytes(n) { return n >= 1e12 ? (Math.round(n / 1e11) / 10) + " TB" : Math.round(n / 1e9) + " GB" }
            VListItem { label: I18n.t("device"); detail: [System.deviceName, System.chip, System.memory].filter(x => x).join(" · ") }
            VListItem { label: I18n.t("display"); detail: System.displayLine }
            VListItem {
                label: I18n.t("storage")
                detail: System.storageInfo.total ? I18n.t("storageVal", { free: parent.bytes(System.storageInfo.free), total: parent.bytes(System.storageInfo.total) }) : ""
            }
            VListItem { label: I18n.t("software"); detail: "Fedora Atomic (bootc) · Mesa RADV · gamescope · Proton" }
        }
    }
}
