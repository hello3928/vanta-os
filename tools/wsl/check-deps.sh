#!/bin/bash
rpm -q systemd-devel qt6-qtmultimedia qt6-qtmultimedia-devel qt6-qtdeclarative qt6-qtsvg ffmpeg-free libavcodec-free 2>&1
ls /usr/lib64/qt6/plugins/multimedia/ 2>&1
ls /usr/lib64/qt6/qml/QtQuick/Controls/impl 2>/dev/null | head -3
ls /usr/lib64/qt6/qml/QtMultimedia 2>/dev/null | head -3
pkg-config --modversion libudev 2>&1
