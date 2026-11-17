================================================================================
GAÜN FİZİK MÜHENDİSLİĞİ – DİJİTAL DENEY VE DERS ARŞİVİ
BİLGİ İŞLEM VE İÇERİK YÖNETİMİ KURULUM KILAVUZU
================================================================================

1. SİSTEM MİMARİSİ VE GENEL ÖZELLİKLER
- Bu proje %100 STATİK bir web uygulamasıdır (HTML5, CSS3, Vanilla JavaScript).
- Herhangi bir veritabanı (MySQL, PostgreSQL vb.), PHP, Python, Node.js veya
  sunucu taraflı uygulama çalıştırılması GEREKMEZ.
- Kullanıcı giriş sistemi veya dışarıya açık dosya yükleme arayüzü bulunmaz;
  tüm içerikler salt okunur olarak sunulur.
- Harici CDN veya internet bağlantısı zorunluluğu yoktur; kurum içi kapalı ağda
  (intranet) dahi tüm arayüz ve yerel videolar eksiksiz çalışır.

2. SUNUCUYA KURULUM (YAYINLAMA)
- Proje klasörünün tamamını üniversite web sunucusunun ilgili yayın dizinine
  (ör. /var/www/html/fizik-arsiv/ veya IIS alt dizinine) kopyalamanız yeterlidir.
- Ana giriş dosyası: index.html
- Sunucunun statik HTML, CSS, JS, JSON ve TXT dosyalarını UTF-8 karakter
  kodlamasıyla sunması yeterlidir.
- Video oynatma desteği için web sunucusunda .mp4 uzantısının MIME türü
  "video/mp4" olarak tanımlı olmalıdır.
- Güvenlik amacıyla sunucuda dizin listeleme (Directory Listing / Autoindex)
  kapalı tutulabilir; sistem dersler/liste.json manifest dosyası üzerinden
  sorunsuz çalışır.

3. YEREL BİLGİSAYARDA TEST ETME
- Klasör içerisinde terminal/komut istemi açarak aşağıdaki komutu çalıştırın:
  python -m http.server 8000
- Tarayıcıdan http://localhost:8000 adresine gidin.
  (Not: Tarayıcı güvenlik kuralları gereği fetch() API'sinin çalışması için
  dosyaların file:// yerine yerel bir HTTP sunucusu üzerinden açılması gerekir.)

4. YENİ DERS EKLEME YÖNTEMİ
1) "dersler/" klasörü içine yeni bir klasör oluşturun (Örn: EP201-Modern-Fizik).
2) Klasörün içine UTF-8 kodlamalı "ders.txt" dosyası oluşturun:
   KOD: EP201
   AD: Modern Fizik Laboratuvarı
   DONEM: Güz
   OZET: Kuantum fiziği ve atom fiziği deneyleri.
3) Ana dizindeki "liste-olustur.py" betiğini çalıştırın (python liste-olustur.py).
   Bu işlem dersler/liste.json dosyasını otomatik günceller.

5. YENİ DENEY EKLEME YÖNTEMİ
1) İlgili ders klasörünün içine başına sıra numarası vererek yeni bir deney
   klasörü oluşturun (Örn: 01-Fotoelektrik-Olay).
   Not: Deneyler klasör adının başındaki sayıya göre sıralanır (01, 02, ... 10).
2) Klasör içine "deney.txt" dosyasını standart şablona uygun olarak ekleyin.
3) Deney videosu yerel ise aynı klasöre "video.mp4" adıyla koyun ve deney.txt
   içinde "VIDEO: video.mp4" (veya boş) bırakın. YouTube videosu kullanılacaksa
   "VIDEO: https://www.youtube.com/watch?v=..." satırını ekleyin.
4) Ana dizinde "python liste-olustur.py" komutunu çalıştırarak liste.json
   dosyasını güncelleyin ve güncel klasörü sunucuya aktarın.
================================================================================
