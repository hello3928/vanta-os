// Builds the QML module dev.vanta.shell: every .qml file under qml/ plus the Rust QObjects in
// src/. Files that start with `pragma Singleton` are registered as singletons (Theme, App, ...).
// Ported from the web mockup (mockup/): Theme.qml is mockup/styles/tokens.css, and each
// component keeps the mockup's name (VTile.qml is mockup/js/components/VTile.js).

use cxx_qt_build::{CxxQtBuilder, QmlFile, QmlModule};
use std::{fs, path::Path};

fn qml_files(dir: &Path, out: &mut Vec<String>) {
    let mut entries: Vec<_> = fs::read_dir(dir).expect("qml folder").flatten().map(|e| e.path()).collect();
    entries.sort();
    for p in entries {
        if p.is_dir() {
            qml_files(&p, out);
        } else if p.extension().is_some_and(|e| e == "qml") {
            out.push(p.to_string_lossy().replace('\\', "/"));
        }
    }
}

fn main() {
    let mut files = Vec::new();
    qml_files(Path::new("qml"), &mut files);
    let mut module = QmlModule::new("dev.vanta.shell");
    for f in &files {
        let singleton = fs::read_to_string(f).is_ok_and(|s| s.lines().any(|l| l.trim() == "pragma Singleton"));
        module = module.qml_file(QmlFile::from(f.as_str()).singleton(singleton));
        println!("cargo:rerun-if-changed={f}");
    }
    println!("cargo:rerun-if-changed=qml");
    CxxQtBuilder::new_qml_module(module)
        .qt_module("Network")
        .files(["src/sys.rs", "src/gamepad.rs", "src/library.rs"])
        .build();
}
