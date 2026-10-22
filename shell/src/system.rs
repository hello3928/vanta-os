//! System facts for the UI: the OS name, where shared data (icons, fonts) lives, and the
//! screenshot path used for checking layouts.

#[cxx_qt::bridge]
pub mod qobject {
    unsafe extern "C++" {
        include!("cxx-qt-lib/qstring.h");
        type QString = cxx_qt_lib::QString;
    }

    extern "RustQt" {
        #[qobject]
        #[qml_element]
        #[qproperty(QString, os_name, cxx_name = "osName")]
        #[qproperty(QString, data_dir, cxx_name = "dataDir")]
        #[qproperty(QString, screenshot_path, cxx_name = "screenshotPath")]
        type System = super::SystemRust;
    }
}

use cxx_qt_lib::QString;
use std::{env, fs};

pub struct SystemRust {
    os_name: QString,
    data_dir: QString,
    screenshot_path: QString,
}

impl Default for SystemRust {
    fn default() -> Self {
        Self {
            os_name: QString::from(&os_pretty_name()),
            data_dir: QString::from(&env::var("VANTA_DATA").unwrap_or_else(|_| "/usr/share/vanta".into())),
            screenshot_path: QString::from(&env::var("VANTA_SCREENSHOT").unwrap_or_default()),
        }
    }
}

/// PRETTY_NAME from /etc/os-release ("Vanta OS 0.1"), or "Vanta OS" when running elsewhere.
fn os_pretty_name() -> String {
    fs::read_to_string("/etc/os-release")
        .ok()
        .and_then(|text| {
            text.lines()
                .find_map(|l| l.strip_prefix("PRETTY_NAME=").map(|v| v.trim_matches('"').to_string()))
        })
        .filter(|name| name.starts_with("Vanta"))
        .unwrap_or_else(|| "Vanta OS".into())
}
