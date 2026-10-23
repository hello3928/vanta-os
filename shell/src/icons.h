// Tinted icons as shared images (src/icons.rs).
#pragma once

#include <QtCore/QString>
#include <QtQml/QQmlApplicationEngine>

void install_icon_provider(QQmlApplicationEngine &engine, const QString &dir);
