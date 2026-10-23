// Icons are SVGs tinted to a colour. Qt's IconImage renders and tints each instance on its own
// (about 10 ms each on the UI thread), so a Library of a few hundred games with an icon on every
// badge froze for seconds. This provider renders an icon once per name, colour and size; Qt's
// image cache shares the result between every Image that asks for the same one.
#include "vanta-shell/src/icons.h"

#include <QtGui/QColor>
#include <QtGui/QImage>
#include <QtGui/QImageReader>
#include <QtGui/QPainter>
#include <QtQuick/QQuickImageProvider>

namespace {

class IconProvider : public QQuickImageProvider
{
public:
    explicit IconProvider(const QString &dir) : QQuickImageProvider(QQuickImageProvider::Image), m_dir(dir) {}

    // id: "<name>/<rrggbb or aarrggbb>"; the size comes from the Image's sourceSize.
    QImage requestImage(const QString &id, QSize *size, const QSize &requestedSize) override
    {
        const int slash = id.lastIndexOf(QLatin1Char('/'));
        const QString name = id.left(slash);
        const QColor color(QLatin1Char('#') + id.mid(slash + 1));
        const QSize want = requestedSize.isValid() ? requestedSize : QSize(48, 48);

        QImageReader reader(m_dir + QLatin1Char('/') + name + QLatin1String(".svg"));
        reader.setScaledSize(want);
        QImage img = reader.read().convertToFormat(QImage::Format_ARGB32_Premultiplied);
        if (img.isNull()) {
            img = QImage(want, QImage::Format_ARGB32_Premultiplied);
            img.fill(Qt::transparent);
        } else {
            QPainter p(&img);
            p.setCompositionMode(QPainter::CompositionMode_SourceIn);
            p.fillRect(img.rect(), color);
        }
        if (size)
            *size = img.size();
        return img;
    }

private:
    QString m_dir;
};

} // namespace

void install_icon_provider(QQmlApplicationEngine &engine, const QString &dir)
{
    engine.addImageProvider(QStringLiteral("icon"), new IconProvider(dir));
}
