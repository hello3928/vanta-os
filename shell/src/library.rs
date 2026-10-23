//! The game library, read from the Steam client's own files and the ROM folders:
//! - installed Steam games: `steamapps/appmanifest_<appid>.acf` in every library folder
//!   (listed in `steamapps/libraryfolders.vdf`)
//! - play time and last played: `userdata/<account>/config/localconfig.vdf` for the account
//!   that signed in last (`config/loginusers.vdf`)
//! - art: Steam's local cache `appcache/librarycache/<appid>/`, with Steam's CDN as fallback
//! - emulated games: one folder per system under ~/Games/roms (EmuDeck's ~/Emulation/roms too)
//! Steam games launch, install and uninstall through the Steam client (steam:// links), which
//! handles Proton, cloud saves and downloads. Store details (trailers, screenshots, genres) are
//! fetched by the QML side. With VANTA_SAMPLE=1 (screenshot and flow-check tools only),
//! `sample` is true and the QML side shows data/sample-library.json instead.

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
        #[qproperty(QString, account_json, cxx_name = "accountJson")]
        #[qproperty(QString, steam_root, cxx_name = "steamRoot")]
        #[qproperty(bool, sample)]
        #[qproperty(bool, loading)]
        type Library = super::LibraryRust;

        /// Re-read the library on a worker thread; properties update when it's done.
        #[qinvokable]
        fn refresh(self: Pin<&mut Self>);

        /// Open a steam:// link in the Steam client ("rungameid/570", "install/570", ...).
        #[qinvokable]
        fn steam(self: &Self, link: &QString) -> bool;

        /// Art the Steam client has on disk for a game, installed or not: JSON
        /// { capsule, hero, logo, header } with file:// paths, each only where a file exists.
        #[qinvokable]
        #[cxx_name = "localArt"]
        fn local_art(self: &Self, appid: i64) -> QString;
    }

    impl cxx_qt::Threading for Library {}
}

use core::pin::Pin;
use cxx_qt::Threading;
use cxx_qt_lib::QString;
use serde_json::{json, Map, Value};
use std::collections::HashMap;
use std::{
    env, fs,
    path::{Path, PathBuf},
    process::{Command, Stdio},
    thread,
};

const CDN: &str = "https://shared.steamstatic.com/store_item_assets/steam/apps";
const STEAM_ID_BASE: u64 = 76561197960265728;

pub struct LibraryRust {
    games_json: QString,
    account_json: QString,
    steam_root: QString,
    sample: bool,
    loading: bool,
}

impl Default for LibraryRust {
    fn default() -> Self {
        let scan = scan();
        Self {
            games_json: QString::from(&scan.games.to_string()),
            account_json: QString::from(&scan.account.to_string()),
            steam_root: QString::from(&scan.root),
            sample: scan.sample,
            loading: false,
        }
    }
}

impl qobject::Library {
    pub fn refresh(mut self: Pin<&mut Self>) {
        self.as_mut().set_loading(true);
        let qt = self.qt_thread();
        thread::spawn(move || {
            let s = scan();
            let _ = qt.queue(move |mut obj| {
                obj.as_mut().set_sample(s.sample);
                obj.as_mut().set_steam_root(QString::from(&s.root));
                obj.as_mut().set_account_json(QString::from(&s.account.to_string()));
                obj.as_mut().set_games_json(QString::from(&s.games.to_string()));
                obj.as_mut().set_loading(false);
            });
        });
    }

    pub fn steam(&self, link: &QString) -> bool {
        let link = link.to_string();
        let ok = !link.is_empty() && link.chars().all(|c| c.is_ascii_alphanumeric() || "/_-".contains(c));
        ok && Command::new("steam")
            .arg(format!("steam://{link}"))
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn()
            .is_ok()
    }

