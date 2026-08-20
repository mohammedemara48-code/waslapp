export type Locale = "ar" | "en" | "ur";

export type Dict = {
  brand: string;
  nav_home: string;
  nav_rooms: string;
  nav_messages: string;
  nav_stories: string;
  nav_friends: string;
  nav_me: string;
  nav_games: string;
  nav_broadcast: string;
  nav_admin: string;
  language: string;
  profile: string;
  logout: string;
  account: string;
  landing_kicker: string;
  landing_title: string;
  landing_sub: string;
  login_google: string;
  login_phone: string;
  signup: string;
  signin: string;
  phone: string;
  password: string;
  username: string;
  nickname: string;
  saved_accounts: string;
  enter_password: string;
  error_login: string;
  google_tab: string;
  start_here: string;
  google_fast: string;
  opening: string;
  new_account: string;
  create_account: string;
  saving: string;
  feed_title: string;
  rooms_title: string;
  messages_title: string;
  stories_title: string;
  friends_title: string;
  me_title: string;
  games_title: string;
  broadcast_title: string;
  tools_points: string;
  tv: string;
  radio: string;
  search: string;
  call_audio: string;
  call_video: string;
  shortcuts: string;
};

export const LOCALES: { id: Locale; label: string; dir: "rtl" | "ltr" }[] = [
  { id: "ar", label: "العربية", dir: "rtl" },
  { id: "en", label: "English", dir: "ltr" },
  { id: "ur", label: "اردو", dir: "rtl" },
];

export const dictionaries: Record<Locale, Dict> = {
  ar: {
    brand: "وصل",
    nav_home: "الرئيسية",
    nav_rooms: "الغرف",
    nav_messages: "الخاصة",
    nav_stories: "القصص",
    nav_friends: "الأصدقاء",
    nav_me: "حسابي",
    nav_games: "الألعاب",
    nav_broadcast: "تلفاز وراديو",
    nav_admin: "إدارة التطبيق",
    language: "اللغة",
    profile: "ملفي",
    logout: "خروج",
    account: "حساب",
    landing_kicker: "تواصل مباشر، بلا ضجيج",
    landing_title: "غرف هادئة لصوت أوضح",
    landing_sub: "ادخل بجوجل أو برقم جوالك، أضف أصدقاء، انشر قصة، وأرسل هدية داخل غرفة هادئة.",
    login_google: "المتابعة عبر جوجل",
    login_phone: "رقم الجوال",
    signup: "إنشاء الحساب",
    signin: "دخول",
    phone: "رقم الجوال",
    password: "كلمة السر",
    username: "اسم المستخدم",
    nickname: "الاسم المستعار",
    saved_accounts: "حسابات محفوظة على هذا الجهاز",
    enter_password: "أدخل كلمة السر ثم اضغط دخول",
    error_login: "تعذر تسجيل الدخول",
    google_tab: "جوجل",
    start_here: "ابدأ من هنا",
    google_fast: "أسرع دخول عبر حساب جوجل.",
    opening: "جارٍ الفتح…",
    new_account: "حساب جديد",
    create_account: "إنشاء الحساب",
    saving: "جارٍ الحفظ…",
    feed_title: "الخط الزمني",
    rooms_title: "الغرف",
    messages_title: "المحادثات الخاصة",
    stories_title: "القصص",
    friends_title: "الأصدقاء",
    me_title: "حسابي",
    games_title: "الألعاب",
    broadcast_title: "التلفاز والراديو",
    tools_points: "رصيدك",
    tv: "التلفاز",
    radio: "الراديو",
    search: "بحث",
    call_audio: "صوت",
    call_video: "فيديو",
    shortcuts: "اختصارات وصل",
  },
  en: {
    brand: "Wasl",
    nav_home: "Home",
    nav_rooms: "Rooms",
    nav_messages: "Chats",
    nav_stories: "Stories",
    nav_friends: "Friends",
    nav_me: "Me",
    nav_games: "Games",
    nav_broadcast: "TV & Radio",
    nav_admin: "Admin",
    language: "Language",
    profile: "Profile",
    logout: "Sign out",
    account: "Account",
    landing_kicker: "Direct connection, no noise",
    landing_title: "Quiet rooms. Clearer voice.",
    landing_sub: "Sign in with Google or your phone, add friends, post a story, and send a gift in a calm room.",
    login_google: "Continue with Google",
    login_phone: "Phone number",
    signup: "Create account",
    signin: "Sign in",
    phone: "Phone number",
    password: "Password",
    username: "Username",
    nickname: "Display name",
    saved_accounts: "Saved accounts on this device",
    enter_password: "Enter password then sign in",
    error_login: "Could not sign in",
    google_tab: "Google",
    start_here: "Start here",
    google_fast: "Fastest sign-in with Google.",
    opening: "Opening…",
    new_account: "New account",
    create_account: "Create account",
    saving: "Saving…",
    feed_title: "Timeline",
    rooms_title: "Rooms",
    messages_title: "Private chats",
    stories_title: "Stories",
    friends_title: "Friends",
    me_title: "My account",
    games_title: "Games",
    broadcast_title: "TV & Radio",
    tools_points: "Your points",
    tv: "TV",
    radio: "Radio",
    search: "Search",
    call_audio: "Audio",
    call_video: "Video",
    shortcuts: "Wasl shortcuts",
  },
  ur: {
    brand: "وصل",
    nav_home: "ہوم",
    nav_rooms: "کمرے",
    nav_messages: "چیٹس",
    nav_stories: "اسٹوریز",
    nav_friends: "دوست",
    nav_me: "میرا اکاؤنٹ",
    nav_games: "گیمز",
    nav_broadcast: "ٹی وی اور ریڈیو",
    nav_admin: "ایڈمن",
    language: "زبان",
    profile: "پروفائل",
    logout: "خارج ہوں",
    account: "اکاؤنٹ",
    landing_kicker: "براہ راست رابطہ، بغیر شور",
    landing_title: "پرسکون کمرے، صاف آواز",
    landing_sub: "گوگل یا فون سے داخل ہوں، دوست شامل کریں، اسٹوری لگائیں، اور کمرے میں تحفہ بھیجیں۔",
    login_google: "گوگل سے جاری رکھیں",
    login_phone: "فون نمبر",
    signup: "اکاؤنٹ بنائیں",
    signin: "داخلہ",
    phone: "فون نمبر",
    password: "پاس ورڈ",
    username: "صارف نام",
    nickname: "ظاہری نام",
    saved_accounts: "اس ڈیوائس پر محفوظ اکاؤنٹس",
    enter_password: "پاس ورڈ لکھیں پھر داخل ہوں",
    error_login: "داخلہ ممکن نہیں",
    google_tab: "گوگل",
    start_here: "یہاں سے شروع کریں",
    google_fast: "گوگل سے تیز ترین داخلہ۔",
    opening: "کھل رہا ہے…",
    new_account: "نیا اکاؤنٹ",
    create_account: "اکاؤنٹ بنائیں",
    saving: "محفوظ ہو رہا ہے…",
    feed_title: "ٹائم لائن",
    rooms_title: "کمرے",
    messages_title: "ذاتی چیٹس",
    stories_title: "اسٹوریز",
    friends_title: "دوست",
    me_title: "میرا اکاؤنٹ",
    games_title: "گیمز",
    broadcast_title: "ٹی وی اور ریڈیو",
    tools_points: "آپ کے پوائنٹس",
    tv: "ٹی وی",
    radio: "ریڈیو",
    search: "تلاش",
    call_audio: "آڈیو",
    call_video: "ویڈیو",
    shortcuts: "وصل شارٹ کٹس",
  },
};
