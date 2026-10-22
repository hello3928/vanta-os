// System upscaling (FSR through gamescope), the mockup's perf.js upscaling(). The second line
// shows the resolution the game renders at. Emulated games scale with the emulator's internal
// resolution instead, so it's disabled for them.
import QtQuick
import dev.vanta.shell

VDropdown {
    id: u

    property var game: null

    label: I18n.t("upscaling")
    options: ["Off", "Quality", "Balanced", "Performance"]
    unsupported: game && System.runtimeOf(game) === "emulator" ? I18n.t("capEmuUpscale") : ""
    detail: current === "Off" || !current ? "" : I18n.t("upscaleRenders", { res: System.renderSize(current) })
}
