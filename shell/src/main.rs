//! Vanta OS shell. Runs fullscreen as the gamescope session's main client (see image/), or in a
//! window for development (--window). VANTA_SCREENSHOT=/path.png saves a frame and exits (used
//! to check layouts without a display); VANTA_PAGE picks the page it opens on.

pub mod deckbuttons;
pub mod gamepad;
pub mod gamescope;
pub mod icons;
pub mod library;
pub mod netcache;
pub mod sys;

use cxx_qt_lib::{QGuiApplication, QQmlApplicationEngine, QString, QUrl};

fn main() {
    // Video decoding for trailers: VA-API where the GPU has it, otherwise software (dav1d for AV1).
    // FFmpeg's Vulkan decoder is skipped: where it isn't supported it fails every frame instead
    // of falling back.
    if std::env::var_os("QT_FFMPEG_DECODING_HW_DEVICE_TYPES").is_none() {
        std::env::set_var("QT_FFMPEG_DECODING_HW_DEVICE_TYPES", "vaapi");
    }
    let mut app = QGuiApplication::new();
    if let Some(mut app) = app.as_mut() {
        app.as_mut().set_application_name(&QString::from("vanta-shell"));
        app.as_mut().set_organization_name(&QString::from("Vanta"));
    }
    let mut engine = QQmlApplicationEngine::new();
    if let Some(mut engine) = engine.as_mut() {
        netcache::ffi::install_disk_cache(engine.as_mut(), &QString::from(&netcache::dir()));
        icons::ffi::install_icon_provider(engine.as_mut(), &QString::from(&icons::dir()));
        // A QML error leaves no window; exit instead of sitting on an empty event loop.
        engine
            .as_mut()
            .on_object_creation_failed(|_, _| std::process::exit(1))
            .release();
        engine.load(&QUrl::from("qrc:/qt/qml/dev/vanta/shell/qml/Main.qml"));
    }
    if let Some(app) = app.as_mut() {
        app.exec();
    }
}
