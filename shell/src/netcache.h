// Disk cache for the shell's network requests (src/netcache.rs).
#pragma once

#include <QtCore/QString>
#include <QtQml/QQmlApplicationEngine>

void install_disk_cache(QQmlApplicationEngine &engine, const QString &dir);