    pub fn local_art(&self, appid: i64) -> QString {
        let mut art = serde_json::Map::new();
        if let Some(root) = steam_root() {
            let appid = appid.to_string();
            for (key, stem) in [("capsule", "library_600x900"), ("hero", "library_hero"), ("logo", "logo"), ("header", "header")] {
                if let Some(p) = cached_art(&root, &appid, stem) {
                    art.insert(key.into(), Value::String(format!("file://{}", p.display())));
                }
            }
        }
        QString::from(&Value::Object(art).to_string())
    }
}

struct Scan {
    games: Value,
    account: Value,
    root: String,
    sample: bool,
}

fn scan() -> Scan {
    let root = steam_root();
    let account = root.as_deref().map(steam_account).unwrap_or(Value::Null);
    let mut games = Vec::new();
    if let Some(r) = &root {
        games.extend(steam_games(r, &account));
    }
    games.extend(rom_games());
    let sample = env::var("VANTA_SAMPLE").as_deref() == Ok("1");
    Scan {
        games: Value::Array(games),
        account,
        root: root.map(|p| p.display().to_string()).unwrap_or_default(),
        sample,
    }
}

fn home() -> PathBuf {
    PathBuf::from(env::var("HOME").unwrap_or_else(|_| "/tmp".into()))
}

/// The Steam install: the native client first, then the Flatpak.
fn steam_root() -> Option<PathBuf> {
    let home = home();
    [".local/share/Steam", ".steam/steam", ".var/app/com.valvesoftware.Steam/.local/share/Steam"]
        .iter()
        .map(|p| home.join(p))
        .find(|p| p.join("steamapps").is_dir() || p.join("config/loginusers.vdf").is_file())
}

/// The account that signed in to Steam last: { steamId, accountName, persona, avatar, timestamp }.
fn steam_account(root: &Path) -> Value {
    let Some(users) = fs::read_to_string(root.join("config/loginusers.vdf")).ok().map(|t| parse_vdf(&t)) else {
        return Value::Null;
    };
    let Some(map) = users.get("users").and_then(Value::as_object) else { return Value::Null };
    let pick = map
        .iter()
        .max_by_key(|(_, u)| (u.get("MostRecent").and_then(Value::as_str) == Some("1"), num(u, "Timestamp")));
    let Some((id, u)) = pick else { return Value::Null };
    let avatar = root.join(format!("config/avatarcache/{id}.png"));
    json!({
        "steamId": id,
        "accountName": u.get("AccountName").and_then(Value::as_str).unwrap_or(""),
        "persona": u.get("PersonaName").and_then(Value::as_str).unwrap_or(""),
        "timestamp": num(u, "Timestamp"),
        "avatar": if avatar.is_file() { format!("file://{}", avatar.display()) } else { String::new() },
    })
}

fn num(v: &Value, key: &str) -> u64 {
    v.get(key).and_then(Value::as_str).and_then(|s| s.parse().ok()).unwrap_or(0)
}

/// What Steam is doing with each app right now, from the end of its content log: appid → the last
/// "state changed" list ("Update Required,Update Running,Downloading,"), and the last download
/// rate in bytes per second. The manifests only hold the flags Steam saves, which say "update
/// started" for the whole download.
fn content_states(log: &str) -> (HashMap<String, String>, u64) {
    let (mut states, mut rate) = (HashMap::new(), 0);
    for line in log.lines() {
        if let Some((_, rest)) = line.split_once("AppID ") {
            if let Some((id, state)) = rest.split_once(" state changed : ") {
                if id.chars().all(|c| c.is_ascii_digit()) {
                    states.insert(id.to_string(), state.trim().to_string());
                }
            }
        } else if let Some((_, r)) = line.split_once("Current download rate: ") {
            if let Some(mbps) = r.split_whitespace().next().and_then(|v| v.parse::<f64>().ok()) {
                rate = (mbps * 1e6 / 8.0) as u64;
            }
        }
    }
    (states, rate)
}

