// Images from Steam's and libretro's image servers are kept on disk and used without asking the
// network again, so art shows at once on the next start, and before Wi-Fi is up. Everything else
// (Steam's Web API, the store API) goes to the network as usual.
#include "vanta-shell/src/netcache.h"

#include <QtNetwork/QNetworkAccessManager>
#include <QtNetwork/QNetworkDiskCache>
#include <QtNetwork/QNetworkRequest>
#include <QtQml/QQmlNetworkAccessManagerFactory>

namespace {

bool isImageHost(const QString &host)
{
    return host.endsWith(QLatin1String(".steamstatic.com")) || host == QLatin1String("raw.githubusercontent.com");
}

class CachingManager : public QNetworkAccessManager
{
public:
    using QNetworkAccessManager::QNetworkAccessManager;

protected:
    QNetworkReply *createRequest(Operation op, const QNetworkRequest &request, QIODevice *data) override
    {
        QNetworkRequest r(request);
        if (op == GetOperation && isImageHost(r.url().host())) {
            r.setAttribute(QNetworkRequest::CacheLoadControlAttribute, QNetworkRequest::PreferCache);
            r.setAttribute(QNetworkRequest::CacheSaveControlAttribute, true);
        }
        return QNetworkAccessManager::createRequest(op, r, data);
    }
};

// QML asks for a manager per loader thread; they all share the cache folder.
class Factory : public QQmlNetworkAccessManagerFactory
{
public:
    explicit Factory(QString dir) : m_dir(std::move(dir)) {}

    QNetworkAccessManager *create(QObject *parent) override
    {
        auto *manager = new CachingManager(parent);
        auto *cache = new QNetworkDiskCache(manager);
        cache->setCacheDirectory(m_dir);
        cache->setMaximumCacheSize(qint64(2) * 1024 * 1024 * 1024);
        manager->setCache(cache);
        return manager;
    }

private:
    QString m_dir;
};

} // namespace

void install_disk_cache(QQmlApplicationEngine &engine, const QString &dir)
{
    // The engine doesn't take ownership; the factory lives as long as the app.
    static Factory *factory = nullptr;
    if (!factory)
        factory = new Factory(dir);
    engine.setNetworkAccessManagerFactory(factory);
}
