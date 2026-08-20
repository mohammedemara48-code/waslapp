export const NEWS_TV = [
  { name: "الجزيرة", channel: "UCfiwzLy-8yKzIbsmZTzxDgw" },
  { name: "الجزيرة مباشر", channel: "UCSvndWKywa-8_q2pO2PiP0A" },
  { name: "العربية", channel: "UCahpxixMCwoANAftn6IxkTg" },
  { name: "سكاي نيوز عربية", channel: "UCIJXOvggjKtCagMfxvcCzAA" },
  { name: "إكسترا نيوز", channel: "UC65F33K2cXk9hGDbOQYhTOw" },
  { name: "النيل للأخبار", channel: "UCqNEIF-M6df1pAth2pUVFdQ" },
  { name: "ON", channel: "UCZghOmDezc6OCMzdPaL-j2Q" },
  { name: "DMC", channel: "UCEeFa7t5I0fqpcLGF-36TEw" },
  { name: "TEN", channel: "UChrHIeTNFl00eIUW4KdJBcw" },
  { name: "القناة الأولى", channel: "UCU2EMBWN2XnA4r3kha-EdJQ" },
];

export type RadioStation = { name: string; src: string; region: "مصر" | "عربي" };

export const RADIO_STATIONS: RadioStation[] = [
  { name: "الراديو 9090", src: "https://9090streaming.mobtada.com/9090FMEGYPT", region: "مصر" },
  { name: "إذاعة القرآن — تجويد", src: "https://backup.qurango.net/radio/tarateel", region: "عربي" },
  { name: "ماهر المعيقلي", src: "https://backup.qurango.net/radio/maher", region: "عربي" },
  { name: "ياسر الدوسري", src: "https://backup.qurango.net/radio/yasser_aldosari", region: "عربي" },
  { name: "أحمد العجمي", src: "https://backup.qurango.net/radio/ajmi", region: "عربي" },
  { name: "مونت كارلو الدولية", src: "https://montecarlodoualiya128k.ice.infomaniak.ch/mc-doualiya.mp3", region: "عربي" },
  { name: "بي بي سي عربي", src: "https://stream.live.vc.bbcmedia.co.uk/bbc_arabic_radio", region: "عربي" },
];
