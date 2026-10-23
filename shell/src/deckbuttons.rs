//! The Steam Deck's Steam and "..." buttons, read straight from the built-in controller.
//!
//! While Steam runs it takes over the Deck's controls, presents a virtual pad without these two
//! buttons, and opens Big Picture on the Steam button. Steam reads the controller's raw HID
//! reports; the shell reads the same reports alongside it (hidraw allows several readers, and
//! Steam's udev rules give the signed-in user access) and maps the Steam button to Vanta's main
//! menu and "..." to Quick access. Gamescope keeps Steam's own window off screen.
//!
//! Report layout as in the kernel's driver (drivers/hid/hid-steam.c): 64 bytes starting
//! 01 00 09 (Deck state); Steam is byte 9 bit 5, "..." byte 14 bit 2.

use std::fs::{self, File};
use std::io::Read;
use std::path::PathBuf;
use std::thread;

const VALVE: &str = "000028DE";
const DECK_CONTROLLER: &str = "00001205";

/// Starts a reader thread per Deck controller node; `press` gets "mainMenu" or "qam".
pub fn watch(press: impl Fn(&'static str) + Send + Clone + 'static) {
    for node in deck_nodes() {
        let press = press.clone();
        thread::spawn(move || read_node(node, press));
    }
}

/// /dev/hidraw* nodes of the Deck's built-in controller.
fn deck_nodes() -> Vec<PathBuf> {
    let Ok(entries) = fs::read_dir("/sys/class/hidraw") else { return Vec::new() };
    entries
        .flatten()
        .filter(|e| {
            fs::read_to_string(e.path().join("device/uevent"))
                .is_ok_and(|u| u.lines().any(|l| l.starts_with("HID_ID=") && l.contains(VALVE) && l.contains(DECK_CONTROLLER)))
        })
        .map(|e| PathBuf::from("/dev").join(e.file_name()))
        .collect()
}

fn read_node(node: PathBuf, press: impl Fn(&'static str)) {
    let Ok(mut f) = File::open(&node) else {
        eprintln!("vanta-shell: can't read {} for the Steam and ... buttons", node.display());
        return;
    };
    let mut buf = [0u8; 64];
    let (mut steam, mut qam) = (false, false);
    while let Ok(n) = f.read(&mut buf) {
        let Some((s, q)) = buttons(&buf[..n]) else { continue };
        if s && !steam {
            press("mainMenu");
        }
        if q && !qam {
            press("qam");
        }
        (steam, qam) = (s, q);
    }
}

/// (Steam, "...") held in a Deck state report, or None for other reports.
fn buttons(report: &[u8]) -> Option<(bool, bool)> {
    if report.len() < 15 || report[0] != 0x01 || report[1] != 0x00 || report[2] != 0x09 {
        return None;
    }
    Some((report[9] & (1 << 5) != 0, report[14] & (1 << 2) != 0))
}

#[cfg(test)]
mod tests {
    use super::buttons;

    #[test]
    fn reads_steam_and_quick_access() {
        let mut r = [0u8; 64];
        r[..4].copy_from_slice(&[0x01, 0x00, 0x09, 0x40]);
        assert_eq!(buttons(&r), Some((false, false)));
        r[9] = 1 << 5;
        assert_eq!(buttons(&r), Some((true, false)));
        r[14] = 1 << 2;
        assert_eq!(buttons(&r), Some((true, true)));
        r[2] = 0x04;
        assert_eq!(buttons(&r), None);
    }
}
