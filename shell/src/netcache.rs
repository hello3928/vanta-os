//! Disk cache for game art and avatars (src/netcache.cpp): images from Steam's and libretro's
//! servers are kept in ~/.cache/vanta/net and shown from there on the next start.

#[cxx_qt::bridge]
pub mod ffi {
    unsafe extern "C++" {
        include!("cxx-qt-lib/qstring.h");
        include!("cxx-qt-lib/qqmlapplicationengine.h");
        include!("vanta-shell/src/netcache.h");
        type QString = cxx_qt_lib::QString;
        type QQmlApplicationEngine = cxx_qt_lib::QQmlApplicationEngine;

        fn install_disk_cache(engine: Pin<&mut QQmlApplicationEngine>, dir: &QString);
    }
}

/// The cache folder: $XDG_CACHE_HOME/vanta/net, or ~/.cache/vanta/net.
pub fn dir() -> String {
    let base = std::env::var("XDG_CACHE_HOME")
        .unwrap_or_else(|_| format!("{}/.cache", std::env::var("HOME").unwrap_or_else(|_| "/tmp".into())));
    format!("{base}/vanta/net")
}
