// Yetki eşleştirmelerini kaydet
const permissionMap: Record<string, string> = {};

function shortName(name: string) {
    if (permissionMap[name]) {
        return permissionMap[name];
    }

    // Daha iyi bir hash algoritması kullanalım (FNV-1a)
    const FNV_PRIME = 0x01000193;
    const FNV_OFFSET_BASIS = 0x811c9dc5;

    let hash = FNV_OFFSET_BASIS;
    for (let i = 0; i < name.length; i++) {
        hash ^= name.charCodeAt(i);
        hash = Math.imul(hash, FNV_PRIME);
    }

    // Base36'ya çevir ve 4 karakter al
    const shortCode = Math.abs(hash).toString(36).slice(0, 4);
    permissionMap[name] = shortCode;
    return shortCode;
}

// Test için daha fazla kelime ekleyelim
const testWords = [
    // Orijinal kelimeler
    "pazarlama", "satış", "muhasebe", "maliye", "maliy",
    "personel", "ihracat", "import", "stok", "finans",
    "üretim", "kalite", "lojistik", "depo", "sevkiyat",
    "planlama", "ar-ge", "insan-kaynakları", "it", "güvenlik",
    "temizlik", "bakım", "yönetim", "hukuk", "satın-alma",
    "tedarik", "müşteri", "reklam", "sosyal-medya", "analiz",
    "raporlama", "denetim", "eğitim", "destek", "teknik",
    "operasyon",

    // Yeni eklemeler - 1
    "muayene", "laboratuvar", "test", "araştırma", "geliştirme",
    "proje", "tasarım", "grafik", "web", "mobil",
    "network", "sistem", "yazılım", "donanım", "bulut",
    "veri", "analitik", "istatistik", "rapor", "dashboard",
    "müşteri-ilişkileri", "crm", "erp", "scm", "hrm",
    "bütçe", "maliyet", "gelir", "gider", "fatura",
    "ödeme", "tahsilat", "borç", "alacak", "kasa",
    "banka", "kredi", "risk", "portföy", "yatırım",

    // Yeni eklemeler - 2
    "üretim-planlama", "kalite-kontrol", "bakım-onarım", "arge-proje",
    "satış-pazarlama", "bilgi-teknolojileri", "mali-işler",
    "hukuk-müşavirlik", "kurumsal-iletişim", "stratejik-planlama", "iç-denetim",
    "dış-ticaret", "tedarik-zinciri", "müşteri-hizmetleri", "teknik-servis",
    "sistem-yönetimi", "network-güvenlik", "veri-analizi", "proje-yönetimi",
    "süreç-geliştirme", "performans-yönetimi", "bütçe-planlama", "risk-yönetimi",
    "stok-yönetimi", "lojistik-planlama", "kalite-güvence",
    "ar-ge-inovasyon", "yazılım-geliştirme", "mobil-uygulama", "web-tasarım",

    // Yeni eklemeler - 3
    "finans-muhasebe", "üretim-kontrol", "satış-destek", "müşteri-takip",
    "personel-özlük", "eğitim-gelişim", "iş-güvenliği", "çevre-yönetimi",
    "kalite-sistem", "bakım-planlama", "üretim-takip", "stok-kontrol",
    "sevkiyat-planlama", "depo-yönetimi", "satın-alma-takip", "tedarikçi-yönetimi",
    "maliyet-analiz", "bütçe-kontrol", "proje-takip", "süreç-analiz",
    "performans-değerlendirme", "risk-analiz", "iç-kontrol", "dış-denetim",
    "sistem-analiz", "network-izleme", "veri-güvenlik", "uygulama-geliştirme",
    "web-güvenlik", "mobil-güvenlik", "api-yönetimi", "test-otomasyon"
];

const hashMap = new Map();
testWords.forEach(word => {
    const hash = shortName(word);
    if (hashMap.has(hash)) {
    } else {
        hashMap.set(hash, word);
    }
});


