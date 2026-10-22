// Quick access (the mockup's Menus.js openQuickAccess): the right drawer with an icon rail for
// notifications, quick settings and performance. Like a console quick menu, focusing a rail icon
// switches the page straight away. LB/RB step through the pages. Performance applies to the
// running game when there is one, so its runtime decides what's available.
import QtQuick
import dev.vanta.shell

VPanel {
    id: q

    readonly property bool isQuickAccess: true
    property string tab: "quick"
    readonly property var tabsModel: [
        { id: "notifications", label: I18n.t("notifications"), icon: "bell" },
        { id: "quick", label: I18n.t("quickSettings"), icon: "sliders" },
        { id: "performance", label: I18n.t("performance"), icon: "bolt" }
    ]

    side: "right"
    title: tabsModel.find(t => t.id === tab).label
    subtitle: tab === "quick" ? Region.time(Region.now)
            : tab === "performance" ? (System.hasBattery ? I18n.t("batteryPct", { n: Math.round(System.battery * 100) }) : System.deviceName) : ""
    rail: Component {
        VTabs {
            id: railTabs
            variant: "rail"
            model: q.tabsModel
            value: q.tab
            onChanged: id => q.tab = id
        }
    }

    function stepTab(d) {
        const tabs = railItem
        tabs.step(d)
        Nav.focus(tabs.activeTab, true)
    }

    onTabChanged: {
        if (tab === "notifications") Notifications.seen()
        App.later(0, () => { if (Nav.current && !Nav.usable(Nav.current)) Nav.focusFirst() })
    }

    Component.onCompleted: {
        if (tab === "notifications") Notifications.seen()
        // Start in the page, not on the rail.
        for (let i = 0; i < bodyColumn.children.length; i++) {
            const c = bodyColumn.children[i]
            if (c.visible && c.focusable === true) { initial = c; break }
        }
    }

    // Notifications
    VListItem {
        visible: q.tab === "notifications" && Notifications.list.length === 0
        label: I18n.t("noNotifications")
        focusable: false
    }
    Repeater {
        model: q.tab === "notifications" ? Notifications.list : []
        VListItem {
            required property var modelData
            label: modelData.label
            detail: modelData.detail
            icon: modelData.icon
        }
    }

    // Quick settings
    VSlider { visible: q.tab === "quick"; label: I18n.t("brightness"); icon: "sun"; from: 10; to: 100; step: 5; key: "brightness" }
    VSlider { visible: q.tab === "quick"; label: I18n.t("volume"); icon: "volume"; from: 0; to: 100; step: 5; key: "volume" }
    VToggle { visible: q.tab === "quick"; label: I18n.t("wifi"); detail: System.wifiSsid; key: "wifi" }
    VToggle { visible: q.tab === "quick"; label: I18n.t("bluetooth"); key: "bluetooth" }
    VToggle { visible: q.tab === "quick"; label: I18n.t("airplane"); key: "airplane" }
    VToggle { visible: q.tab === "quick"; label: I18n.t("gameMusic"); key: "gameMusic" }
    VToggle { visible: q.tab === "quick"; label: I18n.t("interfaceSounds"); key: "sfx" }
    VDropdown { visible: q.tab === "quick"; label: I18n.t("haptics"); options: ["Off", "Low", "High"]; key: "haptics" }

    // Performance
    VDropdown { visible: q.tab === "performance"; label: I18n.t("perfOverlay"); options: ["Off", "FPS", "Basic", "Full"]; key: "overlay" }
    VDropdown { visible: q.tab === "performance"; label: I18n.t("frameLimit"); options: System.frameOptions(); key: "fpsLimit" }
    VToggle { visible: q.tab === "performance"; label: I18n.t("limitTdp"); key: "tdpLimit"; unsupported: System.unsupported("tdp") }
    PerfTdp { visible: q.tab === "performance"; key: "tdp" }
    PerfUpscaling { visible: q.tab === "performance"; key: "upscaling"; game: App.running }
    VToggle { visible: q.tab === "performance"; label: I18n.t("vrr"); key: "vrr"; unsupported: System.unsupported("vrr") }
}