/// The last 256 KB of a file (Steam's logs grow until Steam rotates them).
fn tail(path: &Path) -> String {
    use std::io::{Seek, SeekFrom};
    let Ok(mut f) = fs::File::open(path) else { return String::new() };
    let len = f.metadata().map(|m| m.len()).unwrap_or(0);
    let _ = f.seek(SeekFrom::Start(len.saturating_sub(256 * 1024)));
    let mut buf = Vec::new();
    let _ = std::io::Read::read_to_end(&mut f, &mut buf);
    String::from_utf8_lossy(&buf).into_owned()
}

fn steam_games(root: &Path, account: &Value) -> Vec<Value> {
    let (live, rate) = content_states(&tail(&root.join("logs/content_log.txt")));
    // Play time per app for the signed-in account.
    let played: Map<String, Value> = account
        .get("steamId")
        .and_then(Value::as_str)
        .and_then(|id| id.parse::<u64>().ok())
        .map(|id| root.join(format!("userdata/{}/config/localconfig.vdf", id.saturating_sub(STEAM_ID_BASE))))
        .and_then(|p| fs::read_to_string(p).ok())
        .map(|t| parse_vdf(&t))
        .and_then(|v| {
            let apps = ["UserLocalConfigStore", "Software", "Valve", "Steam", "apps"].iter().try_fold(&v, |cur, k| find_key(cur, k))?;
            apps.as_object().cloned()
        })
        .unwrap_or_default();

    let mut paths = vec![root.join("steamapps")];
    if let Ok(vdf) = fs::read_to_string(root.join("steamapps/libraryfolders.vdf")) {
        if let Some(map) = parse_vdf(&vdf).get("libraryfolders").and_then(Value::as_object) {
            paths.extend(map.values().filter_map(|f| f.get("path").and_then(Value::as_str)).map(|p| PathBuf::from(p).join("steamapps")));
        }
    }
    // The same folder can be listed under two names (~/.steam/steam is a link to
    // ~/.local/share/Steam), so folders are compared by their real path.
    let mut folders: Vec<PathBuf> = Vec::new();
    for p in paths {
        let real = fs::canonicalize(&p).unwrap_or(p);
        if !folders.contains(&real) {
            folders.push(real);
        }
    }
    let mut seen = std::collections::HashSet::new();
    let mut games: Vec<Value> = folders
        .iter()
        .filter_map(|f| fs::read_dir(f).ok().map(|d| (f.clone(), d)))
        .flat_map(|(f, d)| d.flatten().map(move |e| (f.clone(), e)))
        .filter(|(_, e)| e.file_name().to_string_lossy().starts_with("appmanifest_"))
        .filter_map(|(f, e)| fs::read_to_string(e.path()).ok().map(|acf| (f, acf)))
        .filter_map(|(folder, acf)| {
            let state = parse_vdf(&acf);
            let app = state.get("AppState")?;
            let appid = app.get("appid")?.as_str()?.to_string();
            if !seen.insert(appid.clone()) {
                return None;
            }
            let name = app.get("name")?.as_str()?.to_string();
            // Proton, runtimes and redistributables are tools, not games.
            if ["Proton", "Steam Linux Runtime", "Steamworks", "Steam Audio"].iter().any(|t| name.starts_with(t)) {
                return None;
            }
            let p = played.get(&appid);
            let last = p.map(|p| num(p, "LastPlayed")).filter(|v| *v > 0).unwrap_or_else(|| num(app, "LastPlayed"));
            let minutes = p.map(|p| num(p, "Playtime")).unwrap_or(0);
            // StateFlags 4 = fully installed; anything else is downloading or updating.
            let flags = num(app, "StateFlags");
            // The log's state only counts while the manifest says something is in progress (an
            // old log can end mid-download).
            let content = live.get(&appid).filter(|_| flags != 4).cloned().unwrap_or_default();
            let rate = if content.contains("Downloading") { rate } else { 0 };
            let art = |file: &str, stem: &str| -> String {
                cached_art(root, &appid, stem)
                    .map(|p| format!("file://{}", p.display()))
                    .unwrap_or_else(|| format!("{CDN}/{appid}/{file}"))
            };
            Some(json!({
                "id": format!("steam-{appid}"),
                "appid": appid.parse::<u64>().unwrap_or(0),
                "source": "steam",
                "title": name,
                "installed": flags & 4 != 0,
                "updating": flags & 4 == 0 || flags & 2 != 0,
                "lastPlayed": last,
                "minutes": minutes,
                "sizeBytes": num(app, "SizeOnDisk"),
                // Downloads (Steam's own progress): StateFlags 1048576 downloading, 2097152
                // staging, 4194304 committing, 512 paused.
                "stateFlags": flags,
                // Steam's current state for it, from logs/content_log.txt, and the download rate
                // (bytes per second) while it downloads.
                "content": content,
                "rate": rate,
                // The Steam library the game is in (a drive or an SD card), for storage.
                "library": folder.parent().unwrap_or(&folder).display().to_string(),
                "bytesDownloaded": num(app, "BytesDownloaded"),
                "bytesToDownload": num(app, "BytesToDownload"),
                "bytesStaged": num(app, "BytesStaged"),
                "bytesToStage": num(app, "BytesToStage"),
                "art": {
                    "capsule": art("library_600x900_2x.jpg", "library_600x900"),
                    "hero": art("library_hero.jpg", "library_hero"),
                    "logo": art("logo.png", "logo"),
                    "header": art("header.jpg", "header"),
                },
            }))
        })
        .collect();
    games.sort_by_key(|g| std::cmp::Reverse(g["lastPlayed"].as_u64().unwrap_or(0)));
    games
}

