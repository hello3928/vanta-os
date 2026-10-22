//! Vanta OS shell. Runs fullscreen as the gamescope session's main client (see image/), or in a
//! window for development. VANTA_SCREENSHOT=/path.png saves a frame and exits (used to check
//! layouts without a display).

pub mod library;
pub mod system;

use cxx_qt_lib::{QGuiApplication, QQmlApplicationEngine, QUrl};

fn main() {
    let mut app = QGuiApplication::new();
    let mut engine = QQmlApplicationEngine::new();
    if let Some(mut engine) = engine.as_mut() {
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
