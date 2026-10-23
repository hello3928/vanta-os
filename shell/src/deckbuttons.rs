//! The Steam Deck's Steam and "..." buttons while a Steam game runs.
//!
//! In Vanta's menus the Deck's controller is the kernel's own gamepad ("Steam Deck"; gamepad.rs),
//! and Steam can't open it (72-vanta-deck-controller.rules). While a Steam game runs the shell
//! hands it to Steam (vanta-controller) so Steam Input works in the game; the kernel gamepad goes
//! silent then, and Steam's virtual pad has no Steam or "..." button. The shell reads them from the
//! controller's raw HID reports alongside Steam (hidraw allows several readers) and opens Vanta's
//! menu and Quick access. The raw node is only readable while Steam has the controller, so this
//! keeps trying, quietly.
//!
//! Report layout as in the kernel's driver (drivers/hid/hid-steam.c): 64 bytes starting
//! 01 00 09 (Deck state); Steam is byte 9 bit 5, "..." byte 14 bit 2.

use std::collections::HashSet;
use std::fs::{self, File};
use std::io::Read;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;

const VALVE: &str = "000028DE";
const DECK_CONTROLLER: &str = "00001205";

/// Watches for readable Deck controller nodes and reads each one while it lasts; `press` gets
/// "mainMenu" or "qam".
pub fn watch(press: impl Fn(&'static str) + Send + Sync + 'static) {
    let press = Arc::new(press);
    let open: Arc<Mutex<HashSet<PathBuf>>> = Arc::default();
    thread::spawn(move || loop {
        for node in deck_nodes() {
            if open.lock().unwrap().contains(&node) {
                continue;
            }
            let Ok(f) = File::open(&node) else { continue };
            open.lock().unwrap().insert(node.clone());
            let (press, open) = (press.clone(), open.clone());
            thread::spawn(move || {
                read_node(f, |a| press(a));
                open.lock().unwrap().remove(&node);
            });
        }
        thread::sleep(Duration::from_secs(1));
    });
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

fn read_node(mut f: File, press: impl Fn(&'static str)) {
    let mut buf = [0u8; 64];
    let (mut steam, mut qam) = (false, false);
    // Ends when the controller goes back to Vanta (the node is removed).
    while let Ok(n) = f.read(&mut buf) {
        if n == 0 {
            break;
        }
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