/// Steam's local art cache. Newer clients keep one folder per game; older ones flat files.
fn cached_art(root: &Path, appid: &str, stem: &str) -> Option<PathBuf> {
    let cache = root.join("appcache/librarycache");
    // Newer clients keep one folder per game, some files one folder further down.
    let mut dirs = vec![cache.join(appid)];
    if let Ok(entries) = fs::read_dir(cache.join(appid)) {
        dirs.extend(entries.flatten().filter(|e| e.path().is_dir()).map(|e| e.path()));
    }
    for dir in dirs {
        if let Ok(entries) = fs::read_dir(&dir) {
            for e in entries.flatten() {
                if e.path().is_file() && e.file_name().to_string_lossy().starts_with(stem) {
                    return Some(e.path());
                }
            }
        }
    }
    ["jpg", "png"].iter().map(|ext| cache.join(format!("{appid}_{stem}.{ext}"))).find(|p| p.is_file())
}

/// Folder names per system (Vanta's own first, then EmuDeck's), and the files that are games.
const SYSTEMS: &[(&str, &[&str], &[&str])] = &[
    ("nes", &["nes", "famicom"], &["nes", "fds", "unf", "zip", "7z"]),
    ("snes", &["snes", "sfc"], &["sfc", "smc", "zip", "7z"]),
    ("n64", &["n64"], &["z64", "n64", "v64", "zip", "7z"]),
    ("gba", &["gba"], &["gba", "zip", "7z"]),
    ("nds", &["nds"], &["nds", "zip", "7z"]),
    ("3ds", &["3ds", "n3ds"], &["3ds", "cci", "cia", "3dsx"]),
    ("ps1", &["ps1", "psx"], &["cue", "chd", "pbp", "m3u"]),
    ("ps2", &["ps2"], &["iso", "chd", "cso"]),
    ("psp", &["psp"], &["iso", "cso", "pbp", "chd"]),
    ("ps3", &["ps3"], &["iso"]),
    ("gc", &["gc", "gamecube", "wii"], &["iso", "rvz", "gcm", "wbfs", "ciso"]),
    ("wiiu", &["wiiu"], &["wua", "wud", "wux", "rpx"]),
];

