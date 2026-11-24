import fs from 'fs';
import path from 'path';

// Master high-standard question bank with realistic, challenging, and length-balanced distractors
const REVISED_QUIZ_BANK = [
  // --- MANAJEMEN & BRAND ---
  {
    id: "LC-MGT-01",
    category: "Manajemen & Brand",
    venue: "LuckyCat",
    question: "Siapakah Operational Manager dan Assistant Manager di LuckyCat saat ini?",
    options: [
      "Operational Manager: Ryan | Assistant Manager: Sherly & Ari",
      "Operational Manager: Ari | Assistant Manager: Ryan & Sherly",
      "Operational Manager: Sherly | Assistant Manager: Ryan & Anto",
      "Operational Manager: Ryan | Assistant Manager: Gery & Martha"
    ],
    correctAnswer: "Operational Manager: Ryan | Assistant Manager: Sherly & Ari",
    explanation: "Struktur manajemen operasional LuckyCat dipimpin oleh Ryan (Operational Manager) bersama Sherly dan Ari (Assistant Manager)."
  },
  {
    id: "LC-MGT-02",
    category: "Manajemen & Brand",
    venue: "LuckyCat",
    question: "Apa makna dan filosofi dari logo LuckyCat?",
    options: [
      "Kucing pembawa hoki, rezeki & keberuntungan (Fortune Cat)",
      "Kucing ketangkasan, fokus & strategi bermain meja biliar",
      "Kucing kebersamaan komunitas, kehangatan & santai malam",
      "Kucing ketelitian cita rasa kuliner, keramahan & pelayanan"
    ],
    correctAnswer: "Kucing pembawa hoki, rezeki & keberuntungan (Fortune Cat)",
    explanation: "Logo LuckyCat melambangkan kucing pembawa hoki (fortune cat) yang membawa rezeki dan keberuntungan bagi venue dan pelanggan."
  },
  {
    id: "LC-MGT-03",
    category: "Manajemen & Brand",
    venue: "LuckyCat",
    question: "Berapa jam operasional resmi LuckyCat setiap harinya?",
    options: [
      "Buka setiap hari mulai pukul 11:00 WITA hingga 03:00 WITA dini hari",
      "Buka setiap hari mulai pukul 10:00 WITA hingga 02:00 WITA dini hari",
      "Buka setiap hari mulai pukul 12:00 WITA hingga 04:00 WITA dini hari",
      "Buka setiap hari mulai pukul 11:00 WITA hingga 01:00 WITA dini hari"
    ],
    correctAnswer: "Buka setiap hari mulai pukul 11:00 WITA hingga 03:00 WITA dini hari",
    explanation: "LuckyCat beroperasi setiap hari (Open Daily) mulai pukul 11:00 pagi hingga 03:00 subuh WITA."
  },

  // --- MANAJEMEN & TIM ---
  {
    id: "LC-TIM-01",
    category: "Manajemen & Tim",
    venue: "LuckyCat",
    question: "Siapakah Head Chef yang memimpin seluruh divisi Kitchen di LuckyCat?",
    options: [
      "Head Chef Anto Suranto",
      "Head Chef Martha Wijaya",
      "Head Chef Febialdo (Edo)",
      "Head Chef Harun Ar Rasyid"
    ],
    correctAnswer: "Head Chef Anto Suranto",
    explanation: "Head Chef Kitchen LuckyCat dipimpin oleh Anto Suranto."
  },
  {
    id: "LC-TIM-02",
    category: "Manajemen & Tim",
    venue: "LuckyCat",
    question: "Siapakah dua staf yang memegang posisi juru masak (Cook) di Kitchen LuckyCat?",
    options: [
      "Martha Andi Wijaya dan Achmad Fazrin Febialdo (Edo)",
      "Nurjanah dan Ulul Albab bersama Harun Ar Rasyid",
      "Parel dan Raymond bersama Gery Christian",
      "Anto Suranto dan Ryan Gerrit bersama Ari"
    ],
    correctAnswer: "Martha Andi Wijaya dan Achmad Fazrin Febialdo (Edo)",
    explanation: "Posisi Cook di Kitchen LuckyCat dipegang oleh Martha Andi Wijaya dan Achmad Fazrin Febialdo (Edo)."
  },
  {
    id: "LC-TIM-03",
    category: "Manajemen & Tim",
    venue: "LuckyCat",
    question: "Siapa sajakah tim Helper Cook yang bertugas mendukung operasional Kitchen LuckyCat?",
    options: [
      "Nurjanah, Ulul Albab, dan Harun Ar Rasyid",
      "Martha Andi Wijaya, Edo, dan Anto Suranto",
      "Parel, Gery Christian, dan Raymond Bar",
      "Mada Saputra, Jackson, dan Ari Assistant"
    ],
    correctAnswer: "Nurjanah, Ulul Albab, dan Harun Ar Rasyid",
    explanation: "Tim Helper Cook Kitchen LuckyCat beranggotakan Nurjanah, Ulul Albab, dan Harun Ar Rasyid."
  },
  {
    id: "LC-TIM-04",
    category: "Manajemen & Tim",
    venue: "LuckyCat",
    question: "Siapa sajakah personil tim Bar yang bertugas meracik minuman di LuckyCat?",
    options: [
      "Parel, Gery, Raymond, Mada, dan Jackson",
      "Anto, Martha, Edo, Nurjanah, dan Harun",
      "Ryan, Sherly, Ari, Ulul, dan Febialdo",
      "Martin, Andre, Rojes, Martha, dan Parel"
    ],
    correctAnswer: "Parel, Gery, Raymond, Mada, dan Jackson",
    explanation: "Tim Bar LuckyCat beranggotakan Parel, Gery, Raymond, Mada, dan Jackson."
  },

  // --- STANDAR MEJA & FASILITAS ---
  {
    id: "LC-EQP-01",
    category: "Standar Meja",
    venue: "LuckyCat",
    question: "Berapa jumlah meja reguler dan ruangan VIP yang ada di LuckyCat?",
    options: [
      "11 Regular Table dan 3 VIP Room",
      "10 Regular Table dan 2 VIP Room",
      "12 Regular Table dan 3 VIP Room",
      "14 Regular Table dan 4 VIP Room"
    ],
    correctAnswer: "11 Regular Table dan 3 VIP Room",
    explanation: "LuckyCat memiliki 11 meja biliar reguler di area utama dan 3 ruangan VIP privat."
  },
  {
    id: "LC-EQP-02",
    category: "Standar Meja",
    venue: "LuckyCat",
    question: "Perlengkapan apa sajakah yang WAJIB selalu tersedia lengkap di setiap meja biliar LuckyCat?",
    options: [
      "Triangle, Racking Paper, 1 set bola, 2 pcs chalk, Break Cue, dan Bridge Cue",
      "Triangle, Racking Paper, 1 set bola, 1 pcs chalk, Playing Cue, dan Jump Cue",
      "Triangle, Racking Sheet, 1 set bola, 2 pcs chalk, Jump Cue, dan Sarung Tangan",
      "Racking Paper, 1 set bola biliar, 4 pcs chalk, Break Cue, dan Extension Cue"
    ],
    correctAnswer: "Triangle, Racking Paper, 1 set bola, 2 pcs chalk, Break Cue, dan Bridge Cue",
    explanation: "Standar setup meja biliar LuckyCat wajib memiliki: Triangle, Racking Paper, 1 set bola biliar, 2 pcs chalk, Break Cue, dan Bridge Cue (stick bantu)."
  },
  {
    id: "LC-EQP-03",
    category: "Standar Meja",
    venue: "LuckyCat",
    question: "Berapa jumlah chalk biliar yang wajib disiapkan di setiap meja biliar sebelum tamu mulai bermain?",
    options: [
      "2 pcs chalk dalam kondisi siap pakai",
      "1 pcs chalk dalam kondisi siap pakai",
      "3 pcs chalk dalam kondisi siap pakai",
      "4 pcs chalk dalam kondisi siap pakai"
    ],
    correctAnswer: "2 pcs chalk dalam kondisi siap pakai",
    explanation: "Setiap meja biliar LuckyCat wajib dilengkapi minimal 2 pcs chalk dalam kondisi siap pakai untuk kenyamanan pemain."
  },
  {
    id: "LC-EQP-04",
    category: "Fasilitas & Loker",
    venue: "LuckyCat",
    question: "Berapa biaya sewa loker penyimpanan stick biliar untuk tamu di LuckyCat?",
    options: [
      "Rp 50.000 per bulan atau Rp 100.000 untuk paket 3 bulan",
      "Rp 40.000 per bulan atau Rp 100.000 untuk paket 3 bulan",
      "Rp 60.000 per bulan atau Rp 150.000 untuk paket 3 bulan",
      "Rp 50.000 per bulan atau Rp 120.000 untuk paket 3 bulan"
    ],
    correctAnswer: "Rp 50.000 per bulan atau Rp 100.000 untuk paket 3 bulan",
    explanation: "Penyewaan loker penyimpanan biliar gear tersedia dengan harga Rp 50.000 per bulan atau paket hemat Rp 100.000 untuk 3 bulan."
  },
  {
    id: "LC-EQP-05",
    category: "Fasilitas & Gear",
    venue: "LuckyCat",
    question: "Berapa harga termurah untuk aksesoris biliar (chalk, tips, sarung tangan) di Shop Your Gear LuckyCat?",
    options: [
      "Mulai dari harga Rp 30.000",
      "Mulai dari harga Rp 20.000",
      "Mulai dari harga Rp 40.000",
      "Mulai dari harga Rp 50.000"
    ],
    correctAnswer: "Mulai dari harga Rp 30.000",
    explanation: "Aksesoris dan gear biliar (sarung tangan, chalk, tips, cue cases) tersedia mulai dari harga Rp 30.000."
  },

  // --- HARGA & PAKET MEJA ---
  {
    id: "LC-PRC-01",
    category: "Harga Meja",
    venue: "LuckyCat",
    question: "Berapa tarif sewa normal per jam untuk Regular Table dan VIP Table di LuckyCat?",
    options: [
      "Regular Table Rp 50.000/jam | VIP Table Rp 80.000/jam",
      "Regular Table Rp 40.000/jam | VIP Table Rp 70.000/jam",
      "Regular Table Rp 60.000/jam | VIP Table Rp 100.000/jam",
      "Regular Table Rp 50.000/jam | VIP Table Rp 100.000/jam"
    ],
    correctAnswer: "Regular Table Rp 50.000/jam | VIP Table Rp 80.000/jam",
    explanation: "Tarif sewa per jam normal adalah Rp 50.000/jam untuk meja reguler dan Rp 80.000/jam untuk meja VIP room."
  },
  {
    id: "LC-PRC-02",
    category: "Promo Meja",
    venue: "LuckyCat",
    question: "Berapa minimal transaksi F&B (makanan & minuman) agar tamu mendapatkan GRATIS 1 jam sewa meja Regular?",
    options: [
      "Minimal transaksi Rp 300.000 untuk F&B",
      "Minimal transaksi Rp 200.000 untuk F&B",
      "Minimal transaksi Rp 250.000 untuk F&B",
      "Minimal transaksi Rp 350.000 untuk F&B"
    ],
    correctAnswer: "Minimal transaksi Rp 300.000 untuk F&B",
    explanation: "Tamu yang melakukan pemesanan F&B minimal Rp 300.000 berhak mendapatkan gratis bermain 1 jam di meja Regular."
  },
  {
    id: "LC-PRC-03",
    category: "Paket Meja",
    venue: "LuckyCat",
    question: "Pada jam siang (11:00 - 18:00), paket meja Regular apa yang tersedia seharga Rp 120.000?",
    options: [
      "Paket All You Can Play (Bebas main sepuasnya sampai jam 18:00)",
      "Paket Main 3 Jam Meja Regular + Free 1 Porsi Mix Platter",
      "Paket Main 4 Jam Meja Regular + Free 1 Pitcher Lemon Tea",
      "Paket Main 2 Jam Meja VIP Room + Free 1 Porsi French Fries"
    ],
    correctAnswer: "Paket All You Can Play (Bebas main sepuasnya sampai jam 18:00)",
    explanation: "Paket All You Can Play berlaku pukul 11:00 - 18:00 seharga Rp 120.000 untuk bermain sepuasnya di meja reguler."
  },
  {
    id: "LC-PRC-04",
    category: "Paket Meja",
    venue: "LuckyCat",
    question: "Pada jam siang (11:00 - 18:00), paket seharga Rp 100.000 di meja Regular memberikan pilihan apa kepada tamu?",
    options: [
      "Main 2 Jam + 1 Snack ATAU Main 3 Jam tanpa snack",
      "Main 1 Jam + 2 Snack ATAU Main 2 Jam tanpa snack",
      "Main 2 Jam + 1 Pitcher Teh ATAU Main 4 Jam meja",
      "Main 3 Jam + 1 Snack ATAU Main 2 Jam VIP Room"
    ],
    correctAnswer: "Main 2 Jam + 1 Snack ATAU Main 3 Jam tanpa snack",
    explanation: "Pada jam siang (11:00 - 18:00), paket Rp 100.000 memberikan pilihan: 2 jam + 1 snack ATAU 3 jam bermain."
  },
  {
    id: "LC-PRC-05",
    category: "Paket Meja",
    venue: "LuckyCat",
    question: "Pada jam malam (18:00 - 03:00), paket seharga Rp 100.000 di meja Regular mendapatkan apa?",
    options: [
      "Main 2 Jam meja regular + 1 porsi snack pilihan",
      "Main 3 Jam meja regular tanpa tambahan snack",
      "Main 2 Jam meja regular + 1 pitcher es teh manis",
      "Main 1 Jam meja VIP room + 1 porsi snack pilihan"
    ],
    correctAnswer: "Main 2 Jam meja regular + 1 porsi snack pilihan",
    explanation: "Pada jam malam (18:00 - 03:00), paket Rp 100.000 memberikan tamu waktu bermain 2 jam plus 1 porsi snack."
  },
  {
    id: "LC-PRC-06",
    category: "Paket Meja",
    venue: "LuckyCat",
    question: "Berapa harga paket VIP Table All Day selama 2 jam yang sudah termasuk 1 porsi snack?",
    options: [
      "Rp 150.000 (sedangkan paket VIP 3 jam tanpa snack adalah Rp 200.000)",
      "Rp 120.000 (sedangkan paket VIP 3 jam tanpa snack adalah Rp 180.000)",
      "Rp 180.000 (sedangkan paket VIP 3 jam tanpa snack adalah Rp 220.000)",
      "Rp 160.000 (sedangkan paket VIP 3 jam tanpa snack adalah Rp 210.000)"
    ],
    correctAnswer: "Rp 150.000 (sedangkan paket VIP 3 jam tanpa snack adalah Rp 200.000)",
    explanation: "Paket meja VIP All Day 2 jam + 1 snack seharga Rp 150.000 (sedangkan paket VIP 3 jam tanpa snack adalah Rp 200.000)."
  },

  // --- PROMO MINUMAN & BIRTHDAY PACKAGE ---
  {
    id: "LC-PRO-01",
    category: "Promo Minuman",
    venue: "LuckyCat",
    question: "Kapan jam berlaku promo BUY 2 GET 1 FREE untuk seluruh Cocktail, Mocktail & Single Mixer di LuckyCat?",
    options: [
      "Pukul 23:00 - 03:00 WITA dini hari (Late Night Promo)",
      "Pukul 19:00 - 23:00 WITA malam hari (Prime Time Promo)",
      "Pukul 17:00 - 21:00 WITA petang hari (After Office Promo)",
      "Pukul 11:00 - 15:00 WITA siang hari (Lunch Hour Promo)"
    ],
    correctAnswer: "Pukul 23:00 - 03:00 WITA dini hari (Late Night Promo)",
    explanation: "Promo Buy 2 Get 1 Free berlaku larut malam (Late Night) dari pukul 23:00 WITA hingga 03:00 WITA (closing)."
  },
  {
    id: "LC-PRO-02",
    category: "Promo Minuman",
    venue: "LuckyCat",
    question: "Berapa harga per gelas standar untuk Mocktail, Single Mixer, Classic Cocktail, dan Signature Cocktail di LuckyCat?",
    options: [
      "Mocktail: 38K | Single Mixer: 80K | Classic Cocktail: 80K | Signature Cocktail: 100K",
      "Mocktail: 35K | Single Mixer: 75K | Classic Cocktail: 85K | Signature Cocktail: 105K",
      "Mocktail: 40K | Single Mixer: 80K | Classic Cocktail: 90K | Signature Cocktail: 110K",
      "Mocktail: 38K | Single Mixer: 70K | Classic Cocktail: 80K | Signature Cocktail: 120K"
    ],
    correctAnswer: "Mocktail: 38K | Single Mixer: 80K | Classic Cocktail: 80K | Signature Cocktail: 100K",
    explanation: "Harga resmi minuman LuckyCat: Mocktail Rp 38.000, Single Mixer Rp 80.000, Classic Cocktail Rp 80.000, dan Signature Cocktail Rp 100.000."
  },
  {
    id: "LC-PRO-03",
    category: "Promo Minuman",
    venue: "LuckyCat",
    question: "Dalam promo \"Mix It Like You Mean It\", mixer gratis apa yang didapat saat membeli 1 botol Oro Tequila?",
    options: [
      "Gratis 2 botol Minute Maid Pulpy Orange",
      "Gratis 2 kaleng Coca-Cola dingin 330ml",
      "Gratis 2 kaleng Schweppes Tonic Water",
      "Gratis 2 kaleng Schweppes Ginger Ale"
    ],
    correctAnswer: "Gratis 2 botol Minute Maid Pulpy Orange",
    explanation: "Beli 1 botol Oro Tequila mendapatkan gratis 2 botol Pulpy Orange, sedangkan beli 1 botol Omrach Whiskey 700ml mendapatkan gratis 2 kaleng Coca-Cola."
  },
  {
    id: "LC-PRO-04",
    category: "Promo Minuman",
    venue: "LuckyCat",
    question: "Dalam promo \"Mix It Like You Mean It\", mixer gratis apa yang didapat saat membeli 1 botol Omrach Whiskey 700ml?",
    options: [
      "Gratis 2 kaleng Coca-Cola dingin 330ml",
      "Gratis 2 botol Minute Maid Pulpy Orange",
      "Gratis 2 kaleng Schweppes Tonic Water",
      "Gratis 2 kaleng Sprite dingin 330ml"
    ],
    correctAnswer: "Gratis 2 kaleng Coca-Cola dingin 330ml",
    explanation: "Setiap pembelian 1 botol Omrach Whiskey 700ml otomatis mendapatkan 2 kaleng Coca-Cola gratis."
  },
  {
    id: "LC-PRO-05",
    category: "Promo Minuman",
    venue: "LuckyCat",
    question: "Bagaimana ketentuan promo \"Special Promo Jameson\" di LuckyCat?",
    options: [
      "Single Bottle Rp 850.000, tambahan botol kedua hanya Rp 450.000",
      "Single Bottle Rp 800.000, tambahan botol kedua hanya Rp 400.000",
      "Single Bottle Rp 900.000, tambahan botol kedua hanya Rp 500.000",
      "Single Bottle Rp 850.000, tambahan botol kedua hanya Rp 550.000"
    ],
    correctAnswer: "Single Bottle Rp 850.000, tambahan botol kedua hanya Rp 450.000",
    explanation: "Promo Jameson adalah Single Bottle Rp 850K, dan tamu dapat menambah 1 botol lagi hanya dengan menambah Rp 450K."
  },
  {
    id: "LC-BDY-01",
    category: "Birthday Package",
    venue: "LuckyCat",
    question: "Berapa harga paket ulang tahun Regular Birthday Package dan VIP Birthday Package di LuckyCat?",
    options: [
      "Regular Birthday: Rp 438.000 | VIP Birthday: Rp 538.000",
      "Regular Birthday: Rp 400.000 | VIP Birthday: Rp 500.000",
      "Regular Birthday: Rp 450.000 | VIP Birthday: Rp 550.000",
      "Regular Birthday: Rp 480.000 | VIP Birthday: Rp 580.000"
    ],
    correctAnswer: "Regular Birthday: Rp 438.000 | VIP Birthday: Rp 538.000",
    explanation: "Paket ulang tahun LuckyCat: Regular Birthday Package seharga Rp 438K (2 jam meja regular) dan VIP Birthday Package seharga Rp 538K (2 jam VIP room)."
  },
  {
    id: "LC-BDY-02",
    category: "Birthday Package",
    venue: "LuckyCat",
    question: "Apa saja 6 item yang termasuk dalam Birthday Package LuckyCat (438K / 538K)?",
    options: [
      "2 Jam Meja, 2 Botol Arak / 2 Pitcher Es Teh, Chicken Wings, Mix Platter, Batagor Siomay, French Fries",
      "2 Jam Meja, 2 Botol Arak / 2 Pitcher Es Teh, Chicken Wings, Tahu Cabe Garam, Cireng Rujak, French Fries",
      "3 Jam Meja, 1 Botol Spirit / 2 Pitcher Es Teh, Chicken Wings, Mix Platter, Batagor Siomay, Singkong Goreng",
      "2 Jam Meja, 4 Kaleng Beer / 2 Pitcher Es Teh, Calamari Rings, Mix Platter, Batagor Siomay, French Fries"
    ],
    correctAnswer: "2 Jam Meja, 2 Botol Arak / 2 Pitcher Es Teh, Chicken Wings, Mix Platter, Batagor Siomay, French Fries",
    explanation: "Inklusi paket: 2 Jam Meja (Regular/VIP), Pilihan minuman (2 botol arak atau 2 pitcher lemon/lychee tea), Pilihan chicken wings, 1 Mix Platter, 1 porsi Batagor Siomay, dan 1 porsi French Fries."
  },
  {
    id: "LC-BDY-03",
    category: "Birthday Package",
    venue: "LuckyCat",
    question: "Jika tamu Birthday Package ingin meng-upgrade minumannya ke Smirnoff Vodka, Captain Morgan, atau Batavia Whisky, berapa biaya tambahannya?",
    options: [
      "+ Rp 170.000 untuk upgrade pilihan botol tersebut",
      "+ Rp 150.000 untuk upgrade pilihan botol tersebut",
      "+ Rp 190.000 untuk upgrade pilihan botol tersebut",
      "+ Rp 210.000 untuk upgrade pilihan botol tersebut"
    ],
    correctAnswer: "+ Rp 170.000 untuk upgrade pilihan botol tersebut",
    explanation: "Upgrade ke Smirnoff Vodka, Captain Morgan, atau Batavia Whisky hanya dikenakan biaya tambahan Rp 170.000."
  },
  {
    id: "LC-BDY-04",
    category: "Birthday Package",
    venue: "LuckyCat",
    question: "Jika tamu Birthday Package ingin meng-upgrade minumannya ke Jameson, Maze-Maze all variants, atau Absolut Vodka, berapa biaya tambahannya?",
    options: [
      "+ Rp 580.000 untuk upgrade premium pilihan tersebut",
      "+ Rp 480.000 untuk upgrade premium pilihan tersebut",
      "+ Rp 520.000 untuk upgrade premium pilihan tersebut",
      "+ Rp 620.000 untuk upgrade premium pilihan tersebut"
    ],
    correctAnswer: "+ Rp 580.000 untuk upgrade premium pilihan tersebut",
    explanation: "Upgrade premium ke Jameson, Maze-Maze all variants, atau Absolut Vodka dikenakan biaya tambahan Rp 580.000."
  },

  // --- ARISAN & TURNAMEN ---
  {
    id: "LC-ARS-01",
    category: "Arisan & Turnamen",
    venue: "LuckyCat",
    question: "Kapan jadwal turnamen \"Arisan\" biliar mingguan diadakan di LuckyCat untuk kategori umum dan kategori wanita?",
    options: [
      "Kategori Umum: Setiap Jumat jam 19:00 | Kategori Wanita (Ladies Only): Setiap Senin jam 19:00",
      "Kategori Umum: Setiap Sabtu jam 19:00 | Kategori Wanita (Ladies Only): Setiap Selasa jam 19:00",
      "Kategori Umum: Setiap Kamis jam 20:00 | Kategori Wanita (Ladies Only): Setiap Rabu jam 20:00",
      "Kategori Umum: Setiap Jumat jam 20:00 | Kategori Wanita (Ladies Only): Setiap Minggu jam 19:00"
    ],
    correctAnswer: "Kategori Umum: Setiap Jumat jam 19:00 | Kategori Wanita (Ladies Only): Setiap Senin jam 19:00",
    explanation: "Arisan Umum diadakan setiap Jumat jam 19:00 WITA, sedangkan Arisan Ladies Only diadakan setiap Senin jam 19:00 WITA."
  },
  {
    id: "LC-ARS-02",
    category: "Arisan & Turnamen",
    venue: "LuckyCat",
    question: "Berapa biaya registrasi untuk mengikuti Arisan Biliar di LuckyCat?",
    options: [
      "Rp 50.000 per peserta untuk pendaftaran",
      "Rp 35.000 per peserta untuk pendaftaran",
      "Rp 65.000 per peserta untuk pendaftaran",
      "Rp 75.000 per peserta untuk pendaftaran"
    ],
    correctAnswer: "Rp 50.000 per peserta untuk pendaftaran",
    explanation: "Biaya pendaftaran Arisan Biliar (baik hari Senin Ladies Only maupun Jumat Umum) adalah Rp 50.000 per peserta."
  },
  {
    id: "LC-ARS-03",
    category: "Arisan & Turnamen",
    venue: "LuckyCat",
    question: "Manakah dari aturan pertandingan Arisan Biliar LuckyCat berikut yang BENAR?",
    options: [
      "Game 9-Ball OTS, Race to 3, Voor System by Handicap, Golden Break TIDAK diperbolehkan",
      "Game 9-Ball OTS, Race to 4, Voor System by Handicap, Golden Break BEBAS diperbolehkan",
      "Game 8-Ball OTS, Race to 3, Scratch Loss Game System, Golden Break TIDAK diperbolehkan",
      "Game 10-Ball OTS, Race to 3, Single Elimination Murni, Golden Break BEBAS diperbolehkan"
    ],
    correctAnswer: "Game 9-Ball OTS, Race to 3, Voor System by Handicap, Golden Break TIDAK diperbolehkan",
    explanation: "Aturan resmi Arisan LuckyCat: 9-Ball OTS, Race to 3, Voor System by Handicap, Alternate Break, Single Elimination, dan Golden Break NOT ALLOWED."
  },

  // --- BAR & COCKTAIL ---
  {
    id: "LC-BAR-01",
    category: "Bar & Cocktail",
    venue: "LuckyCat",
    question: "Tamu menanyakan Signature Cocktail \"Cane and Root\" (100K). Apa keunikan rasa dan penyajiannya?",
    options: [
      "Campuran Dark Rum Myers, Sarsaparilla, Vanilla, dan disajikan dengan topping es krim Cornetto Vanilla",
      "Campuran Spiced Rum, Rootbeer soda, Caramel syrup, dan disajikan dengan topping cream cheese foam lembut",
      "Campuran Bourbon Whisky, Sarsaparilla, Cinnamon, dan disajikan dengan garnish marshmallow bakar aromatik",
      "Campuran Light Rum, Ginger soda, Hazelnut syrup, dan disajikan dengan 1 scoop es krim vanilla creamy"
    ],
    correctAnswer: "Campuran Dark Rum Myers, Sarsaparilla, Vanilla, dan disajikan dengan topping es krim Cornetto Vanilla",
    explanation: "Cane and Root (100K) menyajikan Dark Rum Myers, sarsaparilla, sirup vanila, dan diberi 1 pcs es krim Cornetto Vanilla di atasnya."
  },
  {
    id: "LC-BAR-02",
    category: "Bar & Cocktail",
    venue: "LuckyCat",
    question: "Bahan dasar dan rasa utama dari Signature Cocktail \"Melon Muse\" (100K) adalah...",
    options: [
      "Vodka, Melon Liqueur, Triple Sec, Lemon, dan sari bulir Mogu-Mogu Melon segar",
      "Light Rum, Blue Curacao, Pineapple Juice, Lemon, dan sari bulir Mogu-Mogu Kelapa",
      "London Dry Gin, Melon Syrup, Green Apple Puree, Lime, dan bulir nata de coco leci",
      "Blanco Tequila, Midori Melon, Simple Syrup, Orange, dan keping jelly lidah buaya"
    ],
    correctAnswer: "Vodka, Melon Liqueur, Triple Sec, Lemon, dan sari bulir Mogu-Mogu Melon segar",
    explanation: "Melon Muse (100K) memadukan Vodka, Melon Liqueur, Triple Sec, lemon juice, dan bulir nata de coco Mogu-Mogu Melon yang manis segar."
  },
  {
    id: "LC-BAR-03",
    category: "Bar & Cocktail",
    venue: "LuckyCat",
    question: "Signature Cocktail \"High Watermelon\" (100K) dibuat dari perpaduan bahan apa?",
    options: [
      "Gin, Semangka segar (Watermelon), Rose Syrup, Lemon Juice, dan Mint Leaf",
      "Vodka, Semangka segar (Watermelon), Lychee Syrup, Lime Juice, dan Basil Leaf",
      "Light Rum, Sari Buah Semangka, Strawberry Puree, Lemon Juice, dan Thyme Leaf",
      "Blanco Tequila, Semangka segar, Cranberry Syrup, Orange Juice, dan Rosemary"
    ],
    correctAnswer: "Gin, Semangka segar (Watermelon), Rose Syrup, Lemon Juice, dan Mint Leaf",
    explanation: "High Watermelon (100K) memadukan Gin, semangka segar yang dihancurkan, rose syrup, perasan lemon, dan daun mint."
  },
  {
    id: "LC-BAR-04",
    category: "Bar & Cocktail",
    venue: "LuckyCat",
    question: "Apa saja komposisi utama dari Signature Cocktail \"Velvet Vice\" (100K)?",
    options: [
      "Vodka, Giffard White Cocoa (Crème de Cacao Blanc), Hazelnut Syrup, dan Saline Solution",
      "Dark Rum, Kahlua Coffee Liqueur, Caramel Syrup, dan perasan Fresh Lime Solution",
      "Bourbon Whisky, Giffard Dark Cacao, Vanilla Syrup, dan taburan Sea Salt Flakes",
      "London Dry Gin, Baileys Irish Cream, Almond Syrup, dan sentuhan Citric Acid Solution"
    ],
    correctAnswer: "Vodka, Giffard White Cocoa (Crème de Cacao Blanc), Hazelnut Syrup, dan Saline Solution",
    explanation: "Velvet Vice (100K) mengombinasikan Vodka, white cocoa liqueur (Giffard), sirup hazelnut manis gurih, dan saline solution."
  },
  {
    id: "LC-BAR-05",
    category: "Bar & Cocktail",
    venue: "LuckyCat",
    question: "Signature Cocktail \"Pistachio Martini\" (100K) memiliki ciri khas tekstur berbusa lembut berkat penggunaan...",
    options: [
      "Light Rum, Pistachio Syrup, Lemon Juice, Saline Solution, dan kocokan Egg White (putih telur)",
      "Vodka Premium, Pistachio Puree, Lime Juice, Sugar Syrup, dan lapisan kocokan Whipped Cream",
      "London Dry Gin, Hazelnut Syrup, Lemon Juice, Simple Syrup, dan kocokan Aquafaba nabati",
      "Bourbon Whisky, Pistachio Liqueur, Orange Juice, Saline Solution, dan buih Susu Evaporasi"
    ],
    correctAnswer: "Light Rum, Pistachio Syrup, Lemon Juice, Saline Solution, dan kocokan Egg White (putih telur)",
    explanation: "Pistachio Martini (100K) menyajikan Light Rum, sirup kacang pistachio wangi, perasan lemon, dan putih telur segar yang dikocok hingga menghasilkan foam lembut."
  },
  {
    id: "LC-BAR-06",
    category: "Bar & Cocktail",
    venue: "LuckyCat",
    question: "Signature Cocktail baru \"Island Blush\" (100K) memiliki rasa buah tropis segar berbahan dasar...",
    options: [
      "Vodka Guava, Rose Syrup, buah Jambu Biji (Guava) segar, citric solution, dan daun mint",
      "Light Rum, Dragonfruit Puree, buah Naga Merah segar, saline solution, dan perasan jeruk nipis",
      "London Dry Gin, Pomegranate Syrup, sari Delima Merah segar, simple syrup, dan daun basil",
      "Blanco Tequila, Lychee Liqueur, buah Leci segar pilihan, citric solution, dan daun rosemary"
    ],
    correctAnswer: "Vodka Guava, Rose Syrup, buah Jambu Biji (Guava) segar, citric solution, dan daun mint",
    explanation: "Island Blush (100K) memadukan Vodka Guava, sirup mawar, buah guava merah segar, sentuhan citric & saline solution, dan daun mint."
  },
  {
    id: "LC-BAR-07",
    category: "Bar & Cocktail",
    venue: "LuckyCat",
    question: "Tamu memesan cocktail klasik \"Negroni\" (80K). Apa saja 3 komposisi utamanya?",
    options: [
      "Gin, Campari bitter liqueur, dan Sweet Vermouth",
      "Vodka, Kahlua coffee liqueur, dan Fresh Espresso",
      "Light Rum, Fresh Lime Juice, dan Simple Syrup",
      "Blanco Tequila, Triple Sec liqueur, dan Lime Juice"
    ],
    correctAnswer: "Gin, Campari bitter liqueur, dan Sweet Vermouth",
    explanation: "Negroni (80K) adalah classic cocktail dengan perpaduan seimbang antara Gin, Campari (bitter red liqueur), dan Sweet Vermouth."
  },
  {
    id: "LC-BAR-08",
    category: "Bar & Cocktail",
    venue: "LuckyCat",
    question: "Classic Cocktail \"Espresso Martini\" (80K) dibuat dari perpaduan apa saja?",
    options: [
      "Vodka, Kahlua (Coffee Liqueur), Fresh Espresso Shot, dan Simple Syrup",
      "Dark Rum, Baileys Irish Cream, Cold Brew Coffee, dan Vanilla Syrup",
      "Bourbon Whisky, Coffee Liqueur, Double Espresso Shot, dan Brown Sugar",
      "London Dry Gin, Kahlua Liqueur, Fresh Americano Shot, dan Caramel Syrup"
    ],
    correctAnswer: "Vodka, Kahlua (Coffee Liqueur), Fresh Espresso Shot, dan Simple Syrup",
    explanation: "Espresso Martini (80K) menyajikan Vodka, coffee liqueur Kahlua, seduhan espresso fresh berbusa, dan simple syrup."
  },
  {
    id: "LC-BAR-09",
    category: "Bar & Cocktail",
    venue: "LuckyCat",
    question: "Apa komposisi utama dari Classic Cocktail \"Lychee Martini\" (80K)?",
    options: [
      "Vodka, Lychee Liqueur, Lychee Syrup, Fresh Lemon Juice, dan buah leci asli",
      "London Dry Gin, Lychee Puree, Elderflower Syrup, Lime Juice, dan buah leci asli",
      "Light Rum, Triple Sec Liqueur, Lychee Syrup, Cranberry Juice, dan buah leci asli",
      "Blanco Tequila, Lychee Liqueur, Simple Syrup, Orange Juice, dan buah leci kaleng"
    ],
    correctAnswer: "Vodka, Lychee Liqueur, Lychee Syrup, Fresh Lemon Juice, dan buah leci asli",
    explanation: "Lychee Martini (80K) memadukan Vodka, lychee liqueur, lychee syrup manis harum, perasan lemon segar, dan garnish buah leci."
  },
  {
    id: "LC-BAR-10",
    category: "Bar & Cocktail",
    venue: "LuckyCat",
    question: "Cocktail baru \"Illution\" (100K) menyajikan warna biru memukau dengan bahan utama apa saja?",
    options: [
      "Vodka, Triple Sec, Pineapple Juice, Blue Curacao Syrup, Melon Liqueur, dan Lemon Juice",
      "Light Rum, Blue Curacao Liqueur, Coconut Water, Lime Juice, Lychee Syrup, dan Soda",
      "London Dry Gin, Blue Curacao Syrup, Apple Juice, Peach Liqueur, Lemon, dan Sprite",
      "Blanco Tequila, Triple Sec, Orange Juice, Blue Citrus Syrup, Melon Syrup, dan Tonic"
    ],
    correctAnswer: "Vodka, Triple Sec, Pineapple Juice, Blue Curacao Syrup, Melon Liqueur, dan Lemon Juice",
    explanation: "Illution (100K) adalah cocktail segar berwarna biru cerah perpaduan Vodka, Triple Sec, sari nanas manis, Blue Curacao, Melon Liqueur, dan perasan lemon segar."
  },
  {
    id: "LC-BAR-11",
    category: "Bar & Cocktail",
    venue: "LuckyCat",
    question: "Classic Cocktail \"Margarita\" (80K) memiliki ciri khas penyajian berupa...",
    options: [
      "Lapisan garam halus (salt rim) di bibir gelas dengan racikan Tequila, Triple Sec, dan Lime Juice",
      "Lapisan gula aren (sugar rim) di bibir gelas dengan racikan Dark Rum, Triple Sec, dan Orange Juice",
      "Taburan bubuk cabai pedas di bibir gelas dengan racikan Mezcal, Cointreau, dan Lemon Juice",
      "Lapisan bubuk kayu manis di bibir gelas dengan racikan Bourbon Whisky, Triple Sec, dan Lime Juice"
    ],
    correctAnswer: "Lapisan garam halus (salt rim) di bibir gelas dengan racikan Tequila, Triple Sec, dan Lime Juice",
    explanation: "Margarita (80K) disajikan di gelas berkaki dengan bibir gelas yang dilapisi garam halus (salt rim), memadukan Tequila, Triple Sec, dan perasan jeruk nipis segar."
  },
  {
    id: "LC-BAR-12",
    category: "Bar & Cocktail",
    venue: "LuckyCat",
    question: "Apa saja 4 jenis minuman keras putih yang terdapat dalam cocktail \"Long Island\" (80K)?",
    options: [
      "Rum, Gin, Vodka, dan Tequila (ditambah Triple Sec, Lime Juice & Splash Cola)",
      "Vodka, Light Rum, White Whisky, dan Gin (ditambah Simple Syrup & Splash Cola)",
      "Rum, Vodka, Sambuca, dan Tequila (ditambah Blue Curacao & Splash Ginger Ale)",
      "Gin, Tequila, Vodka, dan Triple Sec (ditambah Sweet Vermouth & Splash Soda)"
    ],
    correctAnswer: "Rum, Gin, Vodka, dan Tequila (ditambah Triple Sec, Lime Juice & Splash Cola)",
    explanation: "Long Island Iced Tea (80K) mengandung kombinasi 4 white spirits utama: Vodka, Rum, Gin, Tequila, ditambah Triple Sec, perasan jeruk nipis, dan splash Coca-Cola."
  },

  // --- ARAK COCKTAIL ---
  {
    id: "LC-ARK-01",
    category: "Arak Cocktail",
    venue: "LuckyCat",
    question: "Varian cocktail arak lokal Bali yang memadukan Arak Bali dengan rasa Mangga Harum Manis bernama...",
    options: [
      "Mangga Ngangenin (100K)",
      "Asem Bikin Adem (100K)",
      "Beri Beri Ceria (100K)",
      "Si Kecut Manis (100K)"
    ],
    correctAnswer: "Mangga Ngangenin (100K)",
    explanation: "Mangga Ngangenin (100K) adalah cocktail arak LuckyCat dengan perpaduan arak Bali, pulp mangga harum manis, dan jus jeruk nipis."
  },
  {
    id: "LC-ARK-02",
    category: "Arak Cocktail",
    venue: "LuckyCat",
    question: "Arak Cocktail \"Beri Beri Ceria\" (100K) menyajikan perpaduan rasa apa?",
    options: [
      "Arak Bali pilihan dengan sari aneka buah beri merah (Mix Berry) asam manis segar",
      "Arak Bali pilihan dengan sari buah markisa tropis dan sentuhan sirup delima merah",
      "Arak Bali pilihan dengan perasan jeruk nipis segar dan madu hutan murni",
      "Arak Bali pilihan dengan sari apel hijau renyah dan sentuhan perasan lemon"
    ],
    correctAnswer: "Arak Bali pilihan dengan sari aneka buah beri merah (Mix Berry) asam manis segar",
    explanation: "Beri Beri Ceria (100K) adalah arak cocktail dengan perpaduan arak Bali pilihan dan sari aneka buah beri merah manis segar."
  },
  {
    id: "LC-ARK-03",
    category: "Arak Cocktail",
    venue: "LuckyCat",
    question: "Arak Cocktail \"Si Pahit Manja\" (100K) memiliki keunikan rasa karena memadukan Arak Bali dengan...",
    options: [
      "Seduhan fresh espresso shot pekat yang beraroma harum semerbak",
      "Seduhan teh hitam pekat earl grey dengan perasan lemon segar",
      "Campuran bitter liqueur herbal lokal dengan sentuhan kulit jeruk",
      "Ekstrak cokelat hitam murni 85% dengan sedikit simple syrup"
    ],
    correctAnswer: "Seduhan fresh espresso shot pekat yang beraroma harum semerbak",
    explanation: "Si Pahit Manja (100K) memadukan rasa arak Bali dengan keharuman dan kepahitan nikmat dari seduhan kopi espresso."
  },
  {
    id: "LC-ARK-04",
    category: "Arak Cocktail",
    venue: "LuckyCat",
    question: "Arak Cocktail \"Manis Merona\" (100K) dibuat dari perpaduan Arak Bali dengan rasa buah apa?",
    options: [
      "Buah Leci (Lychee Juice & Syrup) ditambah perasan lemon dan daun mint",
      "Buah Strawberry (Strawberry Puree) ditambah perasan jeruk nipis dan basil",
      "Buah Semangka (Watermelon Juice) ditambah rose syrup dan daun mint",
      "Buah Jambu Biji (Guava Juice) ditambah citric solution dan daun mint"
    ],
    correctAnswer: "Buah Leci (Lychee Juice & Syrup) ditambah perasan lemon dan daun mint",
    explanation: "Manis Merona / Arak Lychee (100K) memadukan arak Bali dengan sari buah leci manis harum, sirup leci, perasan lemon, dan mint."
  },
  {
    id: "LC-ARK-05",
    category: "Arak Cocktail",
    venue: "LuckyCat",
    question: "Arak Cocktail \"Si Kecut Manis\" (100K) memberikan sensasi rasa segar berkat kombinasi...",
    options: [
      "Arak Bali pilihan dengan rasa Apel segar dan perasan Lemon asam manis",
      "Arak Bali pilihan dengan rasa Nanas madu dan perasan Jeruk Nipis segar",
      "Arak Bali pilihan dengan rasa Sirsak manis dan sirup Asam Jawa aromatik",
      "Arak Bali pilihan dengan rasa Belimbing wuluh dan sirup Lemonade dingin"
    ],
    correctAnswer: "Arak Bali pilihan dengan rasa Apel segar dan perasan Lemon asam manis",
    explanation: "Si Kecut Manis (100K) memadukan kehangatan arak Bali dengan rasa buah apel renyah dan perasan lemon segar."
  },

  // --- BAR & MOCKTAIL ---
  {
    id: "LC-MCK-01",
    category: "Bar & Mocktail",
    venue: "LuckyCat",
    question: "Mocktail segar \"Sora Passion\" (38K) memiliki ciri khas rasa unik karena menggunakan campuran...",
    options: [
      "Passion Fruit (Markisa), Lemon Juice, dan irisan rempah kecombrang segar",
      "Passion Fruit (Markisa), Lime Juice, dan rempah daun kemangi aromatik",
      "Pineapple Juice, Lemon Juice, dan serutan batang serai wangi segar",
      "Orange Juice, Citric Solution, dan serpihan jahe merah bakar hangat"
    ],
    correctAnswer: "Passion Fruit (Markisa), Lemon Juice, dan irisan rempah kecombrang segar",
    explanation: "Sora Passion (38K) memadukan sirup markisa, perasan lemon segar, dan irisan bunga kecombrang aromatik khas nusantara."
  },
  {
    id: "LC-MCK-02",
    category: "Bar & Mocktail",
    venue: "LuckyCat",
    question: "Mocktail \"Blue Ocean\" (38K) dibuat dari kombinasi bahan segar apa saja?",
    options: [
      "Blue Citrus, Yakult, Orange Marmalade (Pineapple Jam), Lemon, dan Jelly Collagen",
      "Blue Curacao, Calpis Milk, Mango Jam, Lime Juice, dan Jelly Lidah Buaya",
      "Blue Citrus, Sprite Soda, Lychee Puree, Lemon Juice, dan Keping Nata de Coco",
      "Blue Curacao, Yogurt Drink, Strawberry Jam, Orange Juice, dan Jelly Cincau"
    ],
    correctAnswer: "Blue Citrus, Yakult, Orange Marmalade (Pineapple Jam), Lemon, dan Jelly Collagen",
    explanation: "Blue Ocean (38K) memadukan sirup blue citrus, Yakult, selai marmalade/nanas, perasan lemon, dan jelly kolagen kenyal."
  },
  {
    id: "LC-MCK-03",
    category: "Bar & Mocktail",
    venue: "LuckyCat",
    question: "Mocktail \"Frutti Tuti\" (38K) menyajikan rasa buah tropis kaya vitamin dengan paduan apa saja?",
    options: [
      "Guava (jambu), Nanas, Jeruk, Hazelnut Syrup, dan 1 scoop Lemon Sorbet dingin",
      "Semangka, Nanas, Jeruk, Vanilla Syrup, dan 1 scoop Vanilla Ice Cream dingin",
      "Mangga, Jambu, Jeruk Nipis, Caramel Syrup, dan 1 scoop Strawberry Sorbet",
      "Sirsak, Nanas, Lemon, Hazelnut Syrup, dan 1 scoop Coconut Ice Cream dingin"
    ],
    correctAnswer: "Guava (jambu), Nanas, Jeruk, Hazelnut Syrup, dan 1 scoop Lemon Sorbet dingin",
    explanation: "Frutti Tuti (38K) memadukan jus jambu biji, nanas segar, sari jeruk manis, aroma sirup hazelnut, dan diberi scoop sorbet lemon yang segar di atasnya."
  },
  {
    id: "LC-MCK-04",
    category: "Bar & Mocktail",
    venue: "LuckyCat",
    question: "Mocktail \"Coconut Mango\" (38K) memiliki tekstur creamy tropis berkat perpaduan...",
    options: [
      "Mango Syrup, Air Kelapa, Coconut Cream, Calpis Milkis, Mogu-Mogu Mango, dan biskuit O'Rice",
      "Mango Puree, Santan Murni, Susu UHT Segar, Nata de Coco Leci, dan wafer cokelat renyah",
      "Mango Juice, Air Kelapa Muda, Yogurt Drink, Selai Nanas Asam, dan biskuit O'Rice renyah",
      "Mango Syrup, Susu Evaporasi, Sari Kelapa Segar, Jelly Mangga Kenyal, dan biskuit Marie"
    ],
    correctAnswer: "Mango Syrup, Air Kelapa, Coconut Cream, Calpis Milkis, Mogu-Mogu Mango, dan biskuit O'Rice",
    explanation: "Coconut Mango (38K) memadukan sirup mangga manis, air kelapa segar, santan lembut, Calpis fermentasi, bulir Mogu-Mogu mangga, dan garnish biskuit beras O'Rice."
  },
  {
    id: "LC-MCK-05",
    category: "Bar & Mocktail",
    venue: "LuckyCat",
    question: "Mocktail baru \"Pinakara\" (38K) menyajikan sensasi rasa nanas karamel dengan topping istimewa apa?",
    options: [
      "Pineapple Juice, Caramel Syrup, Blue Citrus, Passion Puree, Mint Syrup, dan Cream Cheese lembut",
      "Pineapple Juice, Hazelnut Syrup, Blue Curacao, Lychee Puree, Lemon, dan Whipped Cream manis",
      "Pineapple Juice, Vanilla Syrup, Orange Marmalade, Mango Puree, Mint, dan taburan Keju Cheddar",
      "Pineapple Juice, Brown Sugar, Blue Citrus, Peach Puree, Soda Water, dan 1 scoop Lemon Sorbet"
    ],
    correctAnswer: "Pineapple Juice, Caramel Syrup, Blue Citrus, Passion Puree, Mint Syrup, dan Cream Cheese lembut",
    explanation: "Pinakara (38K) adalah mocktail signature baru dengan jus nanas, sirup karamel, blue citrus, markisa, mint, dan diberi lapisan cream cheese gurih di atasnya."
  },
  {
    id: "LC-MCK-06",
    category: "Bar & Mocktail",
    venue: "LuckyCat",
    question: "Mocktail \"Lychee Li Coco\" (38K) menyajikan kombinasi rasa unik antara...",
    options: [
      "Lychee Syrup, perisa Bubblegum, rasa Coconut, dan sentuhan aroma bubuk Matcha hijau",
      "Lychee Puree, sari Buah Sirsak, rasa Coconut Cream, dan sentuhan seduhan Kopi Hitam",
      "Lychee Syrup, perisa Cotton Candy, rasa Air Kelapa, dan sentuhan sirup Blue Curacao",
      "Lychee Puree, perisa Hazelnut, rasa Santan Gurih, dan sentuhan perasan Jeruk Nipis"
    ],
    correctAnswer: "Lychee Syrup, perisa Bubblegum, rasa Coconut, dan sentuhan aroma bubuk Matcha hijau",
    explanation: "Lychee Li Coco (38K) memadukan sirup leci manis harum, bubblegum, rasa kelapa segar, dan sentuhan bubuk matcha premium."
  },

  // --- BAR: KOPI & MINUMAN ---
  {
    id: "LC-COF-01",
    category: "Bar & Kopi",
    venue: "LuckyCat",
    question: "Kopi signature \"Moon Blanc\" (38K) di LuckyCat menyajikan perpaduan unik antara...",
    options: [
      "Double espresso pekat dengan sari buah jeruk manis segar (Orange Coffee)",
      "Single espresso pekat dengan sari buah kelapa muda segar (Coconut Coffee)",
      "Double espresso pekat dengan sirup buah leci manis harum (Lychee Coffee)",
      "Single espresso pekat dengan sari buah nanas madu segar (Pineapple Coffee)"
    ],
    correctAnswer: "Double espresso pekat dengan sari buah jeruk manis segar (Orange Coffee)",
    explanation: "Moon Blanc (38K) adalah orange coffee signature LuckyCat yang memadukan kepekatan espresso dengan sari buah jeruk manis segar."
  },
  {
    id: "LC-COF-02",
    category: "Bar & Kopi",
    venue: "LuckyCat",
    question: "Kopi \"Cheese Caramel Latte\" (38K) menyajikan kopi latte rasa karamel yang disajikan dengan...",
    options: [
      "Lapisan cream cheese (cheese foam) gurih lembut di bagian atasnya",
      "Taburan parutan keju cheddar kering berlimpah di bagian atasnya",
      "Lelehan saus keju manis panggang yang lumer di bagian atasnya",
      "Topping 1 scoop es krim vanilla bertabur bubuk keju parmesan"
    ],
    correctAnswer: "Lapisan cream cheese (cheese foam) gurih lembut di bagian atasnya",
    explanation: "Cheese Caramel Latte (38K) mengombinasikan espresso latte beralas sirup karamel manis legit dengan lapisan cream cheese gurih lembut di atasnya."
  },
  {
    id: "LC-COF-03",
    category: "Bar & Minuman",
    venue: "LuckyCat",
    question: "Minuman non-kopi \"Matcha Yakult\" (32K) menyajikan perpaduan segar antara...",
    options: [
      "Teh hijau Jepang (Matcha Latte) dengan fermentasi probiotik asam manis Yakult",
      "Teh hijau melati melati dingin dengan sari buah jeruk nipis dan sirup leci",
      "Matcha bubuk premium dengan susu kedelai tawar dingin dan simple syrup",
      "Teh hijau Jepang pekat dengan air kelapa muda segar dan selasih"
    ],
    correctAnswer: "Teh hijau Jepang (Matcha Latte) dengan fermentasi probiotik asam manis Yakult",
    explanation: "Matcha Yakult (32K) menyajikan teh hijau matcha berkualitas yang di-shake bersama minuman probiotik Yakult dingin yang asam manis segar."
  },

  // --- KITCHEN: RICE BOWL ---
  {
    id: "LC-KIT-01",
    category: "Kitchen & Makanan",
    venue: "LuckyCat",
    question: "Nasi apa yang digunakan sebagai standar dasar (basic) pada seluruh sajian Rice Bowl di LuckyCat, dan apa opsi yang dapat dipilih tamu?",
    options: [
      "Basic Nasi Putih pulen, namun tamu memiliki opsi untuk meng-upgrade ke Nasi Daun Jeruk",
      "Basic wajib Nasi Daun Jeruk harum, dan tamu tidak memiliki pilihan untuk mengganti nasi",
      "Basic Nasi Goreng Kampung gurih, dan tamu dapat meminta nasi putih jika tidak suka pedas",
      "Basic Nasi Gurih Santan Pandan, namun tamu dikenakan biaya jika ingin menambah porsi"
    ],
    correctAnswer: "Basic Nasi Putih pulen, namun tamu memiliki opsi untuk meng-upgrade ke Nasi Daun Jeruk",
    explanation: "Seluruh menu Rice Bowl di LuckyCat disajikan dengan basic Nasi Putih pulen, dan tamu memiliki opsi untuk upgrade ke Nasi Daun Jeruk gurih aromatik."
  },
  {
    id: "LC-KIT-02",
    category: "Kitchen & Makanan",
    venue: "LuckyCat",
    question: "Apa saja 5 varian menu Rice Bowl yang tersedia di LuckyCat?",
    options: [
      "Ayam Cabe Garam, Ayam Sambal Geprek, Ayam Telur Asin, Ayam Sambal Matah, dan Cumi Goreng Tepung Daun Jeruk",
      "Ayam Cabe Garam, Ayam Sambal Geprek, Ayam Saus Teriyaki, Ayam Sambal Ijo, dan Dori Goreng Tepung Asam Manis",
      "Ayam Bakar Madu, Ayam Sambal Matah, Ayam Saus Mentega, Sapi Lada Hitam, dan Cumi Goreng Saus Tiram",
      "Ayam Telur Asin, Ayam Krispi Keju, Ayam Sambal Geprek, Ayam Rica-Rica, dan Udang Goreng Tepung Mayonaise"
    ],
    correctAnswer: "Ayam Cabe Garam, Ayam Sambal Geprek, Ayam Telur Asin, Ayam Sambal Matah, dan Cumi Goreng Tepung Daun Jeruk",
    explanation: "LuckyCat memiliki 5 varian Rice Bowl: Ayam Cabe Garam (42K), Ayam Sambal Geprek (42K), Ayam Telur Asin (42K), Ayam Sambal Matah (45K), dan Cumi Goreng Tepung Daun Jeruk (45K)."
  },
  {
    id: "LC-KIT-03",
    category: "Kitchen & Makanan",
    venue: "LuckyCat",
    question: "Pada menu \"Rice Bowl Ayam Telur Asin (Salted Egg)\" (42K), bumbu aromatik khas apa yang ditumis bersama saus telur asin gurih?",
    options: [
      "Daun Kari (Curry Leaves) segar dan potongan cabai rawit merah",
      "Daun Kemangi segar dan potongan cabai rawit hijau",
      "Daun Jeruk purut iris dan cincangan batang serai wangi",
      "Daun Bawang perai iris dan taburan biji wijen sangrai"
    ],
    correctAnswer: "Daun Kari (Curry Leaves) segar dan potongan cabai rawit merah",
    explanation: "Saus salted egg LuckyCat dimasak harum dengan daun kari (curry leaves) segar dan irisan cabai rawit merah pedas gurih."
  },
  {
    id: "LC-KIT-04",
    category: "Kitchen & Makanan",
    venue: "LuckyCat",
    question: "Apa perbedaan metode pembuatan antara \"Sambal Geprek\" dan \"Sambal Matah\" di LuckyCat?",
    options: [
      "Sambal Geprek dimasak slow-cooking minyak panas & kemangi; Sambal Matah adalah sambal iris mentah serai & daun jeruk",
      "Sambal Geprek disajikan mentah segar terasi bakar; Sambal Matah ditumis matang dengan saus tomat dan bawang bombai",
      "Sambal Geprek diulek kasar dengan terasi dan tomat goreng; Sambal Matah direbus matang dengan air asam jawa dan gula",
      "Sambal Geprek memakai minyak wijen dan cabai hijau; Sambal Matah memakai minyak kelapa matang tanpa daun jeruk"
    ],
    correctAnswer: "Sambal Geprek dimasak slow-cooking minyak panas & kemangi; Sambal Matah adalah sambal iris mentah serai & daun jeruk",
    explanation: "Sambal Geprek dimasak matang perlahan (slow cooking) dengan minyak panas dan kemangi, sedangkan Sambal Matah adalah sambal iris mentah segar dengan irisan serai dan daun jeruk."
  },
  {
    id: "LC-KIT-05",
    category: "Kitchen & Makanan",
    venue: "LuckyCat",
    question: "Apa keistimewaan menu \"Rice Bowl Cumi Goreng Tepung Daun Jeruk\" (45K)?",
    options: [
      "Cumi goreng tepung renyah beraroma daun jeruk segar, disajikan dengan telur dan nasi",
      "Cumi bakar madu legit beraroma asap bakaran, disajikan dengan sambal terasi dan nasi",
      "Cumi tumis pedas bumbu cabai garam krispi, disajikan dengan acar mentimun dan nasi",
      "Cumi saus lada hitam pedas menyengat, disajikan dengan telur dadar iris dan nasi"
    ],
    correctAnswer: "Cumi goreng tepung renyah beraroma daun jeruk segar, disajikan dengan telur dan nasi",
    explanation: "Cumi Goreng Tepung Daun Jeruk (45K) menyajikan cumi goreng tepung renyah keemasan beraroma daun jeruk segar disajikan dengan telur dan nasi putih (bisa upgrade nasi daun jeruk)."
  },

  // --- KITCHEN: WESTERN & PASTA ---
  {
    id: "LC-KIT-06",
    category: "Kitchen & Western",
    venue: "LuckyCat",
    question: "Bagaimana komposisi dan penyajian pasta \"Spaghetti Chicken Parmigiana\" (45K)?",
    options: [
      "Spaghetti disajikan dengan dada ayam fillet krispi berlumur saus pomodoro/marinara dan lelehan keju mozzarella gurih",
      "Spaghetti disajikan dengan paha ayam panggang berlumur saus bolognese daging cincang dan taburan keju cheddar parut",
      "Spaghetti disajikan dengan potongan ayam rebus berlumur saus krim keju parmesan dan lelehan keju quick melt",
      "Spaghetti disajikan dengan ayam fillet goreng berlumur saus lada hitam gurih pedas dan taburan oregano kering"
    ],
    correctAnswer: "Spaghetti disajikan dengan dada ayam fillet krispi berlumur saus pomodoro/marinara dan lelehan keju mozzarella gurih",
    explanation: "Chicken Parmigiana (45K) menyajikan spaghetti dengan dada ayam renyah keemasan dibalut saus pomodoro asam manis gurih dan lelehan keju mozzarella panggang."
  },
  {
    id: "LC-KIT-07",
    category: "Kitchen & Western",
    venue: "LuckyCat",
    question: "Apa saja 2 pilihan topping protein untuk pasta \"Spaghetti Carbonara\" (55K) di LuckyCat?",
    options: [
      "Pilihan Daging Ayam (Smoked Chicken) atau Daging Sapi (Smoked Beef)",
      "Pilihan Daging Cumi (Calamari) atau Daging Udang Segar (Fresh Prawn)",
      "Pilihan Sosis Bratwurst Sapi atau Fillet Ikan Dori Crispy",
      "Pilihan Daging Cincang Bolognese atau Daging Ayam Taichan"
    ],
    correctAnswer: "Pilihan Daging Ayam (Smoked Chicken) atau Daging Sapi (Smoked Beef)",
    explanation: "Spaghetti Carbonara (55K) disajikan dalam saus krim carbonara gurih dengan pilihan smoked chicken atau smoked beef."
  },
  {
    id: "LC-KIT-08",
    category: "Kitchen & Western",
    venue: "LuckyCat",
    question: "Bumbu utama apa yang digunakan dalam pembuatan pasta klasik \"Spaghetti Aglio Olio with Prawn / Chicken\" (55K)?",
    options: [
      "Tumisan minyak zaitun (Olive Oil), bawang putih cincang, cabai kering (chili flakes), dan daun peterseli segar",
      "Tumisan mentega gurih (Butter), bawang bombai cincang, lada hitam tumbuk kasar, dan daun oregano kering",
      "Tumisan minyak kelapa, bawang merah iris, cabai rawit merah cincang, dan daun kemangi wangi segar",
      "Tumisan minyak wijen aromatik, bawang putih geprek, cabai bubuk paprika, dan taburan keju parmesan"
    ],
    correctAnswer: "Tumisan minyak zaitun (Olive Oil), bawang putih cincang, cabai kering (chili flakes), dan daun peterseli segar",
    explanation: "Aglio Olio (55K) adalah pasta klasik Italia yang ditumis harum dengan olive oil, bawang putih berlimpah, chili flakes pedas gurih, dan taburan parsley segar."
  },
  {
    id: "LC-KIT-09",
    category: "Kitchen & Western",
    venue: "LuckyCat",
    question: "Apa rasa dan karakteristik pasta \"Spaghetti Lemon Cream Chicken\" (55K)?",
    options: [
      "Saus krim gurih lembut dengan sentuhan rasa asam segar lemon juice yang menyeimbangkan rasa gurih daging ayam",
      "Saus keju cheddar pekat kental dengan aroma parutan kulit jeruk nipis dan taburan rempah oregano kering",
      "Saus krim tomat pomodoro asam manis dengan sentuhan air perasan jeruk lemon dan potongan dada ayam rebus",
      "Saus kaldu bening gurih berbumbu sari lemon segar, minyak zaitun extra virgin, dan potongan ayam fillet krispi"
    ],
    correctAnswer: "Saus krim gurih lembut dengan sentuhan rasa asam segar lemon juice yang menyeimbangkan rasa gurih daging ayam",
    explanation: "Lemon Cream Chicken (55K) adalah pasta signature baru dengan perpaduan saus krim gurih dan segarnya sari lemon yang tidak bikin eneg dipadu potongan ayam lembut."
  },
  {
    id: "LC-KIT-10",
    category: "Kitchen & Western",
    venue: "LuckyCat",
    question: "Standar penyajian pasta \"Spaghetti Truffle Mushroom Sauce\" (55K) disajikan dengan pendamping apa?",
    options: [
      "Saus jamur creamy kaya aroma minyak truffle mewah, taburan keju parmesan, dan 1 potong Garlic Bread renyah",
      "Saus jamur tiram gurih dengan tumisan minyak zaitun harum, keju mozzarella bakar, dan 1 porsi French Fries",
      "Saus krim jamur kancing kental dengan taburan oregano kering, keju cheddar parut, dan 2 potong Roti Tawar panggang",
      "Saus jamur shitake pedas manis dengan taburan peterseli cincang, keju edam serut, dan 1 potong Croissant renyah"
    ],
    correctAnswer: "Saus jamur creamy kaya aroma minyak truffle mewah, taburan keju parmesan, dan 1 potong Garlic Bread renyah",
    explanation: "Spaghetti Truffle Mushroom Sauce (55K) dimasak dengan saus jamur lembut, minyak truffle aromatik, keju parmesan, dan disajikan bersama Garlic Bread panggang renyah."
  },
  {
    id: "LC-KIT-11",
    category: "Kitchen & Western",
    venue: "LuckyCat",
    question: "Apa isian daging gulung dalam hidangan utama \"Chicken Gordon Bleu / Cordon Bleu\" (90K) di LuckyCat?",
    options: [
      "Fillet dada ayam gulung isi Smoked Beef dan lelehan Keju Mozzarella berbalut tepung roti krispi",
      "Fillet paha ayam gulung isi Sosis Sapi panggang dan Keju Cheddar leleh berbalut tepung terigu krispi",
      "Fillet dada ayam gulung isi Tumisan Jamur Kancing dan Keju Quick Melt berbalut tepung panir keemasan",
      "Fillet dada ayam gulung isi Daging Cincang Kornet dan Keju Parmesan parut berbalut adonan tepung basah"
    ],
    correctAnswer: "Fillet dada ayam gulung isi Smoked Beef dan lelehan Keju Mozzarella berbalut tepung roti krispi",
    explanation: "Chicken Cordon Bleu (90K) dibuat dari dada ayam fillet gulung isi smoked beef dan keju mozzarella leleh melimpah, dibalut tepung roti renyah keemasan disajikan dengan french fries."
  },

  // --- KITCHEN: NASI GORENG ---
  {
    id: "LC-NAS-01",
    category: "Kitchen & Nasi Goreng",
    venue: "LuckyCat",
    question: "Apa yang menjadi ciri khas dan aroma utama dari \"Nasi Goreng Cakalang\" (40K)?",
    options: [
      "Suwiran daging ikan cakalang asap khas Manado yang gurih dan beraroma smokey aromatik",
      "Potongan daging ikan cakalang goreng kering berbumbu balado cabai merah pedas menyengat",
      "Suwiran daging ikan tongkol rebus bumbu kuning yang gurih manis beraroma daun jeruk",
      "Cacahan daging ikan cakalang asin goreng gurih berpadu potongan cabai rawit hijau segar"
    ],
    correctAnswer: "Suwiran daging ikan cakalang asap khas Manado yang gurih dan beraroma smokey aromatik",
    explanation: "Nasi Goreng Cakalang (40K) dibuat dengan suwiran ikan cakalang asap gurih khas Sulawesi yang memberi aroma smokey khas."
  },
  {
    id: "LC-NAS-02",
    category: "Kitchen & Nasi Goreng",
    venue: "LuckyCat",
    question: "Bumbu rempah tradisional apa yang dominan pada menu \"Nasi Goreng Kampung\" (50K)?",
    options: [
      "Bumbu terasi bakar khas nusantara yang gurih medok disajikan dengan telur dan kerupuk",
      "Bumbu kencur ulek pedas segar khas Sunda disajikan dengan suwiran ayam dan lalapan",
      "Bumbu kunyit rempah rempah kari khas Melayu disajikan dengan acar nanas dan emping",
      "Bumbu kecap manis karamelisasi bawang merah disajikan dengan sosis sapi dan kerupuk"
    ],
    correctAnswer: "Bumbu terasi bakar khas nusantara yang gurih medok disajikan dengan telur dan kerupuk",
    explanation: "Nasi Goreng Kampung (50K) menonjolkan citarasa tradisional bumbu terasi bakar harum, bawang merah, cabai rawit, telur, dan kerupuk."
  },
  {
    id: "LC-NAS-03",
    category: "Kitchen & Nasi Goreng",
    venue: "LuckyCat",
    question: "Bagaimana penyajian \"Garlic Fried Rice with Chicken Teriyaki\" (50K)?",
    options: [
      "Nasi goreng harum bawang putih gurih disajikan dengan potongan paha ayam berbumbu saus teriyaki manis gurih",
      "Nasi goreng mentega gurih disajikan dengan dada ayam fillet krispi berbalut saus lada hitam pedas manis",
      "Nasi goreng kecap manis disajikan dengan sate taichan paha ayam berbumbu sambal jeruk nipis pedas gurih",
      "Nasi goreng kunyit harum disajikan dengan ayam panggang bumbu yakiniku khas Jepang bertabur wijen sangrai"
    ],
    correctAnswer: "Nasi goreng harum bawang putih gurih disajikan dengan potongan paha ayam berbumbu saus teriyaki manis gurih",
    explanation: "Garlic Fried Rice Chicken Teriyaki (50K) memadukan gurihnya nasi goreng bawang putih cincang dengan topping ayam fillet saus teriyaki Jepang manis gurih."
  },
  {
    id: "LC-NAS-04",
    category: "Kitchen & Nasi Goreng",
    venue: "LuckyCat",
    question: "Daging apa yang digunakan sebagai topping premium pada \"Garlic Fried Rice with Meltique Beef\" (75K)?",
    options: [
      "Daging sapi Meltique tenderloin/sirloin empuk dan juicy yang dipanggang sempurna",
      "Daging sapi Ribeye lokal potongan dadu tebal yang ditumis saus lada hitam gurih",
      "Daging iga sapi ungkep bumbu rempah bakar madu yang disuwir lembut beraroma asap",
      "Daging tenderloin sapi lokal pilihan yang digoreng krispi dengan balutan tepung roti"
    ],
    correctAnswer: "Daging sapi Meltique tenderloin/sirloin empuk dan juicy yang dipanggang sempurna",
    explanation: "Garlic Fried Rice with Meltique Beef (75K) menyajikan nasi goreng bawang putih lezat dengan potongan daging sapi meltique empuk juicy."
  },
  {
    id: "LC-NAS-05",
    category: "Kitchen & Nasi Goreng",
    venue: "LuckyCat",
    question: "Apa kelengkapan porsi menu signature \"Nasi Goreng Special Lucky Cat\" (65K)?",
    options: [
      "Nasi goreng istimewa disajikan lengkap dengan sate taichan, telur mata sapi, ayam goreng renyah, dan kerupuk",
      "Nasi goreng istimewa disajikan lengkap dengan sosis bratwurst bakar, telur dadar iris, ayam teriyaki, dan emping",
      "Nasi goreng istimewa disajikan lengkap dengan udang krispi, telur ceplok setengah matang, cumi asin, dan kerupuk",
      "Nasi goreng istimewa disajikan lengkap dengan potongan meltique beef, telur orak arik gurih, acar, dan kerupuk"
    ],
    correctAnswer: "Nasi goreng istimewa disajikan lengkap dengan sate taichan, telur mata sapi, ayam goreng renyah, dan kerupuk",
    explanation: "Nasi Goreng Special Lucky Cat (65K) adalah paket komplit istimewa dengan sate, telur, potongan ayam, dan kerupuk gurih."
  },

  // --- KITCHEN: MAIN COURSE & SOUP ---
  {
    id: "LC-MNC-01",
    category: "Kitchen & Main Course",
    venue: "LuckyCat",
    question: "Bagaimana pengolahan bumbu rempah pada menu \"Ayam Bakar Kemiri\" (42K)?",
    options: [
      "Ayam diungkep dengan bumbu kemiri medok, bawang putih, ketumbar, dan dibakar harum karamel",
      "Ayam diungkep dengan bumbu rujak santan cabai merah, serai, dan dibakar dengan olesan kecap asin",
      "Ayam dimarinasi dengan bumbu taliwang pedas kencur, terasi, dan dibakar dengan olesan minyak kelapa",
      "Ayam direbus bumbu kuning lengkuas kunyit, digoreng setengah matang, lalu dibakar olesan madu murni"
    ],
    correctAnswer: "Ayam diungkep dengan bumbu kemiri medok, bawang putih, ketumbar, dan dibakar harum karamel",
    explanation: "Ayam Bakar Kemiri (42K) dimasak dengan rempah kemiri berlimpah yang gurih medok meresap sampai ke serat daging ayam."
  },
  {
    id: "LC-MNC-02",
    category: "Kitchen & Main Course",
    venue: "LuckyCat",
    question: "Hidangan \"Ikan Dori Dabu-Dabu\" (60K) disajikan dengan sambal dabu-dabu segar khas Manado berbahan apa saja?",
    options: [
      "Potongan tomat segar, cabai rawit merah/hijau, irisan bawang merah, garam, dan perasan jeruk nipis segar",
      "Ulekan cabai rawit merah matang, bawang putih goreng, terasi bakar, gula merah kelapa, dan perasan jeruk limau",
      "Irisan batang serai wangi, daun jeruk purut muda, bawang merah mentah, cabai rawit, dan siraman minyak kelapa panas",
      "Rebusan tomat merah matang, cabai merah keriting, bawang merah, terasi udang sangrai, dan perasan asam jawa"
    ],
    correctAnswer: "Potongan tomat segar, cabai rawit merah/hijau, irisan bawang merah, garam, dan perasan jeruk nipis segar",
    explanation: "Sambal Dabu-Dabu khas Manado disajikan mentah segar dari potongan tomat merah/hijau dadu, cabai rawit, bawang merah, dan air jeruk nipis asam pedas segar."
  },
  {
    id: "LC-MNC-03",
    category: "Kitchen & Main Course",
    venue: "LuckyCat",
    question: "Apa saja kondimen pelengkap dalam menu hidangan \"Nasi Lemak Ayam\" (65K) di LuckyCat?",
    options: [
      "Nasi gurih santan pandan, ayam goreng rempah, telur rebus/ceplok, kacang tanah goreng, teri krispi, dan sambal melayu",
      "Nasi uduk santan gurih, ayam suwir kecap manis, telur balado pedas, tempe orek manis, kerupuk bawang, dan sambal bajak",
      "Nasi kuning kunyit wangi, ayam goreng lengkuas, telur dadar iris tipis, serundeng kelapa, emping goreng, dan sambal terasi",
      "Nasi putih daun salam, ayam kalasan manis, telur ceplok kecap, tahu tempe bacem goreng, kerupuk udang, dan sambal korek"
    ],
    correctAnswer: "Nasi gurih santan pandan, ayam goreng rempah, telur rebus/ceplok, kacang tanah goreng, teri krispi, dan sambal melayu",
    explanation: "Nasi Lemak Ayam (65K) disajikan otentik dengan nasi santan harum, ayam goreng bumbu rempah, telur, kacang tanah goreng renyah, ikan teri, dan sambal khas."
  },
  {
    id: "LC-MNC-04",
    category: "Kitchen & Main Course",
    venue: "LuckyCat",
    question: "Bagaimana karakteristik olahan menu \"Iga Bakar Madu\" (72K)?",
    options: [
      "Iga sapi empuk diungkep bumbu rempah lalu dipanggang dengan olesan saus madu manis legit gurih",
      "Iga sapi empuk direbus kuah asam pedas belimbing sayur lalu digoreng garing dengan saus kecap pedas",
      "Iga sapi pilihan diasap lambat lalu dipanggang dengan olesan saus barbeque lada hitam pedas menyengat",
      "Iga sapi ungkep bumbu rica-rica pedas lalu dipanggang dengan olesan minyak kemiri harum berempah"
    ],
    correctAnswer: "Iga sapi empuk diungkep bumbu rempah lalu dipanggang dengan olesan saus madu manis legit gurih",
    explanation: "Iga Bakar Madu (72K) menyajikan potongan iga sapi empuk yang dibakar dengan glasir madu murni manis gurih beraroma bakaran khas."
  },
  {
    id: "LC-MNC-05",
    category: "Kitchen & Soup",
    venue: "LuckyCat",
    question: "Apa isian dan kuah khas dari menu \"Soto Ayam\" (45K) di LuckyCat?",
    options: [
      "Kuah kaldu ayam kuning hangat rempah nusantara dengan suwiran ayam, soun, tauge, telur rebus, dan taburan koya gurih",
      "Kuah kaldu santan gurih kuning kental dengan potongan ayam kampung, bihun putih, kentang rebus, dan taburan bawang goreng",
      "Kuah bening rempah kapulaga dengan suwiran dada ayam panggang, kol iris, tomat segar, dan perasan jeruk limau segar",
      "Kuah asam pedas bening segar dengan potongan paha ayam empuk, daun seledri, wortel potong, dan kerupuk emping melinjo"
    ],
    correctAnswer: "Kuah kaldu ayam kuning hangat rempah nusantara dengan suwiran ayam, soun, tauge, telur rebus, dan taburan koya gurih",
    explanation: "Soto Ayam (45K) disajikan hangat dengan kuah kaldu rempah kuning sedap, suwiran ayam, soun, tauge segar, telur, dan koya gurih."
  },
  {
    id: "LC-MNC-06",
    category: "Kitchen & Soup",
    venue: "LuckyCat",
    question: "Karakteristik sup daging sapi \"Sop Iga\" (72K) dan \"Sop Buntut\" (90K) di LuckyCat menonjolkan aroma rempah apa?",
    options: [
      "Kuah kaldu sapi bening gurih kaya aroma rempah biji pala, kayu manis, dan cengkeh harum dengan wortel & kentang empuk",
      "Kuah kaldu santan kental berbumbu rempah kari jintan pedas tajam dengan potongan tomat merah, buncis, dan emping melinjo",
      "Kuah asam manis asam jawa segar berpadu irisan belimbing wuluh harum dengan potongan daging sapi, kol, dan daun bawang",
      "Kuah kaldu pekat bumbu keluwak hitam gurih medok dengan taburan taoge pendek segar, telur asin, dan sambal terasi matang"
    ],
    correctAnswer: "Kuah kaldu sapi bening gurih kaya aroma rempah biji pala, kayu manis, dan cengkeh harum dengan wortel & kentang empuk",
    explanation: "Sop Iga (72K) dan Sop Buntut (90K) menyajikan kaldu bening gurih aromatik kaya rempah pala dan cengkeh dengan daging iga/buntut sapi empuk dan sayuran."
  },

  // --- KITCHEN: SNACK, WINGS & ADD-ONS ---
  {
    id: "LC-SNK-01",
    category: "Kitchen & Snack",
    venue: "LuckyCat",
    question: "Berapa isi potongan dan varian apa saja yang terdapat pada camilan komplit \"Mix Platter\" (88K)?",
    options: [
      "Calamari cincin (5 pcs), Chicken Popcorn / Fillet Bites, Pangsit/Gyoza goreng (4 pcs), dan Crinkle Cut Fries renyah",
      "Chicken Wings saus manis (4 pcs), Sosis Bratwurst iris (4 pcs), Tahu Cabe Garam krispi, dan French Fries renyah",
      "Calamari cincin (8 pcs), Dori Popcorn renyah, Singkong Goreng rempah (4 pcs), dan Crinkle Cut Fries renyah",
      "Batagor goreng (4 pcs), Siomay kukus (4 pcs), Cireng bumbu rujak (6 pcs), dan French Fries kentang renyah"
    ],
    correctAnswer: "Calamari cincin (5 pcs), Chicken Popcorn / Fillet Bites, Pangsit/Gyoza goreng (4 pcs), dan Crinkle Cut Fries renyah",
    explanation: "Mix Platter (88K) adalah porsi besar sharing berisi 5 pcs Calamari, Chicken Fillet Bites, 4 pcs Pangsit/Gyoza goreng, dan kentang Crinkle Cut lengkap dengan cocolan saus."
  },
  {
    id: "LC-SNK-02",
    category: "Kitchen & Snack",
    venue: "LuckyCat",
    question: "Berapa pcs isi 1 porsi menu camilan \"Siomay / Batagor\" (35K) di LuckyCat dan apa saja pilihannya?",
    options: [
      "6 pcs per porsi (bisa pilih Siomay saja, Batagor saja, atau Mix 3 Siomay + 3 Batagor)",
      "5 pcs per porsi (bisa pilih Siomay saja, Batagor saja, atau Mix 2 Siomay + 3 Batagor)",
      "8 pcs per porsi (hanya tersedia pilihan campur 4 pcs Siomay kukus + 4 pcs Batagor goreng)",
      "6 pcs per porsi (wajib campur 3 pcs Siomay kukus + 3 pcs Batagor goreng tanpa opsi pisah)"
    ],
    correctAnswer: "6 pcs per porsi (bisa pilih Siomay saja, Batagor saja, atau Mix 3 Siomay + 3 Batagor)",
    explanation: "Porsi standar Siomay/Batagor adalah 6 pcs (bisa all siomay, all batagor, atau mix 3+3), disajikan dengan bumbu kacang homemade, sambal, dan jeruk limau."
  },
  {
    id: "LC-SNK-03",
    category: "Kitchen & Snack",
    venue: "LuckyCat",
    question: "Apa bahan utama saus cocolan untuk menu camilan favorit \"Cireng Bumbu Rujak\" seharga 18K?",
    options: [
      "Rebusan gula merah kelapa, air asam jawa asli, bawang putih cincang, dan cabai rawit pedas",
      "Saus sambal kacang tanah sangrai kental dengan air jeruk limau, kecap manis, dan cabai rawit",
      "Kecap manis gurih kental dipadu bawang merah iris mentah, cabai rawit hijau, dan perasan jeruk nipis",
      "Saus sambal bangkok asam manis kental dengan cincangan cabai merah, cuka makan, dan biji wijen"
    ],
    correctAnswer: "Rebusan gula merah kelapa, air asam jawa asli, bawang putih cincang, dan cabai rawit pedas",
    explanation: "Bumbu rujak cireng LuckyCat dibuat fresh dari rebusan air asam jawa kental, gula merah kelapa, bawang putih cincang, dan cabai rawit pedas asam manis menggugah selera."
  },
  {
    id: "LC-SNK-04",
    category: "Kitchen & Snack",
    venue: "LuckyCat",
    question: "Bagaimana karakteristik olahan menu camilan \"Tahu Cabe Garam\" (28K)?",
    options: [
      "Potongan tahu sutra goreng tepung krispi ditumis kering dengan cabai rawit merah iris, bawang putih cincang gurih, dan garam rempah",
      "Potongan tahu sutra goreng tepung dibalut saus telur asin basah gurih dengan tumisan daun kari aromatik dan irisan cabai rawit merah",
      "Potongan tahu sutra goreng krispi disiram bumbu rujak asam manis pedas gula merah kelapa dengan taburan cincangan kacang tanah",
      "Potongan tahu sutra goreng tepung ditumis basah dengan saus tiram gurih manis, irisan bawang bombai, dan potongan cabai merah besar"
    ],
    correctAnswer: "Potongan tahu sutra goreng tepung krispi ditumis kering dengan cabai rawit merah iris, bawang putih cincang gurih, dan garam rempah",
    explanation: "Tahu Cabe Garam (28K) menyajikan tahu goreng krispi luar lembut dalam yang ditumis kering dengan irisan cabai rawit pedas dan bawang putih cincang gurih melimpah."
  },
  {
    id: "LC-SNK-05",
    category: "Kitchen & Chicken Wings",
    venue: "LuckyCat",
    question: "Apa saja 4 varian saus resmi Chicken Wings yang tersedia di LuckyCat?",
    options: [
      "Original, Spicy Sauce, Bon Chon (Korean BBQ), dan Garlic Cheese",
      "Original, Honey Mustard, Barbeque Smoked, dan Blackpepper Cheese",
      "Original, Sweet Thai Chili, Bon Chon (Korean BBQ), dan Salted Egg",
      "Original, Spicy Buffalo, Teriyaki Glaze, dan Creamy Garlic Parmesan"
    ],
    correctAnswer: "Original, Spicy Sauce, Bon Chon (Korean BBQ), dan Garlic Cheese",
    explanation: "Varian resmi Chicken Wings LuckyCat: Original (35K), Spicy Sauce (45K), Bon Chon (50K), dan Garlic Cheese (53K)."
  },
  {
    id: "LC-ADN-01",
    category: "Kitchen & Add-Ons",
    venue: "LuckyCat",
    question: "Berapa harga tambahan per porsi untuk Add-On Nasi Daun Jeruk dan Nasi Putih di LuckyCat?",
    options: [
      "Rp 5.000 per porsi untuk masing-masing nasi",
      "Rp 8.000 per porsi untuk masing-masing nasi",
      "Rp 6.000 per porsi untuk masing-masing nasi",
      "Rp 10.000 per porsi untuk masing-masing nasi"
    ],
    correctAnswer: "Rp 5.000 per porsi untuk masing-masing nasi",
    explanation: "Tambahan Nasi Daun Jeruk maupun Nasi Putih dikenakan harga Rp 5.000 per porsi."
  },
  {
    id: "LC-ADN-02",
    category: "Kitchen & Add-Ons",
    venue: "LuckyCat",
    question: "Pilihan olahan telur apa saja yang dapat dipesan tamu sebagai Add-On seharga Rp 5.000?",
    options: [
      "Telur 1/2 matang, Telur Dadar biasa, atau Telur Mata Sapi (Ceplok)",
      "Telur Dadar Crispy gurih, Telur Rebus Utuh, atau Telur Orak-Arik",
      "Telur Mata Sapi (Ceplok), Telur Balado pedas, atau Telur Dadar Crispy",
      "Telur 1/2 matang, Telur Dadar Gulung keju, atau Telur Omelet Sayur"
    ],
    correctAnswer: "Telur 1/2 matang, Telur Dadar biasa, atau Telur Mata Sapi (Ceplok)",
    explanation: "Add-On telur seharga Rp 5.000 dapat dipesan dengan tingkat kematangan 1/2 matang, dadar biasa, atau mata sapi (ceplok). Tersedia juga varian Telur Dadar Crispy seharga Rp 8.000."
  },
  {
    id: "LC-ADN-03",
    category: "Kitchen & Add-Ons",
    venue: "LuckyCat",
    question: "Manakah Add-On ekstra berikut yang memiliki tarif harga Rp 8.000 per porsi di LuckyCat?",
    options: [
      "Extra Sambal Matah, Extra Sauce Keju, Extra Spaghetti, Extra Keju Parut, dan Telur Dadar Crispy",
      "Extra Nasi Daun Jeruk, Extra Nasi Putih, Extra Telur Dadar Biasa, dan Extra Telur Mata Sapi (Ceplok)",
      "Extra Sambal Matah, Extra Nasi Putih, Extra Sauce Keju, Extra Kerupuk Kaleng, dan Telur Mata Sapi",
      "Extra Spaghetti, Extra Keju Parut, Extra Nasi Daun Jeruk, Extra Acar Segar, dan Telur 1/2 Matang"
    ],
    correctAnswer: "Extra Sambal Matah, Extra Sauce Keju, Extra Spaghetti, Extra Keju Parut, dan Telur Dadar Crispy",
    explanation: "Item Add-on seharga Rp 8.000 meliputi: Extra Sambal Matah, Extra Sauce Keju, Extra Spaghetti, Extra Keju Parut, dan Telur Dadar Crispy."
  }
];

