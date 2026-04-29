# Faz 3 Modül Kararı

Bu fazda eksilen referans modülleri geri alınmadı. Kullanıcı kararı doğrultusunda aşağıdaki alanlar GÜNCEL kod tabanında kapalı/temiz tutulur.

## Geri Alınmayacaklar

- Casino oyunları
- `routes/blackjack.routes.js`
- `routes/mines.routes.js`
- `routes/party.routes.js`
- VIP sistemi
- `frame-19.png` ile `frame-100.png` arası çerçeve katalogu

## Korunacaklar

- Mevcut online oyunlar: Crash, Satranç, Pişti
- Mevcut klasik oyunlar: PatternMaster, SnakePro, SpacePro
- Mevcut çerçeve katalogu: `frame-1.png` ile `frame-18.png`
- Firebase/Admin/Render çalışma modeli: PLAYMATRİX referansı + GÜNCEL hedef kod

## Kalıcı Kontrol

`npm run check:module-boundary` komutu bu kararların tekrar bozulmasını engeller.
