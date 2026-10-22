//! The shell's door to the system. QML does the logic; this file only does what QML can't:
//! files outside the app, running programs, and reading /proc.
//!
//! Commands run on a worker thread and answer with `finished(tag, code, out, err)`, so a slow
//! `nmcli` or `bootc` never blocks the UI. Everything the shell changes on the real system
//! (Wi-Fi, time zone, language, power) goes through `exec` with the system's own tools.

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
        #[qproperty(QString, config_dir, cxx_name = "configDir")]
        #[qproperty(QString, home, cxx_name = "home")]
        #[qproperty(QString, screenshot_path, cxx_name = "screenshotPath")]
        type Sys = super::SysRust;

        /// A command started with `exec` has ended.
        #[qsignal]
        fn finished(self: Pin<&mut Sys>, tag: QString, code: i32, out: QString, err: QString);

        /// Run `program` with `argsJson` (a JSON array of strings) on a worker thread.
        #[qinvokable]
        fn exec(self: &Sys, tag: &QString, program: &QString, args_json: &QString);

        /// Start a program and leave it running. Returns its process id, or 0 if it didn't start.
        #[qinvokable]
        fn spawn(self: &Sys, program: &QString, args_json: &QString) -> i32;

        /// Full path of a program on PATH, or "" when it isn't installed.
        #[qinvokable]
        fn which(self: &Sys, program: &QString) -> QString;

        #[qinvokable]
        fn env(self: &Sys, name: &QString) -> QString;

        #[qinvokable]
        fn exists(self: &Sys, path: &QString) -> bool;

        /// A text file's contents, or "" when it can't be read.
        #[qinvokable]
        #[cxx_name = "readText"]
        fn read_text(self: &Sys, path: &QString) -> QString;

        /// Writes through a temporary file and a rename, creating folders as needed.
        #[qinvokable]
        #[cxx_name = "writeText"]
        fn write_text(self: &Sys, path: &QString, text: &QString) -> bool;

        /// A file's bytes as hex (EDID and other small binary files).
        #[qinvokable]
        #[cxx_name = "readHex"]
        fn read_hex(self: &Sys, path: &QString) -> QString;

        /// Removes a file, or a folder and everything in it.
        #[qinvokable]
        fn remove(self: &Sys, path: &QString) -> bool;

        #[qinvokable]
        #[cxx_name = "copyFile"]
        fn copy_file(self: &Sys, from: &QString, to: &QString) -> bool;

        /// JSON array of { name, path, dir, size, mtime } for a folder, or [] when missing.
        #[qinvokable]
        #[cxx_name = "listDir"]
        fn list_dir(self: &Sys, path: &QString) -> QString;

        /// Matches for a glob such as /sys/class/power_supply/BAT*: a JSON array of paths.
        #[qinvokable]
        fn glob(self: &Sys, pattern: &QString) -> QString;

        /// JSON { free, total } in bytes for the file system holding `path`.
        #[qinvokable]
        fn storage(self: &Sys, path: &QString) -> QString;

        /// JSON array of { pid, cmd } for every process (cmd is the full command line).
        #[qinvokable]
        fn processes(self: &Sys) -> QString;

        /// Ends a process and everything it started (SIGTERM, then SIGKILL after 3 s).
        #[qinvokable]
        #[cxx_name = "killTree"]
        fn kill_tree(self: &Sys, pid: i32);

        /// Seconds since the Unix epoch.
        #[qinvokable]
        fn now(self: &Sys) -> f64;
    }

    impl cxx_qt::Threading for Sys {}
}

use cxx_qt::Threading;
use cxx_qt_lib::QString;
use std::{
    env, fs,
    io::Write,
    path::{Path, PathBuf},
    process::{Command, Stdio},
    thread,
    time::{Duration, SystemTime, UNIX_EPOCH},
};

pub struct SysRust {
    os_name: QString,
    data_dir: QString,
    config_dir: QString,
    home: QString,
    screenshot_path: QString,
}