// Sanity check: Ensure every question has 4 options and the correct answer is in options
console.log(`Checking ${REVISED_QUIZ_BANK.length} revised questions...`);
let errCount = 0;
REVISED_QUIZ_BANK.forEach((q, idx) => {
  if (q.options.length !== 4) {
    console.error(`Question ${q.id} has ${q.options.length} options!`);
    errCount++;
  }
  if (!q.options.includes(q.correctAnswer)) {
    console.error(`Question ${q.id} correctAnswer is NOT in options!`);
    console.error(`Correct: "${q.correctAnswer}"`);
    console.error(`Options:`, q.options);
    errCount++;
  }
});

if (errCount > 0) {
  console.error(`Found ${errCount} errors! Fix before saving.`);
  process.exit(1);
}

// Generate new server/quizBank.js file
const fileHeader = `/**
 * LuckyCat Product Knowledge Quiz Question Bank
 * Thoroughly audited and aligned with:
 * - Update_Final_Menu.xlsx (0 RED ITEMS included)
 * - HPP_Kitchen_11_Nov_(Complete).xlsx (Exact ingredients & recipes)
 * - HPP_Bar_11_Nov_(Complete).xlsx (Exact beverage recipes & garnishes)
 * - Venue standards, management roster, and billiard equipment
 * - STRICT POLICY: NO HPP/cost numbers exposed to staff
 * - STRICT POLICY: Rice Bowl basic is NASI PUTIH with upgrade to Nasi Daun Jeruk
 * - PEDAGOGICAL STANDARD: Balanced option lengths, realistic & plausible distractors,
 *   preventing obvious elimination or guessing without actual product knowledge.
 */

export const LUCKYCAT_QUESTION_BANK = ${JSON.stringify(REVISED_QUIZ_BANK, null, 2)};

/**
 * Utility: Randomly sample N questions from question bank and shuffle options
 */
export function generateRandomWeeklyQuiz(count = 10, venue = 'LuckyCat') {
  const eligible = LUCKYCAT_QUESTION_BANK.filter(
    (q) => !venue || q.venue === venue || q.venue === 'ALL'
  );

  // Fisher-Yates shuffle array copy
  const shuffled = [...eligible].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, count);

  // For each question, shuffle its options so position A/B/C/D is unpredictable
  // STRICT ANTI-CHEAT: NEVER expose correctAnswer or explanation to client while taking quiz!
  return selected.map((q, idx) => {
    const shuffledOptions = [...q.options].sort(() => Math.random() - 0.5);
    return {
      index: idx + 1,
      id: q.id,
      category: q.category,
      question: q.question,
      options: shuffledOptions
    };
  });
}
`;

const targetPath = path.resolve('server/quizBank.js');
fs.writeFileSync(targetPath, fileHeader, 'utf-8');
console.log(`Successfully generated updated ${targetPath} with ${REVISED_QUIZ_BANK.length} balanced questions!`);
