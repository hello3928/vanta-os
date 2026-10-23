//! What gamescope shows. In game mode gamescope runs in Steam mode, where it only puts a window
//! on screen when it's told to, through X11 properties Steam normally sets:
//! - `STEAM_GAME` on a window: the app it belongs to
//! - `GAMESCOPECTRL_BASELAYER_APPID` on the root window: the apps to show, first match wins
//!
//! The shell marks its own window with `VANTA_APP_ID` and lists the apps in the order they
//! should be shown: Vanta alone, or a running game first and Vanta behind it. Steam's own windows
//! (its updater, sign-in) are never on the list, so they can't cover the shell. Outside gamescope
//! this does nothing.

use std::env;
use x11rb::connection::Connection;
use x11rb::protocol::xproto::{AtomEnum, ConnectionExt, PropMode, Window};
use x11rb::rust_connection::RustConnection;
use x11rb::wrapper::ConnectionExt as _;

/// The app ID Vanta's window carries. Steam app IDs are far below this.
pub const VANTA_APP_ID: u32 = 0x5641_4e54;

/// Shows the first of `app_ids` that has a window. Returns false when not running in gamescope or
/// the X server can't be reached.
pub fn show(app_ids: &[u32]) -> bool {
    if env::var_os("GAMESCOPE_WAYLAND_DISPLAY").is_none() {
        return false;
    }
    match show_on_display(app_ids) {
        Ok(()) => true,
        Err(e) => {
            eprintln!("vanta-shell: gamescope focus: {e}");
            false
        }
    }
}

fn show_on_display(app_ids: &[u32]) -> Result<(), Box<dyn std::error::Error>> {
    let (conn, screen) = RustConnection::connect(None)?;
    let root = conn.setup().roots[screen].root;
    let atom = |name: &str| -> Result<u32, Box<dyn std::error::Error>> {
        Ok(conn.intern_atom(false, name.as_bytes())?.reply()?.atom)
    };
    let steam_game = atom("STEAM_GAME")?;
    let baselayer = atom("GAMESCOPECTRL_BASELAYER_APPID")?;
    let wm_pid = atom("_NET_WM_PID")?;

    // The list first, so a window that vanishes while it's being marked can't stop it.
    conn.change_property32(PropMode::REPLACE, root, baselayer, AtomEnum::CARDINAL, app_ids)?.check()?;
    for win in own_windows(&conn, root, wm_pid)? {
        conn.change_property32(PropMode::REPLACE, win, steam_game, AtomEnum::CARDINAL, &[VANTA_APP_ID])?.check()?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Needs an X server (Xvfb): cargo test -- --ignored with DISPLAY set.
    #[test]
    #[ignore]
    fn sets_the_root_list() {
        std::env::set_var("GAMESCOPE_WAYLAND_DISPLAY", "test");
        // Connected first: an X server resets when its last client leaves.
        let (conn, screen) = RustConnection::connect(None).unwrap();
        assert!(show(&[VANTA_APP_ID, 440]));
        let root = conn.setup().roots[screen].root;
        let atom = conn.intern_atom(false, b"GAMESCOPECTRL_BASELAYER_APPID").unwrap().reply().unwrap().atom;
        let reply = conn.get_property(false, root, atom, AtomEnum::CARDINAL, 0, 8).unwrap().reply().unwrap();
        assert_eq!(reply.value32().unwrap().collect::<Vec<_>>(), vec![VANTA_APP_ID, 440]);
    }
}

/// Top-level windows of this process: the root's children, or one level down where a window
/// manager wraps them in frames (gamescope doesn't).
fn own_windows(conn: &RustConnection, root: Window, wm_pid: u32) -> Result<Vec<Window>, Box<dyn std::error::Error>> {
    let pid = std::process::id();
    let is_own = |win: Window| -> Result<bool, Box<dyn std::error::Error>> {
        let reply = conn.get_property(false, win, wm_pid, AtomEnum::CARDINAL, 0, 1)?.reply()?;
        Ok(reply.value32().and_then(|mut v| v.next()) == Some(pid))
    };
    let mut out = Vec::new();
    for win in conn.query_tree(root)?.reply()?.children {
        if is_own(win)? {
            out.push(win);
            continue;
        }
        for child in conn.query_tree(win)?.reply()?.children {
            if is_own(child)? {
                out.push(child);
            }
        }
    }
    Ok(out)
}
