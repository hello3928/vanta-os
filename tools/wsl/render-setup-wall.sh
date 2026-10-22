#!/bin/bash
# Renders shell/data/setup-wall.jpg from tools/render-setup-wall.qml (needs the network).
cd /mnt/c/Users/Thomas/Documents/VantaOS
QT_QPA_PLATFORM=offscreen QT_QUICK_BACKEND=rhi QSG_RHI_BACKEND=opengl QT_LOGGING_RULES=qml.debug=true \
  /usr/lib64/qt6/bin/qml tools/render-setup-wall.qml -- "$PWD/shell/data/setup-wall.jpg" 2>&1 | grep -v "^qt.qpa"
ls -la shell/data/setup-wall.jpg
