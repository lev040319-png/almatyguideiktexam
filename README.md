# Almaty Guide
Сайт на чистых HTML/CSS/JS, без сборки.
## Локально
Откройте `index.html` в браузере (двойной клик).
## Фото
Положите фото 1200×800 в `images/` под теми же именами (`medeu.jpg` и т.д.) и замените `.svg` на `.jpg` в поле `img`/в `app.js` (`images/${p.img}.svg`).
## Azure Static Web Apps
1. Загрузите папку в репозиторий GitHub (index.html в корне).
2. Azure Portal → Create a resource → Static Web App → привяжите репозиторий, Build preset: Custom, App location `/`, Output пусто.
3. Дождитесь Actions и откройте URL *.azurestaticapps.net.
## AWS S3
1. Создайте bucket, отключите Block all public access.
2. Properties → Static website hosting → index document `index.html`.
3. Загрузите все файлы и папки; добавьте Bucket Policy с s3:GetObject для Principal *.
