const fs = require("fs");

// [kanji, kunyomi, onyomi, meaning, pattern_hint, jp, reading, id]
const rows = [
  ["一", "ひと.つ", "イチ / イツ", "Satu", "Satu garis mendatar melambangkan angka satu.", "一つください。", "ひとつください。", "Tolong satu."],
  ["国", "くに", "コク", "Negara", "Bingkai (batas wilayah) berisi 玉 (permata): wilayah yang dijaga dalam batas negara.", "日本は小さい国です。", "にほんはちいさいくにです。", "Jepang adalah negara yang kecil."],
  ["年", "とし", "ネン", "Tahun", "Dulu menggambarkan panen padi yang datang setahun sekali. Muncul di 今年 (tahun ini) dan 来年 (tahun depan).", "来年、日本へ行きます。", "らいねん、にほんへいきます。", "Tahun depan saya akan pergi ke Jepang."],
  ["十", "とお / と", "ジュウ", "Sepuluh", "Dua garis bersilang membentuk tanda plus, angka sepuluh.", "十人の学生がいます。", "じゅうにんのがくせいがいます。", "Ada sepuluh mahasiswa."],
  ["二", "ふた.つ", "ニ", "Dua", "Dua garis mendatar melambangkan angka dua.", "二人で行きます。", "ふたりでいきます。", "Kami pergi berdua."],
  ["本", "もと", "ホン", "Buku; asal, pokok", "木 (pohon) dengan garis di bagian akar yang menandai pangkal atau asal. Dari sini muncul arti 'buku' dan 日本 (asal matahari).", "本を読みます。", "ほんをよみます。", "Saya membaca buku."],
  ["中", "なか", "チュウ", "Tengah, dalam", "Satu garis vertikal menembus tengah kotak.", "かばんの中に本があります。", "かばんのなかにほんがあります。", "Ada buku di dalam tas."],
  ["長", "なが.い", "チョウ", "Panjang; pemimpin", "Menggambarkan orang tua berambut panjang yang menjadi pemimpin.", "髪が長いです。", "かみがながいです。", "Rambutnya panjang."],
  ["出", "で.る / だ.す", "シュツ", "Keluar, mengeluarkan", "Tunas yang menyembul keluar dari wadah. Lawan dari 入.", "八時に家を出ます。", "はちじにいえをでます。", "Saya keluar rumah jam delapan."],
  ["三", "み.っつ", "サン", "Tiga", "Tiga garis mendatar melambangkan angka tiga.", "三人の友達と話します。", "さんにんのともだちとはなします。", "Saya berbicara dengan tiga teman."],
  ["時", "とき", "ジ", "Waktu, jam", "日 (matahari) di kiri dan 寺 (kuil) di kanan: waktu dihitung dari pergerakan matahari.", "今、何時ですか。", "いま、なんじですか。", "Sekarang jam berapa?"],
  ["行", "い.く / ゆ.く", "コウ / ギョウ", "Pergi; berjalan", "Menggambarkan persimpangan jalan tempat orang berjalan.", "学校へ行きます。", "がっこうへいきます。", "Saya pergi ke sekolah."],
  ["見", "み.る", "ケン", "Melihat", "目 (mata) di atas kaki (儿): orang yang sedang melihat.", "テレビを見ます。", "テレビをみます。", "Saya menonton televisi."],
  ["後", "あと / うし.ろ / のち", "ゴ / コウ", "Belakang, setelah", "Bagian 彳 (langkah) di kiri: berjalan pelan sehingga tertinggal di belakang. Lawan dari 前.", "食事の後で、薬を飲みます。", "しょくじのあとで、くすりをのみます。", "Setelah makan, saya minum obat."],
  ["前", "まえ", "ゼン", "Depan, sebelum", "Ada 刂 (pisau) di sisi kanan. Ingat sebagai lawan dari 後.", "駅の前で会いましょう。", "えきのまえであいましょう。", "Mari bertemu di depan stasiun."],
  ["五", "いつ.つ", "ゴ", "Lima", "Dua garis mendatar dengan satu garis tegak dan lengkung di tengah.", "五時に起きます。", "ごじにおきます。", "Saya bangun jam lima."],
  ["間", "あいだ / ま", "カン / ケン", "Antara, selang", "日 (matahari) di dalam 門 (gerbang): cahaya yang masuk lewat celah gerbang.", "二時間待ちました。", "にじかんまちました。", "Saya menunggu dua jam."],
  ["上", "うえ / あ.がる", "ジョウ", "Atas; naik", "Garis pendek di atas garis dasar: sesuatu yang berada di atas. Lawan dari 下.", "机の上に本があります。", "つくえのうえにほんがあります。", "Ada buku di atas meja."],
  ["東", "ひがし", "トウ", "Timur", "日 (matahari) yang terbit di balik 木 (pohon): arah timur.", "太陽は東から昇ります。", "たいようはひがしからのぼります。", "Matahari terbit dari timur."],
  ["四", "よん / よ.っつ", "シ", "Empat", "Kotak dengan dua goresan kecil di dalamnya. Sering dibaca よん.", "四月に日本へ行きます。", "しがつににほんへいきます。", "Saya pergi ke Jepang pada bulan April."],
  ["今", "いま", "コン / キン", "Sekarang", "Bagian atas seperti atap yang menaungi satu titik waktu: saat ini.", "今、忙しいです。", "いま、いそがしいです。", "Sekarang saya sibuk."],
  ["九", "ここの.つ", "キュウ / ク", "Sembilan", "Satu goresan melengkung seperti angka 9.", "九時に寝ます。", "くじにねます。", "Saya tidur jam sembilan."],
  ["入", "い.る / はい.る", "ニュウ", "Masuk", "Dua goresan yang menyatu seperti sesuatu yang masuk ke dalam. Lawan dari 出.", "部屋に入ります。", "へやにはいります。", "Saya masuk ke kamar."],
  ["高", "たか.い", "コウ", "Tinggi; mahal", "Menggambarkan bangunan menara yang tinggi.", "この山は高いです。", "このやまはたかいです。", "Gunung ini tinggi."],
  ["円", "まる.い", "エン", "Yen; lingkaran", "Bingkai dengan garis di dalam, seperti koin. Dipakai untuk mata uang Jepang.", "これは百円です。", "これはひゃくえんです。", "Ini seratus yen."],
  ["子", "こ", "シ / ス", "Anak", "Menggambarkan bayi dengan kepala besar dan lengan terentang.", "子供が公園で遊びます。", "こどもがこうえんであそびます。", "Anak-anak bermain di taman."],
  ["外", "そと / ほか", "ガイ / ゲ", "Luar", "Gabungan 夕 (malam) dan 卜. Ingat sebagai 'di luar rumah'. Lawan dari 中.", "外は寒いです。", "そとはさむいです。", "Di luar dingin."],
  ["八", "や.っつ", "ハチ", "Delapan", "Dua goresan yang melebar ke bawah, seperti jari yang terbuka.", "八時に学校へ行きます。", "はちじにがっこうへいきます。", "Saya pergi ke sekolah jam delapan."],
  ["六", "む.っつ", "ロク / リク", "Enam", "Ada tutup di atas dan dua kaki di bawah.", "六月は雨が多いです。", "ろくがつはあめがおおいです。", "Bulan Juni banyak hujan."],
  ["下", "した / さ.がる", "カ / ゲ", "Bawah; turun", "Garis pendek di bawah garis dasar: sesuatu yang berada di bawah. Lawan dari 上.", "椅子の下に猫がいます。", "いすのしたにねこがいます。", "Ada kucing di bawah kursi."],
  ["来", "く.る", "ライ", "Datang", "Menyerupai tanaman gandum dengan bulirnya. Dulu dianggap sebagai tanaman yang 'datang' dari tempat jauh.", "友達が来ます。", "ともだちがきます。", "Teman akan datang."],
  ["気", "—", "キ / ケ", "Semangat, udara, perasaan", "Bentuk lama 氣 berisi 米 (beras) di bawah uap: tenaga yang datang dari makanan.", "お元気ですか。", "おげんきですか。", "Apa kabar?"],
  ["七", "なな.つ", "シチ", "Tujuh", "Garis mendatar yang dipotong satu goresan melengkung.", "七時に朝ごはんを食べます。", "しちじにあさごはんをたべます。", "Saya sarapan jam tujuh."],
  ["話", "はな.す / はなし", "ワ", "Berbicara; cerita", "言 (kata) di kiri dan 舌 (lidah) di kanan: kata yang keluar dari lidah.", "友達と話します。", "ともだちとはなします。", "Saya berbicara dengan teman."],
  ["女", "おんな", "ジョ", "Perempuan", "Menggambarkan sosok perempuan yang duduk berlutut dengan tangan bersilang.", "あの女の人は先生です。", "あのおんなのひとはせんせいです。", "Perempuan itu adalah guru."],
  ["北", "きた", "ホク", "Utara", "Dua orang yang saling membelakangi. Dipakai juga untuk arah utara.", "北海道は日本の北にあります。", "ほっかいどうはにほんのきたにあります。", "Hokkaido berada di utara Jepang."],
  ["午", "うま", "ゴ", "Tengah hari", "Sering muncul di 午前 (pagi) dan 午後 (siang/sore). Jangan tertukar dengan 牛 (sapi).", "午後、買い物に行きます。", "ごご、かいものにいきます。", "Siang nanti saya pergi berbelanja."],
  ["百", "もも", "ヒャク", "Seratus", "一 (satu) di atas 白 (putih). Ingat sebagai satu 'putih' penuh: seratus.", "百円のパンを買います。", "ひゃくえんのパンをかいます。", "Saya membeli roti seharga seratus yen."],
  ["書", "か.く", "ショ", "Menulis", "Tangan memegang kuas (聿) di atas 日. Ingat sebagai menulis dengan kuas.", "名前を書いてください。", "なまえをかいてください。", "Tolong tulis nama Anda."],
  ["名", "な", "メイ / ミョウ", "Nama", "夕 (malam) dan 口 (mulut): di malam yang gelap orang saling menyebut nama.", "お名前は何ですか。", "おなまえはなんですか。", "Siapa nama Anda?"],
  ["千", "ち", "セン", "Seribu", "Satu goresan di atas 十: ingat sebagai 'sepuluh' yang diberi tambahan di atas.", "千円です。", "せんえんです。", "Harganya seribu yen."],
  ["半", "なか.ば", "ハン", "Setengah", "Garis vertikal membelah 八 dari atas: sesuatu yang dibagi dua.", "三時半に会いましょう。", "さんじはんにあいましょう。", "Mari bertemu jam setengah empat (15.30)."],
  ["西", "にし", "セイ / サイ", "Barat", "Burung yang pulang ke sarang saat matahari terbenam: arah barat.", "太陽は西に沈みます。", "たいようはにしにしずみます。", "Matahari terbenam di barat."],
  ["電", "—", "デン", "Listrik", "雨 (hujan) di atas: kilat yang menyambar saat hujan.", "電車で会社へ行きます。", "でんしゃでかいしゃへいきます。", "Saya pergi ke kantor naik kereta listrik."],
  ["校", "—", "コウ", "Sekolah", "木 (kayu) di kiri dan 交 (bersilang) di kanan. Dulu bangunan kayu tempat belajar. Muncul di 学校.", "学校は九時に始まります。", "がっこうはくじにはじまります。", "Sekolah mulai jam sembilan."],
  ["語", "かた.る", "ゴ", "Bahasa, kata", "言 (kata) di kiri dan 吾 (aku) di kanan: kata-kata yang diucapkan.", "日本語を勉強します。", "にほんごをべんきょうします。", "Saya belajar bahasa Jepang."],
  ["聞", "き.く", "ブン / モン", "Mendengar; bertanya", "耳 (telinga) di dalam 門 (gerbang): mendengar dari balik gerbang.", "音楽を聞きます。", "おんがくをききます。", "Saya mendengarkan musik."],
  ["食", "た.べる / く.う", "ショク", "Makan; makanan", "Bagian atas seperti tutup, bagian bawah seperti mangkuk makanan.", "朝ごはんを食べます。", "あさごはんをたべます。", "Saya sarapan."],
  ["車", "くるま", "シャ", "Mobil, kendaraan", "Pandangan dari atas sebuah kendaraan beroda: kotak dengan sumbu di tengah.", "新しい車を買いました。", "あたらしいくるまをかいました。", "Saya membeli mobil baru."],
  ["何", "なに / なん", "カ", "Apa", "亻 (orang) di kiri dan 可 di kanan: orang yang bertanya 'apa?'.", "これは何ですか。", "これはなんですか。", "Ini apa?"],
  ["南", "みなみ", "ナン", "Selatan", "Bentuk seperti tenda atau rumah yang menghadap matahari: arah selatan.", "沖縄は日本の南にあります。", "おきなわはにほんのみなみにあります。", "Okinawa berada di selatan Jepang."],
  ["万", "よろず", "マン / バン", "Sepuluh ribu", "Bentuk sederhana dari 萬. Dipakai sebagai satuan 10.000.", "一万円です。", "いちまんえんです。", "Harganya sepuluh ribu yen."],
  ["毎", "ごと", "マイ", "Setiap", "Mirip 母 (ibu) dengan tambahan di atas: sesuatu yang berulang setiap hari.", "毎朝、六時に起きます。", "まいあさ、ろくじにおきます。", "Setiap pagi saya bangun jam enam."],
  ["白", "しろ.い", "ハク / ビャク", "Putih", "日 (matahari) dengan satu goresan di atas: sinar yang putih.", "白い花が好きです。", "しろいはながすきです。", "Saya suka bunga putih."],
  ["天", "あめ / あま", "テン", "Langit, surga", "大 (besar/manusia) dengan garis di atasnya: yang berada di atas manusia.", "今日はいい天気です。", "きょうはいいてんきです。", "Hari ini cuacanya bagus."],
  ["母", "はは", "ボ", "Ibu", "Mirip 女 (perempuan) dengan dua titik yang menandai seorang ibu.", "母は料理が上手です。", "はははりょうりがじょうずです。", "Ibu saya pandai memasak."],
  ["右", "みぎ", "ウ / ユウ", "Kanan", "Tangan (ナ) dan 口 (mulut): tangan kanan yang dipakai untuk makan. Lawan dari 左.", "右に曲がってください。", "みぎにまがってください。", "Tolong belok ke kanan."],
  ["読", "よ.む", "ドク / トク", "Membaca", "言 (kata) di kiri dan 売 (menjual) di kanan: melafalkan kata-kata.", "毎日、新聞を読みます。", "まいにち、しんぶんをよみます。", "Setiap hari saya membaca koran."],
  ["友", "とも", "ユウ", "Teman", "Dua tangan yang saling bergandengan.", "友達と映画を見ます。", "ともだちとえいがをみます。", "Saya menonton film bersama teman."],
  ["左", "ひだり", "サ / シャ", "Kiri", "Tangan (ナ) dan 工 (alat kerja): tangan kiri yang memegang alat. Lawan dari 右.", "左に曲がってください。", "ひだりにまがってください。", "Tolong belok ke kiri."],
  ["休", "やす.む", "キュウ", "Istirahat, libur", "亻 (orang) bersandar pada 木 (pohon): orang yang sedang beristirahat.", "日曜日は休みです。", "にちようびはやすみです。", "Hari Minggu libur."],
  ["父", "ちち", "フ", "Ayah", "Menggambarkan tangan yang memegang perkakas: ayah sebagai kepala keluarga yang bekerja.", "父は会社へ行きました。", "ちちはかいしゃへいきました。", "Ayah saya sudah pergi ke kantor."],
  ["雨", "あめ", "ウ", "Hujan", "Garis atas melambangkan langit, titik-titik di dalam bingkai melambangkan tetesan hujan.", "今日は雨です。", "きょうはあめです。", "Hari ini hujan."],
];