impl Default for SysRust {
    fn default() -> Self {
        let home = env::var("HOME").unwrap_or_else(|_| "/tmp".into());
        let config = env::var("VANTA_CONFIG").unwrap_or_else(|_| {
            let base = env::var("XDG_CONFIG_HOME").unwrap_or_else(|_| format!("{home}/.config"));
            format!("{base}/vanta")
        });
        Self {
            os_name: QString::from(&os_pretty_name()),
            data_dir: QString::from(&env::var("VANTA_DATA").unwrap_or_else(|_| "/usr/share/vanta".into())),
            config_dir: QString::from(&config),
            home: QString::from(&home),
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

fn args_of(json: &QString) -> Vec<String> {
    serde_json::from_str::<Vec<String>>(&json.to_string()).unwrap_or_default()
}

fn q(s: impl AsRef<str>) -> QString {
    QString::from(s.as_ref())
}

impl qobject::Sys {
    pub fn exec(&self, tag: &QString, program: &QString, args_json: &QString) {
        let qt = self.qt_thread();
        let (tag, program, args) = (tag.to_string(), program.to_string(), args_of(args_json));
        thread::spawn(move || {
            let (code, out, err) = match Command::new(&program).args(&args).stdin(Stdio::null()).output() {
                Ok(o) => (
                    o.status.code().unwrap_or(-1),
                    String::from_utf8_lossy(&o.stdout).into_owned(),
                    String::from_utf8_lossy(&o.stderr).into_owned(),
                ),
                Err(e) => (-1, String::new(), e.to_string()),
            };
            let _ = qt.queue(move |obj| obj.finished(q(&tag), code, q(&out), q(&err)));
        });
    }

    pub fn spawn(&self, program: &QString, args_json: &QString) -> i32 {
        Command::new(program.to_string())
            .args(args_of(args_json))
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn()
            .map(|child| child.id() as i32)
            .unwrap_or(0)
    }

    pub fn which(&self, program: &QString) -> QString {
        let name = program.to_string();
        let found = env::var("PATH")
            .unwrap_or_default()
            .split(':')
            .map(|dir| Path::new(dir).join(&name))
            .find(|p| p.is_file());
        q(found.map(|p| p.display().to_string()).unwrap_or_default())
    }

    pub fn env(&self, name: &QString) -> QString {
        q(env::var(name.to_string()).unwrap_or_default())
    }

    pub fn exists(&self, path: &QString) -> bool {
        Path::new(&path.to_string()).exists()
    }

    pub fn read_text(&self, path: &QString) -> QString {
        q(fs::read(path.to_string()).map(|b| String::from_utf8_lossy(&b).into_owned()).unwrap_or_default())
    }

    pub fn write_text(&self, path: &QString, text: &QString) -> bool {
        let path = PathBuf::from(path.to_string());
        let tmp = path.with_extension("tmp");
        let write = || -> std::io::Result<()> {
            if let Some(dir) = path.parent() {
                fs::create_dir_all(dir)?;
            }
            let mut f = fs::File::create(&tmp)?;
            f.write_all(text.to_string().as_bytes())?;
            f.sync_all()?;
            fs::rename(&tmp, &path)
        };
        write().is_ok()
    }

    pub fn read_hex(&self, path: &QString) -> QString {
        q(fs::read(path.to_string())
            .map(|b| b.iter().map(|x| format!("{x:02x}")).collect::<String>())
            .unwrap_or_default())
    }

    pub fn remove(&self, path: &QString) -> bool {
        let p = PathBuf::from(path.to_string());
        if p.is_dir() {
            fs::remove_dir_all(p).is_ok()
        } else {
            fs::remove_file(p).is_ok()
        }
    }

    pub fn copy_file(&self, from: &QString, to: &QString) -> bool {
        let to = PathBuf::from(to.to_string());
        if let Some(dir) = to.parent() {
            let _ = fs::create_dir_all(dir);
        }
        fs::copy(from.to_string(), to).is_ok()
    }

    pub fn list_dir(&self, path: &QString) -> QString {
        let items: Vec<serde_json::Value> = fs::read_dir(path.to_string())
            .map(|rd| {
                rd.flatten()
                    .map(|e| {
                        let meta = e.metadata().ok();
                        let mtime = meta
                            .as_ref()
                            .and_then(|m| m.modified().ok())
                            .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
                            .map(|d| d.as_secs())
                            .unwrap_or(0);
                        serde_json::json!({
                            "name": e.file_name().to_string_lossy(),
                            "path": e.path().display().to_string(),
                            "dir": meta.as_ref().map(|m| m.is_dir()).unwrap_or(false),
                            "size": meta.as_ref().map(|m| m.len()).unwrap_or(0),
                            "mtime": mtime,
                        })
                    })
                    .collect()
            })
            .unwrap_or_default();
        q(serde_json::Value::Array(items).to_string())
    }

    pub fn glob(&self, pattern: &QString) -> QString {
        q(serde_json::to_string(&glob_paths(&pattern.to_string())).unwrap_or_else(|_| "[]".into()))
    }

    pub fn storage(&self, path: &QString) -> QString {
        let (free, total) = statvfs(&path.to_string()).unwrap_or((0, 0));
        q(serde_json::json!({ "free": free, "total": total }).to_string())
    }

    pub fn processes(&self) -> QString {
        let list: Vec<serde_json::Value> = fs::read_dir("/proc")
            .map(|rd| {
                rd.flatten()
                    .filter_map(|e| {
                        let pid: i32 = e.file_name().to_string_lossy().parse().ok()?;
                        let raw = fs::read(e.path().join("cmdline")).ok()?;
                        if raw.is_empty() {
                            return None;
                        }
                        let cmd = String::from_utf8_lossy(&raw).replace('\0', " ").trim().to_string();
                        Some(serde_json::json!({ "pid": pid, "cmd": cmd }))
                    })
                    .collect()
            })
            .unwrap_or_default();
        q(serde_json::Value::Array(list).to_string())
    }

    pub fn kill_tree(&self, pid: i32) {
        let pids = descendants(pid);
        signal_all(&pids, 15);
        thread::spawn(move || {
            thread::sleep(Duration::from_secs(3));
            let alive: Vec<i32> = pids.into_iter().filter(|p| Path::new(&format!("/proc/{p}")).exists()).collect();
            signal_all(&alive, 9);
        });
    }

    pub fn now(&self) -> f64 {
        SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_secs_f64()).unwrap_or(0.0)
    }
}

/// A process and all of its children, parents first.
fn descendants(root: i32) -> Vec<i32> {
    let mut parent_of = Vec::new();
    if let Ok(rd) = fs::read_dir("/proc") {
        for e in rd.flatten() {
            let Ok(pid) = e.file_name().to_string_lossy().parse::<i32>() else { continue };
            let Ok(stat) = fs::read_to_string(e.path().join("stat")) else { continue };
            // "pid (name) state ppid ...": the name can hold spaces, so split after the last ')'.
            if let Some(rest) = stat.rsplit_once(')').map(|(_, r)| r) {
                if let Some(ppid) = rest.split_whitespace().nth(1).and_then(|v| v.parse::<i32>().ok()) {
                    parent_of.push((pid, ppid));
                }
            }
        }
    }
    let mut out = vec![root];
    let mut i = 0;
    while i < out.len() {
        let p = out[i];
        out.extend(parent_of.iter().filter(|(_, pp)| *pp == p).map(|(c, _)| *c));
        i += 1;
    }
    out
}

fn signal_all(pids: &[i32], sig: i32) {
    for p in pids {
        let _ = Command::new("kill").arg(format!("-{sig}")).arg(p.to_string()).stderr(Stdio::null()).status();
    }
}

fn statvfs(path: &str) -> Option<(u64, u64)> {
    let out = Command::new("df").args(["-B1", "--output=avail,size", path]).output().ok()?;
    let text = String::from_utf8_lossy(&out.stdout);
    let mut nums = text.lines().nth(1)?.split_whitespace().filter_map(|v| v.parse::<u64>().ok());
    Some((nums.next()?, nums.next()?))
}

/// A small glob: `*` and `?` inside any path segment.
fn glob_paths(pattern: &str) -> Vec<String> {
    fn matches(p: &[u8], s: &[u8]) -> bool {
        match (p.first(), s.first()) {
            (None, None) => true,
            (Some(b'*'), _) => matches(&p[1..], s) || (!s.is_empty() && matches(p, &s[1..])),
            (Some(b'?'), Some(_)) => matches(&p[1..], &s[1..]),
            (Some(a), Some(b)) if a == b => matches(&p[1..], &s[1..]),
            _ => false,
        }
    }
    let mut paths = vec![PathBuf::from(if pattern.starts_with('/') { "/" } else { "." })];
    for seg in pattern.split('/').filter(|s| !s.is_empty()) {
        let mut next = Vec::new();
        for base in &paths {
            if seg.contains('*') || seg.contains('?') {
                if let Ok(rd) = fs::read_dir(base) {
                    let mut names: Vec<_> = rd.flatten().map(|e| e.file_name().to_string_lossy().into_owned()).collect();
                    names.sort();
                    next.extend(names.into_iter().filter(|n| matches(seg.as_bytes(), n.as_bytes())).map(|n| base.join(n)));
                }
            } else {
                let p = base.join(seg);
                if p.exists() {
                    next.push(p);
                }
            }
        }
        paths = next;
    }
    paths.into_iter().map(|p| p.display().to_string()).collect()
}
