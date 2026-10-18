# Hidroket GP Online

Hidroket arabalarıyla (Tur-AZ, Pars, Ucube, Helianthus) çok oyunculu 8-bit yarış.
Oda kodu ile 8 kişiye kadar aynı pistte yarış, isim girişi, kalıcı skor tablosu, Arduino joystick desteği.

Sunucu **hiçbir paket kullanmaz**: sadece Node.js yeterli, `npm install` gerekmez.

```
hidroket-gp-online/
├── server.js          oyun sunucusu (oda, yarış, tur doğrulama, skor tablosu)
├── package.json
├── public/            tarayıcıda çalışan oyun
│   ├── index.html
│   ├── game.js
│   ├── models.js      araç modelleri
│   └── logo.js        hidroket logosu
└── arduino/joystick_hidromobil.ino
```

---

## 1. Kendi bilgisayarında dene (5 dakika)

1. **Node.js kur:** https://nodejs.org → "LTS" sürümünü indir, kur.
2. Zip'i bir klasöre aç.
3. Klasörün içinde terminal aç:
   - Windows: klasörde adres çubuğuna `cmd` yazıp Enter.
   - Mac: klasöre sağ tık → "Klasörde Yeni Terminal".
4. Şunu yaz:
   ```
   node server.js
   ```
   `Hidroket GP sunucusu çalışıyor: http://localhost:3000` yazısını görmelisin.
5. Chrome'da **http://localhost:3000** adresini aç. Adını yaz, aracını seç, **ODA KUR**.

**Aynı Wi-Fi'daki arkadaşlar** (atölye için ideal):
- Windows'ta `ipconfig` yazıp "IPv4 Adresi"ni bul (örn. `192.168.1.34`).
- Arkadaşların `http://192.168.1.34:3000` adresini açar.
- Windows "Erişime izin ver" diye sorarsa **Özel ağlar** için izin ver.
- Not: Joystick sadece `localhost` ya da `https` adreste çalışır. Joystick'i sunucunun çalıştığı bilgisayara tak.

Durdurmak için terminalde `Ctrl + C`.

---

## 2. İnternette yayınla — Render (ücretsiz)

Bunu yapınca herkes `https://...onrender.com` linkinden her yerden oynar, joystick de çalışır.

### a) Dosyaları GitHub'a yükle
1. https://github.com → hesap aç / giriş yap.
2. Sağ üst **+** → **New repository** → ad: `hidroket-gp` → **Create repository**.
3. Açılan sayfada **"uploading an existing file"** linkine tıkla.
4. Zip'ten çıkan **içeriği** (server.js, package.json, README.md, `public` ve `arduino` klasörleri) sürükleyip bırak.
   `public` klasörünün içindekilerle birlikte yüklendiğinden emin ol.
5. **Commit changes**.

### b) Render'da sunucuyu aç
1. https://render.com → **Get Started** → GitHub ile giriş yap.
2. **New +** → **Web Service** → `hidroket-gp` reposunu seç (görünmüyorsa "Configure GitHub" ile izin ver).
3. Ayarlar:
   | Alan | Değer |
   |---|---|
   | Language | Node |
   | Build Command | `npm install` (olduğu gibi bırak) |
   | Start Command | `node server.js` |
   | Instance Type | **Free** |
4. **Create Web Service**. 1–3 dakika sonra üstte adresin çıkar, örn. `https://hidroket-gp.onrender.com`.
5. Linki arkadaşlarına at. Oda kurunca **LİNKİ KOPYALA** ile direkt odaya davet linki de gönderebilirsin.

**Ücretsiz planın kuralları:**
- 15 dakika kimse girmezse sunucu uyur. Sonraki ilk açılış ~1 dakika sürer (sayfa yüklenirken bekle). Yarış sırasında uyumaz.
- Sunucunun diski kalıcı değil: uyuduğunda ya da yeniden başladığında `data/leaderboard.json` silinir. Skor tablosunun kalıcı olması için 3. adımı yap.

---

## 3. Kalıcı skor tablosu — Upstash (ücretsiz, isteğe bağlı)

1. https://upstash.com → giriş yap → **Redis** → **Create Database**.
2. Ad: `hidroket`, bölge: Avrupa'da bir bölge (örn. Frankfurt), plan: **Free** → oluştur.
3. Veritabanı sayfasında **REST API** bölümünden iki değeri kopyala:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
4. Render'da servisine gir → **Environment** → **Add Environment Variable** ile bu ikisini aynı adlarla ekle → **Save, rebuild, and deploy**.
5. Render'ın **Logs** sekmesinde `Skor tablosu: Upstash (kalıcı)` yazısını görürsen tamam.

Token'ı kimseyle paylaşma, GitHub'a yazma; sadece Render'ın Environment kısmına gir.

---

## 4. Arduino joystick

- `arduino/joystick_hidromobil.ino` dosyasını Nano'ya yükle (önceki oyunlardakinin aynısı).
- Bağlantı: VRx → A0, VRy → A1, SW → D2, +5V → 5V, GND → GND.
- Arduino IDE'nin Seri Port Ekranını kapat.
- Oyun sayfasında (Chrome/Edge) **ARDUINO'YU BAĞLA** → portu seç → 2 saniye joystick'e dokunma.
- Yarışta: ileri gaz, geri fren, sağ-sol direksiyon, buton **H2 turbo**. Lobide: sağ-sol araç değiştirir, buton (oda sahibiysen) yarışı başlatır.

---

## 5. Güncelleme

GitHub'daki bir dosyayı değiştirip commit edince Render otomatik yeniden yayınlar (~1–2 dk).

## Kurallar ve hile koruması

- 3 tur. İlk araç bitirince diğerlerine 30 saniye kalır.
- Sunucu her turun pistin üç sektöründen sırayla geçtiğini ve süresinin makul olduğunu kontrol eder. Pisti kesersen tur sayılmaz.
- Skor tablosunda her pilot + araç ikilisinin sadece en iyi derecesi tutulur (ilk 50).

## Sorun giderme

| Sorun | Çözüm |
|---|---|
| "Sunucuya bağlanılıyor…" uzun sürüyor | Render uyanıyordur, 1 dk bekle. |
| `node` tanınmıyor | Node.js kurulumundan sonra terminali kapatıp yeniden aç. |
| Port 3000 dolu | `PORT=3001 node server.js` (Windows: `set PORT=3001 && node server.js`). |
| Joystick bağlanmıyor | Chrome/Edge kullan, `https` ya da `localhost` adresinde ol, Seri Port Ekranını kapat. |
| Telefonda oynamak | Ekranda dokunmatik tuşlar çıkar (◀ ▶ H2 FREN GAZ). Yatay tutmak daha rahat. |