const raw = JSON.parse(fs.readFileSync("_n5_raw.json", "utf8"));
const rawSet = new Set(raw.map((r) => r.kanji));
const dataPath = "data.json";
const text = fs.readFileSync(dataPath, "utf8");
const data = JSON.parse(text);

const existing = new Set();
for (const lv of Object.keys(data.kanji)) for (const k of data.kanji[lv]) existing.add(k.kanji);

const items = rows.map(([kanji, kunyomi, onyomi, meaning, pattern_hint, jp, reading, exMeaning]) => ({
  kanji, kunyomi, onyomi, meaning, pattern_hint,
  example: { japanese: jp, reading, meaning: exMeaning },
}));

// Validasi
const seen = new Set();
for (const it of items) {
  if (seen.has(it.kanji)) throw new Error("duplikat di skrip: " + it.kanji);
  seen.add(it.kanji);
  if (existing.has(it.kanji)) throw new Error("sudah ada di data.json: " + it.kanji);
  if (!rawSet.has(it.kanji)) throw new Error("tidak ada di raw N5: " + it.kanji);
  if (!it.example.japanese.includes(it.kanji)) throw new Error("contoh tidak memuat kanji: " + it.kanji);
}
const missing = [...rawSet].filter((c) => !seen.has(c));
if (missing.length) throw new Error("belum dikerjakan: " + missing.join(""));

// Pastikan format penulisan identik dengan JSON.stringify agar diff bersih
const eol = text.includes("\r\n") ? "\r\n" : "\n";
const endsNl = /\r?\n$/.test(text);
const roundTrip = JSON.stringify(data, null, 2).replace(/\n/g, eol) + (endsNl ? eol : "");
if (roundTrip !== text) throw new Error("format data.json tidak identik dengan JSON.stringify; hentikan");

data.kanji.N5.push(...items);
fs.writeFileSync(dataPath, JSON.stringify(data, null, 2).replace(/\n/g, eol) + (endsNl ? eol : ""), "utf8");
console.log("Ditambahkan:", items.length, "| N5 sekarang:", data.kanji.N5.length);
