/**
 * LuckyCat Product Knowledge Quiz Question Bank
 * Contains 45+ customer-facing questions covering:
 * - Table Setup & Billiard Equipment
 * - Floor Layout & Management
 * - Billiard Pricing & Package Deals
 * - Promos, Mixers & Happy Hours
 * - Birthday Packages & Upgrades
 * - Arisan Tournaments & Rules
 * - Bar & Signature Cocktails (Taste, ingredients, garnishes - NO HPP)
 * - Kitchen & Snack Standards (Standards, flavors, pairings - NO HPP)
 */

export const LUCKYCAT_QUESTION_BANK = [
  // --- 1. MANAGEMENT, BRAND & VENUE ---
  {
    id: 'LC-GEN-01',
    category: 'Manajemen & Brand',
    venue: 'LuckyCat',
    question: 'Siapakah Operational Manager dan Assistant Manager di LuckyCat saat ini?',
    options: [
      'Operational Manager: Ryan | Assistant Manager: Sherly & Ari',
      'Operational Manager: Ari | Assistant Manager: Ryan & Sherly',
      'Operational Manager: Sherly | Assistant Manager: Ryan & Anto',
      'Operational Manager: Ryan | Assistant Manager: Gery & Martha'
    ],
    correctAnswer: 'Operational Manager: Ryan | Assistant Manager: Sherly & Ari',
    explanation: 'Struktur manajemen operasional LuckyCat dipimpin oleh Ryan (Operational Manager) bersama Sherly dan Ari (Assistant Manager).'
  },
  {
    id: 'LC-GEN-02',
    category: 'Manajemen & Brand',
    venue: 'LuckyCat',
    question: 'Apa makna dan filosofi dari logo LuckyCat?',
    options: [
      'Kucing pembawa hoki & keberuntungan',
      'Kucing hitam misterius pelindung malam',
      'Kucing petarung tangguh',
      'Kucing santai penikmat kopi'
    ],
    correctAnswer: 'Kucing pembawa hoki & keberuntungan',
    explanation: 'Logo LuckyCat melambangkan kucing pembawa hoki (fortune cat) yang membawa rezeki dan keberuntungan bagi venue dan pelanggan.'
  },
  {
    id: 'LC-GEN-03',
    category: 'Layout Venue',
    venue: 'LuckyCat',
    question: 'Berapa jumlah total meja biliar reguler dan ruangan VIP yang ada di LuckyCat?',
    options: [
      '11 Regular Table dan 3 VIP Room',
      '10 Regular Table dan 2 VIP Room',
      '12 Regular Table dan 3 VIP Room',
      '14 Regular Table dan 4 VIP Room'
    ],
    correctAnswer: '11 Regular Table dan 3 VIP Room',
    explanation: 'LuckyCat memiliki total 11 meja biliar reguler di area floor utama dan 3 ruangan VIP privat.'
  },

  // --- 2. BILLIARD EQUIPMENT & TABLE STANDARDS ---
  {
    id: 'LC-EQP-01',
    category: 'Standar Meja',
    venue: 'LuckyCat',
    question: 'Perlengkapan apa sajakah yang WAJIB selalu tersedia lengkap di setiap meja biliar LuckyCat?',
    options: [
      'Triangle, Racking Paper, Bola, 2 Chalk, Break Cue, dan Bridge Cue',
      'Triangle, Racking Paper, Bola, 1 Chalk, dan Jump Cue',
      'Triangle, Bola, 1 Chalk, dan Sarung Tangan',
      'Racking Paper, Bola, Koin Meja, dan Break Cue'
    ],
    correctAnswer: 'Triangle, Racking Paper, Bola, 2 Chalk, Break Cue, dan Bridge Cue',
    explanation: 'Standar setup meja biliar LuckyCat wajib memiliki: Triangle, Racking Paper, 1 set bola biliar, 2 pcs chalk, Break Cue, dan Bridge Cue (stick bantu).'
  },
  {
    id: 'LC-EQP-02',
    category: 'Standar Meja',
    venue: 'LuckyCat',
    question: 'Berapa jumlah chalk biliar yang wajib disiapkan di setiap meja biliar sebelum tamu mulai bermain?',
    options: [
      '2 pcs chalk',
      '1 pcs chalk',
      '3 pcs chalk',
      '4 pcs chalk'
    ],
    correctAnswer: '2 pcs chalk',
    explanation: 'Setiap meja biliar LuckyCat wajib dilengkapi minimal 2 pcs chalk dalam kondisi siap pakai untuk kenyamanan pemain.'
  },
  {
    id: 'LC-EQP-03',
    category: 'Fasilitas & Loker',
    venue: 'LuckyCat',
    question: 'Berapa biaya sewa loker penyimpanan stick biliar untuk tamu?',
    options: [
      'Rp 50.000 / bulan atau Rp 100.000 / 3 bulan',
      'Rp 30.000 / bulan atau Rp 80.000 / 3 bulan',
      'Rp 75.000 / bulan atau Rp 150.000 / 3 bulan',
      'Gratis untuk semua tamu VIP'
    ],
    correctAnswer: 'Rp 50.000 / bulan atau Rp 100.000 / 3 bulan',
    explanation: 'Penyewaan loker penyimpanan biliar gear tersedia dengan harga Rp 50.000 per bulan atau paket hemat Rp 100.000 untuk 3 bulan.'
  },
  {
    id: 'LC-EQP-04',
    category: 'Fasilitas & Gear',
    venue: 'LuckyCat',
    question: 'Berapa harga termurah untuk aksesoris biliar (chalk, tips, sarung tangan, dll) di Shop Your Gear LuckyCat?',
    options: [
      'Mulai dari Rp 30.000',
      'Mulai dari Rp 15.000',
      'Mulai dari Rp 50.000',
      'Mulai dari Rp 75.000'
    ],
    correctAnswer: 'Mulai dari Rp 30.000',
    explanation: 'Aksesoris dan gear biliar (sarung tangan, chalk, tips, cue cases) tersedia mulai dari harga Rp 30.000.'
  },

  // --- 3. PRICELIST & TABLE PACKAGES ---
  {
    id: 'LC-PRC-01',
    category: 'Harga Meja',
    venue: 'LuckyCat',
    question: 'Berapa tarif sewa normal per jam untuk Regular Table dan VIP Table di LuckyCat?',
    options: [
      'Regular Table Rp 50.000/jam | VIP Table Rp 80.000/jam',
      'Regular Table Rp 40.000/jam | VIP Table Rp 70.000/jam',
      'Regular Table Rp 60.000/jam | VIP Table Rp 100.000/jam',
      'Regular Table Rp 50.000/jam | VIP Table Rp 120.000/jam'
    ],
    correctAnswer: 'Regular Table Rp 50.000/jam | VIP Table Rp 80.000/jam',
    explanation: 'Tarif sewa per jam normal adalah Rp 50.000/jam untuk meja reguler dan Rp 80.000/jam untuk meja VIP room.'
  },
  {
    id: 'LC-PRC-02',
    category: 'Promo Meja',
    venue: 'LuckyCat',
    question: 'Berapa minimal transaksi F&B (makanan & minuman) agar tamu mendapatkan GRATIS 1 jam sewa meja Regular?',
    options: [
      'Minimal spend Rp 300.000 F&B',
      'Minimal spend Rp 200.000 F&B',
      'Minimal spend Rp 250.000 F&B',
      'Minimal spend Rp 500.000 F&B'
    ],
    correctAnswer: 'Minimal spend Rp 300.000 F&B',
    explanation: 'Tamu yang melakukan pemesanan F&B minimal Rp 300.000 berhak mendapatkan gratis bermain 1 jam di meja Regular.'
  },
  {
    id: 'LC-PRC-03',
    category: 'Paket Meja',
    venue: 'LuckyCat',
    question: 'Pada jam siang (11:00 - 18:00), paket meja Regular apa yang tersedia seharga Rp 120.000?',
    options: [
      'Paket All You Can Play (Bebas main sepuasnya sampai jam 18:00)',
      'Paket 4 Jam + 2 Snack',
      'Paket Main 3 Jam + Free 1 Pitcher Es Teh',
      'Paket VIP Room 2 Jam'
    ],
    correctAnswer: 'Paket All You Can Play (Bebas main sepuasnya sampai jam 18:00)',
    explanation: 'Paket All You Can Play berlaku pukul 11:00 - 18:00 seharga Rp 120.000 untuk bermain sepuasnya di meja reguler.'
  },
  {
    id: 'LC-PRC-04',
    category: 'Paket Meja',
    venue: 'LuckyCat',
    question: 'Berapa harga paket VIP Table All Day selama 2 jam yang sudah termasuk 1 porsi snack?',
    options: [
      'Rp 150.000',
      'Rp 120.000',
      'Rp 180.000',
      'Rp 200.000'
    ],
    correctAnswer: 'Rp 150.000',
    explanation: 'Paket meja VIP All Day 2 jam + 1 snack seharga Rp 150.000 (sedangkan paket VIP 3 jam tanpa snack adalah Rp 200.000).'
  },
  {
    id: 'LC-PRC-05',
    category: 'Paket Meja',
    venue: 'LuckyCat',
    question: 'Pada jam malam (18:00 - 03:00), paket seharga Rp 100.000 di meja Regular mendapatkan apa?',
    options: [
      'Main 2 Jam + 1 Snack',
      'Main 3 Jam tanpa Snack',
      'Main 1 Jam + 2 Minuman',
      'All You Can Play malam'
    ],
    correctAnswer: 'Main 2 Jam + 1 Snack',
    explanation: 'Pada jam 18:00 - 03:00, paket Rp 100.000 memberikan tamu waktu bermain 2 jam plus 1 porsi snack.'
  },

  // --- 4. PROMOTIONS & HAPPY HOURS ---
  {
    id: 'LC-PRO-01',
    category: 'Promo Minuman',
    venue: 'LuckyCat',
    question: 'Kapan jam berlaku promo BUY 2 GET 1 FREE untuk seluruh Cocktail, Mocktail & Single Mixer di LuckyCat?',
    options: [
      'Pukul 23:00 - 03:00 WITA (11:00 PM - 03:00 AM)',
      'Pukul 19:00 - 23:00 WITA',
      'Pukul 17:00 - 21:00 WITA',
      'Sepanjang hari setiap hari Senin'
    ],
    correctAnswer: 'Pukul 23:00 - 03:00 WITA (11:00 PM - 03:00 AM)',
    explanation: 'Promo Buy 2 Get 1 Free berlaku larut malam (Late Night) dari pukul 23:00 WITA hingga 03:00 WITA (closing).'
  },
  {
    id: 'LC-PRO-02',
    category: 'Promo Minuman',
    venue: 'LuckyCat',
    question: 'Dalam promo "Mix It Like You Mean It", mixer gratis apa yang didapat saat membeli 1 botol Oro Tequila?',
    options: [
      'Gratis 2 botol Minute Maid Pulpy Orange',
      'Gratis 2 kaleng Coca-Cola',
      'Gratis 2 kaleng Tonic Water',
      'Gratis 2 kaleng Sprite'
    ],
    correctAnswer: 'Gratis 2 botol Minute Maid Pulpy Orange',
    explanation: 'Beli 1 botol Oro Tequila mendapatkan gratis 2 botol Pulpy Orange, sedangkan beli 1 botol Omrach Whiskey 700ml mendapatkan gratis 2 kaleng Coca-Cola.'
  },
  {
    id: 'LC-PRO-03',
    category: 'Promo Minuman',
    venue: 'LuckyCat',
    question: 'Dalam promo "Mix It Like You Mean It", mixer gratis apa yang didapat saat membeli 1 botol Omrach Whiskey 700ml?',
    options: [
      'Gratis 2 kaleng Coca-Cola',
      'Gratis 2 botol Pulpy Orange',
      'Gratis 2 kaleng Ginger Ale',
      'Gratis 1 kaleng Red Bull'
    ],
    correctAnswer: 'Gratis 2 kaleng Coca-Cola',
    explanation: 'Setiap pembelian 1 botol Omrach Whiskey 700ml otomatis mendapatkan 2 kaleng Coca-Cola gratis.'
  },
  {
    id: 'LC-PRO-04',
    category: 'Promo Minuman',
    venue: 'LuckyCat',
    question: 'Bagaimana ketentuan promo "Special Promo Jameson" di LuckyCat?',
    options: [
      'Single Bottle Rp 850.000, tambahan botol kedua hanya Rp 450.000',
      'Single Bottle Rp 800.000, tambahan botol kedua gratis',
      'Beli 2 botol langsung Rp 1.500.000',
      'Single Bottle Rp 900.000, diskon 20% untuk botol kedua'
    ],
    correctAnswer: 'Single Bottle Rp 850.000, tambahan botol kedua hanya Rp 450.000',
    explanation: 'Promo Jameson adalah Single Bottle Rp 850K, dan tamu dapat menambah 1 botol lagi hanya dengan menambah Rp 450K.'
  },
  {
    id: 'LC-PRO-05',
    category: 'Promo Minuman',
    venue: 'LuckyCat',
    question: 'Berapa harga per gelas untuk kategori Mocktail, Classic Cocktail, dan Signature Cocktail di LuckyCat?',
    options: [
      'Mocktail: 38K | Classic Cocktail: 80K | Signature Cocktail: 100K',
      'Mocktail: 35K | Classic Cocktail: 75K | Signature Cocktail: 95K',
      'Mocktail: 45K | Classic Cocktail: 85K | Signature Cocktail: 110K',
      'Mocktail: 30K | Classic Cocktail: 70K | Signature Cocktail: 90K'
    ],
    correctAnswer: 'Mocktail: 38K | Classic Cocktail: 80K | Signature Cocktail: 100K',
    explanation: 'Harga standar minuman LuckyCat: Mocktail Rp 38.000, Single Mixer Rp 80.000, Classic Cocktail Rp 80.000, dan Signature Cocktail Rp 100.000.'
  },

  // --- 5. BIRTHDAY PACKAGES ---
  {
    id: 'LC-BDY-01',
    category: 'Birthday Package',
    venue: 'LuckyCat',
    question: 'Berapa harga paket ulang tahun Regular Birthday Package dan VIP Birthday Package di LuckyCat?',
    options: [
      'Regular Birthday: Rp 438.000 | VIP Birthday: Rp 538.000',
      'Regular Birthday: Rp 400.000 | VIP Birthday: Rp 500.000',
      'Regular Birthday: Rp 450.000 | VIP Birthday: Rp 600.000',
      'Regular Birthday: Rp 538.000 | VIP Birthday: Rp 638.000'
    ],
    correctAnswer: 'Regular Birthday: Rp 438.000 | VIP Birthday: Rp 538.000',
    explanation: 'Paket ulang tahun LuckyCat: Regular Birthday Package seharga Rp 438K (2 jam meja regular) dan VIP Birthday Package seharga Rp 538K (2 jam VIP room).'
  },
  {
    id: 'LC-BDY-02',
    category: 'Birthday Package',
    venue: 'LuckyCat',
    question: 'Apa saja 6 item yang termasuk dalam paket Birthday Package (438K / 538K)?',
    options: [
      '2 Jam Meja, 2 Botol Arak / 2 Pitcher Es Teh, Chicken Wings, Mix Platter, Batagor Siomay, French Fries',
      '3 Jam Meja, 1 Botol Vodka, 2 Pizza, 1 Mix Platter',
      '2 Jam Meja, 4 Kaleng Bir, 1 Kue Ulang Tahun, 1 French Fries',
      '2 Jam Meja, Bebas pilih 4 Cocktail, 2 Porsi Nasi Goreng'
    ],
    correctAnswer: '2 Jam Meja, 2 Botol Arak / 2 Pitcher Es Teh, Chicken Wings, Mix Platter, Batagor Siomay, French Fries',
    explanation: 'Inklusi paket: 2 Jam Meja (Regular/VIP), Pilihan minuman (2 botol arak atau 2 pitcher lemon/lychee tea), Pilihan chicken wings, 1 Mix Platter, 1 porsi Batagor Siomay, dan 1 porsi French Fries.'
  },
  {
    id: 'LC-BDY-03',
    category: 'Birthday Package',
    venue: 'LuckyCat',
    question: 'Jika tamu Birthday Package ingin meng-upgrade minumannya ke Smirnoff Vodka, Captain Morgan, atau Batavia Whisky, berapa biaya tambahannya?',
    options: [
      '+ Rp 170.000',
      '+ Rp 150.000',
      '+ Rp 200.000',
      '+ Rp 250.000'
    ],
    correctAnswer: '+ Rp 170.000',
    explanation: 'Upgrade ke Smirnoff Vodka, Captain Morgan, atau Batavia Whisky hanya dikenakan biaya tambahan Rp 170.000.'
  },
  {
    id: 'LC-BDY-04',
    category: 'Birthday Package',
    venue: 'LuckyCat',
    question: 'Jika tamu Birthday Package ingin meng-upgrade minumannya ke Jameson, Maze-Maze, atau Absolut Vodka, berapa biaya tambahannya?',
    options: [
      '+ Rp 580.000',
      '+ Rp 450.000',
      '+ Rp 500.000',
      '+ Rp 650.000'
    ],
    correctAnswer: '+ Rp 580.000',
    explanation: 'Upgrade premium ke Jameson, Maze-Maze all variants, atau Absolut Vodka dikenakan biaya tambahan Rp 580.000.'
  },

  // --- 6. ARISAN & TOURNAMENTS ---
  {
    id: 'LC-ARS-01',
    category: 'Arisan & Turnamen',
    venue: 'LuckyCat',
    question: 'Kapan jadwal turnamen "Arisan" biliar mingguan diadakan di LuckyCat untuk kategori umum dan kategori wanita?',
    options: [
      'Kategori Umum: Setiap Jumat jam 19:00 | Kategori Wanita (Ladies Only): Setiap Senin jam 19:00',
      'Kategori Umum: Setiap Sabtu jam 20:00 | Kategori Wanita: Setiap Minggu jam 15:00',
      'Kategori Umum: Setiap Rabu jam 19:00 | Kategori Wanita: Setiap Kamis jam 19:00',
      'Keduanya diadakan bersamaan setiap hari Minggu jam 19:00'
    ],
    correctAnswer: 'Kategori Umum: Setiap Jumat jam 19:00 | Kategori Wanita (Ladies Only): Setiap Senin jam 19:00',
    explanation: 'Arisan Umum diadakan setiap Jumat jam 19:00 WITA, sedangkan Arisan Ladies Only diadakan setiap Senin jam 19:00 WITA.'
  },
  {
    id: 'LC-ARS-02',
    category: 'Arisan & Turnamen',
    venue: 'LuckyCat',
    question: 'Berapa biaya registrasi untuk mengikuti Arisan Biliar di LuckyCat?',
    options: [
      'Rp 50.000',
      'Rp 35.000',
      'Rp 75.000',
      'Rp 100.000'
    ],
    correctAnswer: 'Rp 50.000',
    explanation: 'Biaya pendaftaran Arisan Biliar (baik hari Senin Ladies Only maupun Jumat Umum) adalah Rp 50.000 per peserta.'
  },
  {
    id: 'LC-ARS-03',
    category: 'Arisan & Turnamen',
    venue: 'LuckyCat',
    question: 'Manakah dari aturan pertandingan Arisan Biliar LuckyCat berikut yang BENAR?',
    options: [
      'Game 9-Ball OTS, Race to 3, Voor System by Handicap, Golden Break TIDAK diperbolehkan',
      'Game 8-Ball, Race to 5, Golden Break bebas diperbolehkan',
      'Game 10-Ball, Sistem gugur ganda (Double Elimination)',
      'Game 9-Ball, Bebas break tanpa sistem voor'
    ],
    correctAnswer: 'Game 9-Ball OTS, Race to 3, Voor System by Handicap, Golden Break TIDAK diperbolehkan',
    explanation: 'Aturan resmi Arisan LuckyCat: 9-Ball OTS, Race to 3, Voor System by Handicap, Alternate Break, Single Elimination, dan Golden Break NOT ALLOWED.'
  },

  // --- 7. BAR, COCKTAIL & DRINKS ---
  {
    id: 'LC-BAR-01',
    category: 'Bar & Cocktail',
    venue: 'LuckyCat',
    question: 'Tamu menanyakan Signature Cocktail "Cane and Root". Apa keunikan rasa dan penyajiannya?',
    options: [
      'Campuran Dark Rum, Sarsaparilla, Vanilla, dan disajikan dengan topping es krim Cornetto Vanilla',
      'Campuran Vodka, Jus Mangga, dan disajikan dengan taburan bubuk cabai',
      'Campuran Gin dan Jus Semangka dengan garnish daun mint',
      'Campuran Kopi Espresso dan Rum dengan lapisan busa tebal'
    ],
    correctAnswer: 'Campuran Dark Rum, Sarsaparilla, Vanilla, dan disajikan dengan topping es krim Cornetto Vanilla',
    explanation: 'Cane and Root (100K) menyajikan Dark Rum Myers, sarsaparilla, sirup vanila, dan diberi 1 pcs es krim Cornetto Vanilla di atasnya.'
  },
  {
    id: 'LC-BAR-02',
    category: 'Bar & Cocktail',
    venue: 'LuckyCat',
    question: 'Bahan dasar dan rasa utama dari Signature Cocktail "Melon Muse" adalah...',
    options: [
      'Vodka, Melon Liqueur, Triple Sec, Lemon, dan sari bulir Mogu-Mogu Melon segar',
      'Rum, Santan, dan Jus Nanas segar',
      'Gin, Sirup Mawar, dan Semangka beku',
      'Tequila, Jus Jeruk, dan Sirup Delima'
    ],
    correctAnswer: 'Vodka, Melon Liqueur, Triple Sec, Lemon, dan sari bulir Mogu-Mogu Melon segar',
    explanation: 'Melon Muse (100K) memadukan Vodka, Melon Liqueur, Triple Sec, lemon juice, dan bulir nata de coco Mogu-Mogu Melon yang manis segar.'
  },
  {
    id: 'LC-BAR-03',
    category: 'Bar & Cocktail',
    venue: 'LuckyCat',
    question: 'Signature Cocktail "High Watermelon" dibuat dari campuran apa?',
    options: [
      'Gin, Semangka segar (Watermelon), Rose Syrup, Lemon Juice, dan Mint Leaf',
      'Vodka, Jus Melon, dan Soda Water',
      'Rum, Sirup Karamel, dan Potongan Nanas',
      'Tequila, Sirup Markisa, dan Jeruk Nipis'
    ],
    correctAnswer: 'Gin, Semangka segar (Watermelon), Rose Syrup, Lemon Juice, dan Mint Leaf',
    explanation: 'High Watermelon (100K) memadukan Gin, semangka segar yang dihancurkan, rose syrup, perasan lemon, dan daun mint.'
  },
  {
    id: 'LC-BAR-04',
    category: 'Bar & Cocktail',
    venue: 'LuckyCat',
    question: 'Tamu memesan cocktail klasik "Negroni". Apa saja 3 komposisi utamanya?',
    options: [
      'Gin, Campari, dan Sweet Vermouth',
      'Vodka, Kahlua, dan Espresso',
      'Rum, Gula Pasir, dan Air Soda',
      'Tequila, Triple Sec, dan Lime Juice'
    ],
    correctAnswer: 'Gin, Campari, dan Sweet Vermouth',
    explanation: 'Negroni (80K) adalah classic cocktail dengan perpaduan seimbang antara Gin, Campari (bitter red liqueur), dan Sweet Vermouth.'
  },
  {
    id: 'LC-BAR-05',
    category: 'Bar & Cocktail',
    venue: 'LuckyCat',
    question: 'Varian cocktail arak lokal Bali yang memadukan Arak Bali dengan rasa Mangga Harum Manis bernama...',
    options: [
      'Mangga Ngangenin',
      'Asem Bikin Adem',
      'Beri Beri Ceria',
      'Si Kecut Manis'
    ],
    correctAnswer: 'Mangga Ngangenin',
    explanation: 'Mangga Ngangenin (100K) adalah cocktail arak LuckyCat dengan perpaduan arak Bali, pulp mangga harum manis, dan jus jeruk nipis.'
  },
  {
    id: 'LC-BAR-06',
    category: 'Bar & Mocktail',
    venue: 'LuckyCat',
    question: 'Mocktail segar "Sora Passion" memiliki ciri khas rasa unik karena menggunakan campuran...',
    options: [
      'Passion Fruit (Markisa), Lemon, dan rempah kecombrang segar',
      'Jus Sirsak dan santan kelapa kental',
      'Blue citrus dan Yakult fermentasi',
      'Jus Jambu dan sirup hazelnut'
    ],
    correctAnswer: 'Passion Fruit (Markisa), Lemon, dan rempah kecombrang segar',
    explanation: 'Sora Passion (38K) memadukan sirup markisa, perasan lemon segar, dan irisan bunga kecombrang aromatik khas nusantara.'
  },
  {
    id: 'LC-BAR-07',
    category: 'Bar & Mocktail',
    venue: 'LuckyCat',
    question: 'Mocktail "Blue Ocean" dibuat dari kombinasi bahan segar apa?',
    options: [
      'Blue Citrus, Yakult, Orange Marmalade (Pineapple Jam), Lemon, dan Jelly Collagen',
      'Sirup Melon, Susu Segar, dan Biji Selasih',
      'Jus Alpukat, Kopi Espresso, dan Saus Coklat',
      'Air Kelapa, Sirup Pandan, dan Daging Durian'
    ],
    correctAnswer: 'Blue Citrus, Yakult, Orange Marmalade (Pineapple Jam), Lemon, dan Jelly Collagen',
    explanation: 'Blue Ocean (38K) memadukan sirup blue citrus, Yakult, selai marmalade/nanas, perasan lemon, dan jelly kolagen kenyal.'
  },

  // --- 8. KITCHEN & FOOD STANDARDS ---
  {
    id: 'LC-KIT-01',
    category: 'Kitchen & Makanan',
    venue: 'LuckyCat',
    question: 'Nasi apa yang digunakan sebagai standar dasar pada seluruh varian Rice Bowl di LuckyCat?',
    options: [
      'Nasi Daun Jeruk (harum mentega dan daun jeruk)',
      'Nasi Putih polos biasa',
      'Nasi Goreng Kampung',
      'Nasi Liwet santan'
    ],
    correctAnswer: 'Nasi Daun Jeruk (harum mentega dan daun jeruk)',
    explanation: 'Seluruh sajian Rice Bowl LuckyCat (Ayam Telur Asin, Sambal Geprek, Sambal Matah, Cabe Garam, Cumi) disajikan dengan Nasi Daun Jeruk gurih.'
  },
  {
    id: 'LC-KIT-02',
    category: 'Kitchen & Makanan',
    venue: 'LuckyCat',
    question: 'Apa perbedaan metode pembuatan antara "Sambal Geprek" dan "Sambal Matah" di LuckyCat?',
    options: [
      'Sambal Geprek dimasak slow-cooking dengan kemangi, Sambal Matah disajikan mentah segar dengan irisan sereh & daun jeruk',
      'Sambal Geprek disajikan mentah tanpa minyak, Sambal Matah digoreng sampai hitam',
      'Sambal Geprek memakai kecap manis, Sambal Matah memakai cuka beras',
      'Keduanya sama-sama direbus dan diblender halus'
    ],
    correctAnswer: 'Sambal Geprek dimasak slow-cooking dengan kemangi, Sambal Matah disajikan mentah segar dengan irisan sereh & daun jeruk',
    explanation: 'Sambal Geprek dimasak perlahan (slow cooking) dengan minyak panas dan daun kemangi, sedangkan Sambal Matah adalah sambal iris mentah dengan minyak kelapa/suhu normal.'
  },
  {
    id: 'LC-KIT-03',
    category: 'Kitchen & Makanan',
    venue: 'LuckyCat',
    question: 'Berapa isi potongan dan varian apa saja yang terdapat pada menu camilan "Mix Platter" seharga 88K?',
    options: [
      'Calamari (5 pcs), Chicken Finger, Pangsit/Gyoza (4 pcs), dan Crinkle Cut Fries',
      'Sayap ayam 12 pcs dengan 3 varian saus',
      'Sosis bakar 4 pcs, Tahu cabe garam, dan Keripik singkong',
      'Cireng 10 pcs, Batagor 4 pcs, dan Siomay 4 pcs'
    ],
    correctAnswer: 'Calamari (5 pcs), Chicken Finger, Pangsit/Gyoza (4 pcs), dan Crinkle Cut Fries',
    explanation: 'Mix Platter LuckyCat berisi 5 pcs Calamari cincin, 1 porsi Chicken Finger, 4 pcs Pangsit/Gyoza goreng, dan kentang Crinkle Cut renyah disajikan dengan saos sambal & saos bangkok.'
  },
  {
    id: 'LC-KIT-04',
    category: 'Kitchen & Makanan',
    venue: 'LuckyCat',
    question: 'Apa saja varian rasa saus Chicken Wings yang tersedia di LuckyCat?',
    options: [
      'Spicy Sauce, Lemon Pepper, Garlic Cheese, Original, Bonchon, Barbeque, dan Nashville',
      'Hanya Original dan Sambal Tomat',
      'Saus Tiram, Saus Asam Manis, dan Balado',
      'Saus Kari, Rendang, dan Blackpepper'
    ],
    correctAnswer: 'Spicy Sauce, Lemon Pepper, Garlic Cheese, Original, Bonchon, Barbeque, dan Nashville',
    explanation: 'Pilihan saus Chicken Wings LuckyCat sangat variatif: Spicy Sauce, Lemon Pepper, Garlic Cheese, Original, Bonchon (Korean BBQ), BBQ Smoky, dan Nashville.'
  },
  {
    id: 'LC-KIT-05',
    category: 'Kitchen & Makanan',
    venue: 'LuckyCat',
    question: 'Apa ciri khas isian roti lapis khas Vietnam "Banh Mi" di LuckyCat?',
    options: [
      'Roti baguette renyah isi daging/ayam, acar wortel-lobak julienne, timun jepang, daun ketumbar (coriander), dan saos khusus',
      'Roti tawar bakar isi keju cheddar dan selai coklat',
      'Roti burger isi patty sapi dan mayonaise manis',
      'Roti canai isi kuah kari kambing'
    ],
    correctAnswer: 'Roti baguette renyah isi daging/ayam, acar wortel-lobak julienne, timun jepang, daun ketumbar (coriander), dan saos khusus',
    explanation: 'Banh Mi LuckyCat (Chicken / Beef) dipanggang renyah di oven, diisi ayam/beef marinasi, acar wortel-lobak julienne fermentasi, timun jepang, dan daun ketumbar aromatik.'
  },
  {
    id: 'LC-KIT-06',
    category: 'Kitchen & Makanan',
    venue: 'LuckyCat',
    question: 'Tamu memesan pizza "Quatro Formagi" (85K). Apa keistimewaan topping pizza ini?',
    options: [
      'Kombinasi 4 jenis keju mewah: Mozzarella, Parmesan, Cheddar, dan Mascarpone Cheese',
      'Isi 4 jenis daging sapi olahan',
      'Isi 4 jenis seafood (udang, cumi, tuna, salmon)',
      'Pizza manis dengan 4 jenis coklat import'
    ],
    correctAnswer: 'Kombinasi 4 jenis keju mewah: Mozzarella, Parmesan, Cheddar, dan Mascarpone Cheese',
    explanation: 'Quatro Formagi adalah pizza Italia klasik yang memadukan 4 varian keju kaya rasa: Mozzarella leleh, Parmesan gurih, Cheddar, dan Mascarpone lembut.'
  },
  {
    id: 'LC-KIT-07',
    category: 'Kitchen & Makanan',
    venue: 'LuckyCat',
    question: 'Berapa pcs isi 1 porsi menu camilan Siomay / Batagor di LuckyCat?',
    options: [
      '6 pcs per porsi (bisa pilih Siomay saja, Batagor saja, atau Mix 3 Siomay + 3 Batagor)',
      '4 pcs per porsi',
      '8 pcs per porsi',
      '10 pcs per porsi'
    ],
    correctAnswer: '6 pcs per porsi (bisa pilih Siomay saja, Batagor saja, atau Mix 3 Siomay + 3 Batagor)',
    explanation: 'Porsi standar Siomay/Batagor adalah 6 pcs, lengkap dengan bumbu kacang homemade, sambal dimsum, jeruk limau, dan selada.'
  },
  {
    id: 'LC-KIT-08',
    category: 'Kitchen & Makanan',
    venue: 'LuckyCat',
    question: 'Apa bahan utama saus cocolan untuk menu camilan "Cireng Bumbu Rujak" seharga 18K?',
    options: [
      'Gula merah, asam jawa asli, bawang putih, dan cabe rawit merah',
      'Kecap manis campur cabe rawit saja',
      'Saus tomat dan mayonaise botolan',
      'Sambal kacang ulek kental'
    ],
    correctAnswer: 'Gula merah, asam jawa asli, bawang putih, dan cabe rawit merah',
    explanation: 'Sambal rujak cireng LuckyCat dibuat fresh dari rebusan air asam jawa kental, gula merah/kelapa, bawang putih cincang, dan cabe rawit merah pedas.'
  },
  {
    id: 'LC-KIT-09',
    category: 'Kitchen & Makanan',
    venue: 'LuckyCat',
    question: 'Bagaimana standar penyajian menu pasta "Spaghetti Truffle Mushroom Sauce" seharga 55K?',
    options: [
      'Spaghetti rebus dengan saos jamur champignon & tiram, keju parmesan, minyak truffle asli, dan disajikan dengan Garlic Bread',
      'Spaghetti kuah pedas dengan potongan ayam bakar',
      'Spaghetti goreng kering dengan taburan bubuk keju',
      'Spaghetti dengan saos bolognaise daging giling'
    ],
    correctAnswer: 'Spaghetti rebus dengan saos jamur champignon & tiram, keju parmesan, minyak truffle asli, dan disajikan dengan Garlic Bread',
    explanation: 'Spaghetti Truffle Mushroom Sauce dimasak dengan saus jamur lembut, taburan keju parmesan, aroma minyak truffle premium, dan pendamping 1 potong Garlic Bread renyah.'
  },
  {
    id: 'LC-KIT-10',
    category: 'Kitchen & Makanan',
    venue: 'LuckyCat',
    question: 'Siapakah Head Chef di kitchen LuckyCat saat ini?',
    options: [
      'Anto Suranto',
      'Martha Andi Wijaya',
      'Achmad Fazrin Febialdo (Edo)',
      'Ulul Albab'
    ],
    correctAnswer: 'Anto Suranto',
    explanation: 'Kitchen LuckyCat dipimpin oleh Anto Suranto sebagai Head Chef bersama para juru masak dan tim helper cook.'
  }
];

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
  return selected.map((q, idx) => {
    const shuffledOptions = [...q.options].sort(() => Math.random() - 0.5);
    return {
      index: idx + 1,
      id: q.id,
      category: q.category,
      question: q.question,
      options: shuffledOptions,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation
    };
  });
}
