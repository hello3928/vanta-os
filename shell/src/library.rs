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

fn steam_games(root: &Path, account: &Value) -> Vec<Value> {
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

    let mut folders = vec![root.join("steamapps")];
    if let Ok(vdf) = fs::read_to_string(root.join("steamapps/libraryfolders.vdf")) {
        if let Some(map) = parse_vdf(&vdf).get("libraryfolders").and_then(Value::as_object) {
            for f in map.values() {
                if let Some(p) = f.get("path").and_then(Value::as_str) {
                    let folder = PathBuf::from(p).join("steamapps");
                    if !folders.contains(&folder) {
                        folders.push(folder);
                    }
                }
            }
        }
    }
    let mut games: Vec<Value> = folders
        .iter()
        .filter_map(|f| fs::read_dir(f).ok())
        .flatten()
        .flatten()
        .filter(|e| e.file_name().to_string_lossy().starts_with("appmanifest_"))
        .filter_map(|e| fs::read_to_string(e.path()).ok())
        .filter_map(|acf| {
            let state = parse_vdf(&acf);
            let app = state.get("AppState")?;
            let appid = app.get("appid")?.as_str()?.to_string();
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
}
