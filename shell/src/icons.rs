//! Tinted icons as shared images (src/icons.cpp): `image://icon/<name>/<rrggbb or aarrggbb>`.

#[cxx_qt::bridge]
pub mod ffi {
    unsafe extern "C++" {
        include!("cxx-qt-lib/qstring.h");
        include!("cxx-qt-lib/qqmlapplicationengine.h");
        include!("vanta-shell/src/icons.h");
        type QString = cxx_qt_lib::QString;
        type QQmlApplicationEngine = cxx_qt_lib::QQmlApplicationEngine;

        fn install_icon_provider(engine: Pin<&mut QQmlApplicationEngine>, dir: &QString);
    }
}

/// The icon folder: $VANTA_DATA/icons, or /usr/share/vanta/icons (as Sys.dataDir).
pub fn dir() -> String {
    format!("{}/icons", std::env::var("VANTA_DATA").unwrap_or_else(|_| "/usr/share/vanta".into()))
}