pub fn rom_roots() -> Vec<PathBuf> {
    let home = home();
    let mut roots: Vec<PathBuf> = env::var("VANTA_ROMS").ok().map(PathBuf::from).into_iter().collect();
    roots.extend([home.join("Games/roms"), home.join("Emulation/roms"), home.join("ROMs")]);
    roots.into_iter().filter(|p| p.is_dir()).collect()
}

fn rom_games() -> Vec<Value> {
    let mut out = Vec::new();
    for root in rom_roots() {
        for (sys, dirs, exts) in SYSTEMS {
            for d in *dirs {
                let Ok(rd) = fs::read_dir(root.join(d)) else { continue };
                for e in rd.flatten() {
                    let path = e.path();
                    let is_ps3_folder = *sys == "ps3" && path.join("PS3_GAME").is_dir();
                    let ext = path.extension().map(|x| x.to_string_lossy().to_lowercase()).unwrap_or_default();
                    if !is_ps3_folder && !(path.is_file() && exts.contains(&ext.as_str())) {
                        continue;
                    }
                    let stem = if is_ps3_folder {
                        e.file_name().to_string_lossy().into_owned()
                    } else {
                        path.file_stem().map(|s| s.to_string_lossy().into_owned()).unwrap_or_default()
                    };
                    let size = fs::metadata(&path).map(|m| m.len()).unwrap_or(0);
                    out.push(json!({
                        "id": format!("emu-{sys}-{stem}"),
                        "source": "emu",
                        "system": sys,
                        "rom": stem,
                        "path": path.display().to_string(),
                        "title": title_from_rom(&stem),
                        "installed": true,
                        "sizeBytes": size,
                    }));
                }
            }
        }
    }
    out
}

/// "Legend of Zelda, The - A Link to the Past (USA)" → "The Legend of Zelda: A Link to the Past".
fn title_from_rom(stem: &str) -> String {
    let mut s = String::new();
    let mut depth = 0;
    for c in stem.chars() {
        match c {
            '(' | '[' => depth += 1,
            ')' | ']' => depth = (depth - 1).max(0),
            c if depth == 0 => s.push(c),
            _ => {}
        }
    }
    let s = s.split_whitespace().collect::<Vec<_>>().join(" ");
    let (head, tail) = match s.split_once(" - ") {
        Some((h, t)) => (h.to_string(), Some(t.to_string())),
        None => (s.clone(), None),
    };
    let head = match head.strip_suffix(", The") {
        Some(h) => format!("The {h}"),
        None => head,
    };
    match tail {
        Some(t) => format!("{head}: {t}"),
        None => head,
    }
}

/// Valve's text KeyValues format ("key" "value" and "key" { ... }) as JSON objects.
pub fn parse_vdf(text: &str) -> Value {
    enum Tok {
        Str(String),
        Open,
        Close,
    }
    let mut tokens = Vec::new();
    let mut chars = text.chars().peekable();
    while let Some(c) = chars.next() {
        match c {
            '"' => {
                let mut s = String::new();
                while let Some(c) = chars.next() {
                    match c {
                        '\\' => match chars.next() {
                            Some('n') => s.push('\n'),
                            Some('t') => s.push('\t'),
                            Some(o) => s.push(o),
                            None => {}
                        },
                        '"' => break,
                        c => s.push(c),
                    }
                }
                tokens.push(Tok::Str(s));
            }
            '{' => tokens.push(Tok::Open),
            '}' => tokens.push(Tok::Close),
            '/' if chars.peek() == Some(&'/') => {
                for c in chars.by_ref() {
                    if c == '\n' {
                        break;
                    }
                }
            }
            _ => {}
        }
    }
    fn object(tokens: &[Tok], i: &mut usize) -> Value {
        let mut map = Map::new();
        while let Some(Tok::Str(key)) = tokens.get(*i) {
            *i += 1;
            match tokens.get(*i) {
                Some(Tok::Open) => {
                    *i += 1;
                    let inner = object(tokens, i);
                    map.insert(key.clone(), inner);
                }
                Some(Tok::Str(v)) => {
                    map.insert(key.clone(), Value::String(v.clone()));
                    *i += 1;
                }
                _ => break,
            }
        }
        if let Some(Tok::Close) = tokens.get(*i) {
            *i += 1;
        }
        Value::Object(map)
    }
    let mut i = 0;
    object(&tokens, &mut i)
}

