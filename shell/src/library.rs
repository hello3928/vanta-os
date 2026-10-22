//! The game library, read from the Steam client's own files:
//! - installed games: `steamapps/appmanifest_<appid>.acf` in every Steam library folder
//!   (listed in `steamapps/libraryfolders.vdf`)
//! - art: Steam's local cache `appcache/librarycache/<appid>/`, with Steam's CDN as fallback
//! Launching goes through the Steam client (`steam steam://rungameid/<appid>`), which handles
//! Proton, cloud saves and the overlay.
//! With no Steam install (development), a small sample library is used.

#[cxx_qt::bridge]
pub mod qobject {
    unsafe extern "C++" {
        include!("cxx-qt-lib/qstring.h");
        type QString = cxx_qt_lib::QString;
    }

    extern "RustQt" {
        #[qobject]
        #[qml_element]
        #[qproperty(QString, games_json, cxx_name = "gamesJson")]
        #[qproperty(bool, sample, cxx_name = "sample")]
        type Library = super::LibraryRust;

        /// Re-read the library from disk.
        #[qinvokable]
        fn refresh(self: Pin<&mut Self>);

        /// Ask the Steam client to start a game.
        #[qinvokable]
        fn launch(self: &Self, appid: &QString);
    }
}

use core::pin::Pin;
use cxx_qt_lib::QString;
use std::{
    env, fs,
    path::{Path, PathBuf},
    process::Command,
    time::{SystemTime, UNIX_EPOCH},
};

const CDN: &str = "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps";

pub struct LibraryRust {
    games_json: QString,
    sample: bool,
}

impl Default for LibraryRust {
    fn default() -> Self {
        let (json, sample) = load();
        Self { games_json: QString::from(&json), sample }
    }
}

impl qobject::Library {
    pub fn refresh(self: Pin<&mut Self>) {
        let (json, sample) = load();
        let mut this = self;
        this.as_mut().set_sample(sample);
        this.set_games_json(QString::from(&json));
    }

    pub fn launch(&self, appid: &QString) {
        let id = appid.to_string();
        if id.chars().all(|c| c.is_ascii_digit()) {
            let _ = Command::new("steam").arg(format!("steam://rungameid/{id}")).spawn();
        }
    }
}

struct Game {
    appid: String,
    name: String,
    last_played: u64,
    size_bytes: u64,
}

fn load() -> (String, bool) {
    let games = steam_root().map(|root| installed_games(&root)).unwrap_or_default();
    if games.is_empty() {
        return (sample_json(), true);
    }
    let root = steam_root();
    let items: Vec<String> = games
        .iter()
        .map(|g| {
            let art = |kind: &str, file: &str| -> String {
                root.as_ref()
                    .and_then(|r| cached_art(r, &g.appid, file))
                    .map(|p| format!("file://{}", p.display()))
                    .unwrap_or_else(|| format!("{CDN}/{}/{kind}", g.appid))
            };
            format!(
                r#"{{"appid":"{}","title":{},"lastPlayed":{},"sizeBytes":{},"capsule":{},"hero":{},"logo":{}}}"#,
                g.appid,
                json_str(&g.name),
                g.last_played,
                g.size_bytes,
                json_str(&art("library_600x900_2x.jpg", "library_600x900")),
                json_str(&art("library_hero.jpg", "library_hero")),
                json_str(&art("logo.png", "logo")),
            )
        })
        .collect();
    (format!("[{}]", items.join(",")), false)
}

/// The Steam install: the native client first, then the Flatpak.
fn steam_root() -> Option<PathBuf> {
    let home = PathBuf::from(env::var("HOME").ok()?);
    [".local/share/Steam", ".steam/steam", ".var/app/com.valvesoftware.Steam/.local/share/Steam"]
        .iter()
        .map(|p| home.join(p))
        .find(|p| p.join("steamapps").is_dir())
}

