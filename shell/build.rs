// Builds the QML module dev.vanta.shell: the QML files below plus the Rust QObjects in src/.
// Ported 1:1 from the web mockup (mockup/): Theme.qml is mockup/styles/tokens.css, and each
// component keeps the mockup's name (VTile.qml is mockup/js/components/VTile.js).

use cxx_qt_build::{CxxQtBuilder, QmlFile, QmlModule};

const QML: &[&str] = &[
    "qml/Main.qml",
    "qml/components/Icon.qml",
    "qml/components/VTopBar.qml",
    "qml/components/VHintBar.qml",
    "qml/components/VTile.qml",
    "qml/components/VRow.qml",
    "qml/screens/Home.qml",
];

fn main() {
    let mut module = QmlModule::new("dev.vanta.shell").qml_file(QmlFile::from("qml/Theme.qml").singleton(true));
    for file in QML {
        module = module.qml_file(*file);
    }
    for file in QML.iter().chain(["qml/Theme.qml"].iter()) {
        println!("cargo:rerun-if-changed={file}");
    }
    CxxQtBuilder::new_qml_module(module)
        .qt_module("Network")
        .files(["src/system.rs", "src/library.rs"])
        .build();
}
