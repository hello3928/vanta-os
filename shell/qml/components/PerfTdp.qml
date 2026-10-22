// Power limit slider (the mockup's perf.js tdpSlider): the device's own range, in watts.
// Disabled with the reason where the device has no power limit to set (desktops).
import QtQuick
import dev.vanta.shell

VSlider {
    label: I18n.t("tdpLimit")
    from: System.tdpRange.min
    to: System.tdpRange.max
    step: 1
    format: v => v + " W"
    unsupported: System.unsupported("tdp")
}