fn installed_games(root: &Path) -> Vec<Game> {
    let mut folders = vec![root.join("steamapps")];
    if let Ok(vdf) = fs::read_to_string(root.join("steamapps/libraryfolders.vdf")) {
        for path in vdf_values(&vdf, "path") {
            let folder = PathBuf::from(path).join("steamapps");
            if !folders.contains(&folder) {
                folders.push(folder);
            }
        }
    }
    let mut games: Vec<Game> = folders
        .iter()
        .filter_map(|f| fs::read_dir(f).ok())
        .flatten()
        .flatten()
        .filter(|e| e.file_name().to_string_lossy().starts_with("appmanifest_"))
        .filter_map(|e| fs::read_to_string(e.path()).ok())
        .filter_map(|acf| {
            let get = |key: &str| vdf_values(&acf, key).into_iter().next();
            let appid = get("appid")?;
            let name = get("name")?;
            // Proton, runtimes and redistributables are tools, not games.
            if name.starts_with("Proton") || name.starts_with("Steam Linux Runtime") || name.starts_with("Steamworks") {
                return None;
            }
            Some(Game {
                appid,
                name,
                last_played: get("LastPlayed").and_then(|v| v.parse().ok()).unwrap_or(0),
                size_bytes: get("SizeOnDisk").and_then(|v| v.parse().ok()).unwrap_or(0),
            })
        })
        .collect();
    games.sort_by(|a, b| b.last_played.cmp(&a.last_played));
    games
}

/// Every value for `key` in a Valve KeyValues (VDF) file: lines like `"key"  "value"`.
fn vdf_values(text: &str, key: &str) -> Vec<String> {
    text.lines()
        .filter_map(|line| {
            let mut parts = line.trim().split('"').filter(|s| !s.trim().is_empty());
            let k = parts.next()?;
            let v = parts.next()?;
            (k == key).then(|| v.replace("\\\\", "\\"))
        })
        .collect()
}

/// Steam's local art cache. Newer clients keep one folder per game; older ones flat files.
fn cached_art(root: &Path, appid: &str, stem: &str) -> Option<PathBuf> {
    let cache = root.join("appcache/librarycache");
    let dir = cache.join(appid);
    if let Ok(entries) = fs::read_dir(&dir) {
        for e in entries.flatten() {
            let name = e.file_name().to_string_lossy().to_string();
            if name.starts_with(stem) {
                return Some(e.path());
            }
        }
    }
    ["jpg", "png"]
        .iter()
        .map(|ext| cache.join(format!("{appid}_{stem}.{ext}")))
        .find(|p| p.is_file())
}

fn json_str(s: &str) -> String {
    let mut out = String::from("\"");
    for c in s.chars() {
        match c {
            '"' => out.push_str("\\\""),
            '\\' => out.push_str("\\\\"),
            '\n' => out.push_str("\\n"),
            c if (c as u32) < 0x20 => out.push_str(&format!("\\u{:04x}", c as u32)),
            c => out.push(c),
        }
    }
    out.push('"');
    out
}

/// Development fallback: a few real games with Steam CDN art (same as the mockup's library).
fn sample_json() -> String {
    let now = SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_secs()).unwrap_or(0);
    // Days since each was last played, so "today", "yesterday" and older dates all show up.
    let ago = [0, 1, 3, 6, 12, 20, 45, 90];
    let games = [
        ("1245620", "ELDEN RING"),
        ("1086940", "Baldur's Gate 3"),
        ("1145350", "Hades II"),
        ("1091500", "Cyberpunk 2077"),
        ("367520", "Hollow Knight"),
        ("2379780", "Balatro"),
        ("553850", "HELLDIVERS 2"),
        ("413150", "Stardew Valley"),
    ];
    let items: Vec<String> = games
        .iter()
        .enumerate()
        .map(|(i, (id, name))| {
            format!(
                r#"{{"appid":"{id}","title":{},"lastPlayed":{},"sizeBytes":0,"capsule":"{CDN}/{id}/library_600x900_2x.jpg","hero":"{CDN}/{id}/library_hero.jpg","logo":"{CDN}/{id}/logo.png"}}"#,
                json_str(name),
                now.saturating_sub(ago[i] * 86_400)
            )
        })
        .collect();
    format!("[{}]", items.join(","))
}