/// Keys in Steam's files aren't always cased the same ("apps" vs "Apps").
fn find_key<'a>(v: &'a Value, key: &str) -> Option<&'a Value> {
    v.as_object()?.iter().find(|(k, _)| k.eq_ignore_ascii_case(key)).map(|(_, v)| v)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn finds_art_in_both_cache_layouts() {
        let root = env::temp_dir().join(format!("vanta-art-{}", std::process::id()));
        let cache = root.join("appcache/librarycache");
        fs::create_dir_all(cache.join("1245620/5f2c")).unwrap();
        fs::write(cache.join("1245620/5f2c/library_600x900.jpg"), b"x").unwrap();
        fs::write(cache.join("1245620/library_hero.jpg"), b"x").unwrap();
        fs::write(cache.join("570_logo.png"), b"x").unwrap();
        assert!(cached_art(&root, "1245620", "library_600x900").unwrap().ends_with("5f2c/library_600x900.jpg"));
        assert!(cached_art(&root, "1245620", "library_hero").is_some());
        assert!(cached_art(&root, "570", "logo").is_some());
        assert!(cached_art(&root, "570", "header").is_none());
        fs::remove_dir_all(&root).unwrap();
    }

    #[test]
    fn reads_steams_current_state_from_its_content_log() {
        let log = "[2026-10-24 10:00:01] AppID 1245620 state changed : Update Required,Update Queued,
                   [2026-10-24 10:00:05] AppID 1245620 state changed : Update Required,Update Running,Downloading,
                   [2026-10-24 10:00:06] AppID 1245620 update started : download 0/48219321344, store 0/0
                   [2026-10-24 10:00:09] Current download rate: 80.000 Mbps
                   [2026-10-24 10:00:09] AppID 570 state changed : Fully Installed,
";
        let (states, rate) = content_states(log);
        assert_eq!(states["1245620"], "Update Required,Update Running,Downloading,");
        assert_eq!(states["570"], "Fully Installed,");
        assert_eq!(rate, 10_000_000);
    }

    #[test]
    fn lists_a_game_once_when_its_library_has_two_names() {
        // Bazzite: ~/.steam/steam links to ~/.local/share/Steam, and libraryfolders.vdf can name
        // the link.
        let home = env::temp_dir().join(format!("vanta-lib-{}", std::process::id()));
        let root = home.join(".local/share/Steam");
        fs::create_dir_all(root.join("steamapps")).unwrap();
        fs::create_dir_all(home.join(".steam")).unwrap();
        std::os::unix::fs::symlink(&root, home.join(".steam/steam")).unwrap();
        let link = home.join(".steam/steam").display().to_string();
        fs::write(root.join("steamapps/libraryfolders.vdf"), format!("\"libraryfolders\"
{{
	\"0\"
	{{
		\"path\"		\"{link}\"
	}}
}}
")).unwrap();
        fs::write(root.join("steamapps/appmanifest_570.acf"), "\"AppState\"
{
	\"appid\"		\"570\"
	\"name\"		\"Dota 2\"
	\"StateFlags\"		\"4\"
}
").unwrap();
        assert_eq!(steam_games(&root, &json!({})).len(), 1);
        fs::remove_dir_all(&home).unwrap();
    }
}
