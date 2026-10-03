export type Lang = "en" | "am" | "om";
export const LANGS: Lang[] = ["en", "am", "om"];
type E = [string, string, string]; // [English, አማርኛ, Afaan Oromoo]
const D: Record<string, E> = {
  welcome: [
    "☕ Cafe Money\nManage your cafe's daily money easily.\n\nChoose your language:",
    "☕ ካፌ ማኒ\nየካፌዎን ዕለታዊ ገንዘብ በቀላሉ ያስተዳድሩ።\n\nቋንቋ ይምረጡ፦",
    "☕ Cafe Money\nMaallaqa kaafeetii guyyaa guyyaan salphaatti to'adhaa.\n\nAfaan filadhu:",
  ],
  askOwnerPassword: [
    "Enter the owner password:",
    "የባለቤቱን የይለፍ ቃል ያስገቡ፦",
    "Jecha icciitii abbaa kaafeetii galchi:",
  ],
  askPassword: [
    "Enter your password:",
    "የይለፍ ቃልዎን ያስገቡ፦",
    "Jecha icciitii kee galchi:",
  ],
  badPassword: [
    "Incorrect password. Send /start to try again.",
    "የይለፍ ቃሉ ተሳስቷል። እንደገና ለመሞከር /start ይላኩ።",
    "Jecha icciitii dogoggoraa. Irra deebi'uuf /start ergi.",
  ],
  askName: ["What is your name?", "ስምዎ ማን ይባላል?", "Maqaan kee eenyu?"],
  askRole: ["What is your role?", "ሚናዎ ምንድን ነው?", "Gahee kee maali?"],
  askCafe: [
    "What is your cafe name?",
    "የካፌዎ ስም ማን ነው?",
    "Maqaan kaafeetii kee maali?",
  ],
  askInvite: [
    "Enter the invite code from your cafe owner:",
    "ከካፌው ባለቤት የተሰጠዎትን የግብዣ ኮድ ያስገቡ፦",
    "Koodii affeerraa abbaa kaafeetii irraa argatte galchi:",
  ],
  badInvite: [
    "Invalid or expired code. Try again.",
    "ኮዱ የተሳሳተ ወይም ጊዜው ያለፈበት ነው። እንደገና ይሞክሩ።",
    "Koodiin dogoggora ykn yeroon isaa darbeera. Irra deebi'ii yaali.",
  ],
  owner: ["👑 Owner", "👑 ባለቤት", "👑 Abbaa Kaafeetii"],
  recep: ["👤 Receptionist", "👤 ተቀባይ", "👤 Simataa"],
  ready: ["✅ You are registered!", "✅ ተመዝግበዋል!", "✅ Galmaa'ameetta!"],
  pick: ["Choose an option:", "አማራጭ ይምረጡ፦", "Filannoo filadhu:"],
  m_in: ["💰 Add Income", "💰 ገቢ መዝግብ", "💰 Galii galmeessi"],
  m_sale: ["🧾 Record Sale", "🧾 ሽያጭ መዝግብ", "🧾 Gurgurtaa galmeessi"],
  m_out: ["💸 Add Expense", "💸 ወጪ መዝግብ", "💸 Baasii galmeessi"],
  m_today: ["📊 Today's Report", "📊 የዛሬ ሪፖርት", "📊 Gabaasa Har'aa"],
  m_tx: ["📋 Transactions", "📋 ግብይቶች", "📋 Daldalawwan"],
  m_cash: ["💵 Cash Check", "💵 የጥሬ ገንዘብ ቆጠራ", "💵 Qorannoo Maallaqaa"],
  m_reports: ["📅 Reports", "📅 ሪፖርቶች", "📅 Gabaasawwan"],
  m_close: ["🔒 Close Day", "🔒 ቀኑን ዝጋ", "🔒 Guyyaa Cufi"],
  m_settings: ["⚙️ Settings", "⚙️ ቅንብሮች", "⚙️ Qindaa'inoota"],
  m_items: ["🏆 Item Sales", "🏆 የእቃ ሽያጭ", "🏆 Gurgurtaa meeshaa"],
  askItemName: [
    "What item was sold?",
    "የተሸጠው እቃ ምንድነው?",
    "Meeshaan gurgurame maali?",
  ],
  askQuantity: ["How many were sold?", "ስንት ተሸጠ?", "Maddi meeqa gurgurame?"],
  askUnitPrice: [
    "What is the price for one item?",
    "የአንድ እቃ ዋጋ ስንት ነው?",
    "Gatiin meeshaa tokkoo meeqa?",
  ],
  itemConfirm: [
    "Submit this sale?",
    "ይህ ሽያጭ ይመዝገብ?",
    "Gurgurtaan kun galmaa'uu?",
  ],
  itemRecorded: [
    "✅ Sale recorded",
    "✅ ሽያጭ ተመዝግቧል",
    "✅ Gurgurtaan galmaa'eera",
  ],
  itemReport: ["🏆 ITEM SALES", "🏆 የእቃ ሽያጭ", "🏆 GURGURTAA MEESHAA"],
  sold: ["sold", "ተሸጧል", "gurgurameera"],
  askIn: [
    "How much money was received?",
    "ስንት ገንዘብ ተቀበሉ?",
    "Maallaqni meeqa fudhatame?",
  ],
  askOut: ["How much did you spend?", "ስንት አወጡ?", "Meeqa baasii goote?"],
  askSpent: [
    "What did you spend it on?",
    "ገንዘቡን ለምን አወጡት?",
    "Maallaqa kana maal irratti baaste?",
  ],
  badAmt: [
    "Please enter a valid number, e.g. 500",
    "እባክዎ ትክክለኛ ቁጥር ያስገቡ፣ ለምሳሌ 500",
    "Maaloo lakkoofsa sirrii galchi, fkn 500",
  ],
  askCat: [
    "Type the expense category, for example Milk:",
    "የወጪውን ምድብ ይጻፉ፣ ለምሳሌ ወተት፦",
    "Ramaddii baasichaa barreessi, fakkeenyaaf Aannan:",
  ],
  payT: ["💳 PAYMENT METHOD", "💳 የክፍያ ዘዴ", "💳 MALA KAFFALTII"],
  askPay: ["Payment method?", "የክፍያ ዘዴ?", "Mala kaffaltii?"],
  other: ["Other", "ሌላ", "Kan biroo"],
  otherName: [
    "Payment method name? e.g. Awash Bank",
    "የክፍያ ዘዴው ስም? ለምሳሌ አዋሽ ባንክ",
    "Maqaan mala kaffaltii? fkn Baankii Awaash",
  ],
  badPm: [
    "This payment method is not available.",
    "ይህ የክፍያ ዘዴ አይገኝም።",
    "Malli kaffaltii kun hin argamu.",
  ],
  askNote: ["Add a note?", "ማስታወሻ ይጨመር?", "Yaadannoo dabaluu?"],
  addNote: ["✏️ Add Note", "✏️ ማስታወሻ ጨምር", "✏️ Yaadannoo Dabali"],
  skip: ["⏭️ Skip", "⏭️ ዝለል", "⏭️ Darbi"],
  typeNote: ["Type your note:", "ማስታወሻዎን ይጻፉ፦", "Yaadannoo kee barreessi:"],
  incRec: ["✅ INCOME RECORDED", "✅ ገቢ ተመዝግቧል", "✅ GALIIN QABAMEERA"],
  expRec: ["✅ EXPENSE RECORDED", "✅ ወጪ ተመዝግቧል", "✅ BAASIIN QABAMEERA"],
  amount: ["Amount", "መጠን", "Hammaa"],
  payment: ["Payment", "ክፍያ", "Kaffaltii"],
  time: ["Time", "ሰዓት", "Yeroo"],
  category: ["Category", "ምድብ", "Ramaddii"],
  note: ["Note", "ማስታወሻ", "Yaadannoo"],
  type: ["Type", "ዓይነት", "Gosa"],
  by: ["Recorded by", "የመዘገበው", "Kan galmeesse"],
  date: ["Date", "ቀን", "Guyyaa"],
  todayT: ["📊 TODAY'S REPORT", "📊 የዛሬ ሪፖርት", "📊 GABAASA HAR'AA"],
  repT: ["📊 REPORT", "📊 ሪፖርት", "📊 GABAASA"],
  income: ["💰 INCOME", "💰 ገቢ", "💰 GALII"],
  totalIncome: ["TOTAL INCOME", "ጠቅላላ ገቢ", "GALII GUUTUU"],
  expenses: ["💸 EXPENSES", "💸 ወጪ", "💸 BAASII"],
  net: ["NET", "የተጣራ", "HAARA"],
  count: ["Transactions", "ግብይቶች", "Daldalawwan"],
  lIncome: ["Income", "ገቢ", "Galii"],
  lExpenses: ["Expenses", "ወጪ", "Baasii"],
  lNet: ["Net", "የተጣራ", "Haara"],
  p_today: ["Today", "ዛሬ", "Har'a"],
  p_yest: ["Yesterday", "ትናንት", "Kaleessa"],
  p_week: ["This Week", "በዚህ ሳምንት", "Torban kana"],
  p_month: ["This Month", "በዚህ ወር", "Ji'a kana"],
  refresh: ["🔄 Refresh", "🔄 አድስ", "🔄 Haaromsi"],
  otherDate: ["📅 Other Date", "📅 ሌላ ቀን", "📅 Guyyaa Biraa"],
  menuBtn: ["⬅️ Main Menu", "⬅️ ዋና ማውጫ", "⬅️ Menu Guddaa"],
  cashT: ["💵 CASH CHECK", "💵 የጥሬ ገንዘብ ቆጠራ", "💵 QORANNOO MAALLAQAA"],
  cashIn: ["Cash income", "የጥሬ ገንዘብ ገቢ", "Galii maallaqaa"],
  cashOut: ["Cash expenses", "የጥሬ ገንዘብ ወጪ", "Baasii maallaqaa"],
  expected: ["Expected", "የሚጠበቀው", "Kan eegamu"],
  actual: ["Actual", "ትክክለኛው", "Dhugaa"],
  diff: ["Difference", "ልዩነት", "Garaagarummaa"],
  askActual: [
    "How much cash do you actually have?",
    "በእጅዎ ስንት ጥሬ ገንዘብ አለ?",
    "Maallaqni harka kee jiru meeqa?",
  ],
  diffT: ["⚠️ CASH DIFFERENCE", "⚠️ የገንዘብ ልዩነት", "⚠️ GARAAGARUMMAA MAALLAQAA"],
  okT: ["✅ CASH MATCHES", "✅ ጥሬ ገንዘቡ ትክክል ነው", "✅ MAALLAQNI WALIIN DHA'A"],
  why: ["Why?", "ለምን?", "Maaliif?"],
  r1: ["🧾 Expense not recorded", "🧾 ያልተመዘገበ ወጪ", "🧾 Baasiin hin galmoofne"],
  r2: ["↩️ Refund", "↩️ ተመላሽ ገንዘብ", "↩️ Deebii maallaqaa"],
  r3: ["❓ Cash mistake", "❓ የቆጠራ ስህተት", "❓ Dogoggora lakkaa'insaa"],
  r4: ["✏️ Other", "✏️ ሌላ", "✏️ Kan biroo"],
  r5: ["⏭️ No reason", "⏭️ ምክንያት የለም", "⏭️ Sababni hin jiru"],
  saved: ["✅ Saved", "✅ ተቀምጧል", "✅ Olkaa'ameera"],
  closeT: ["🔒 DAILY CLOSING", "🔒 የቀን መዝጊያ", "🔒 GUYYAA CUFUU"],
  closeAsk: [
    "Have you checked the cash?",
    "ጥሬ ገንዘቡን ቆጥረዋል?",
    "Maallaqa laakkoofteettaa?",
  ],
  closeBtn: ["✅ Close Day", "✅ ቀኑን ዝጋ", "✅ Guyyaa Cufi"],
  closed: [
    "🔒 This day is already closed.",
    "🔒 ይህ ቀን ቀድሞ ተዘግቷል።",
    "🔒 Guyyaan kun duraan cufameera.",
  ],
  closedOk: ["🔒 Day closed.", "🔒 ቀኑ ተዘግቷል።", "🔒 Guyyaan cufameera."],
  closeRestart: [
    "Send /start to log in again.",
    "እንደገና ለመግባት /start ይላኩ።",
    "Irra deebi'anii seenuuf /start ergi.",
  ],
  reopenBtn: ["🔓 Reopen Day", "🔓 ቀኑን ክፈት", "🔓 Guyyaa Banaa"],
  reopened: ["🔓 Day reopened.", "🔓 ቀኑ ተከፍቷል።", "🔓 Guyyaan banameera."],
  notAllowed: [
    "You are not allowed to do this.",
    "ይህን ለማድረግ ፈቃድ የለዎትም።",
    "Hojii kana raawwachuuf hayyama hin qabdu.",
  ],
  cancel: ["❌ Cancel", "❌ ሰርዝ", "❌ Dhiisi"],
  cancelled: ["Cancelled.", "ተሰርዟል።", "Dhiifameera."],
  error: [
    "Something went wrong. Please try again.",
    "የሆነ ችግር ተፈጥሯል። እባክዎ እንደገና ይሞክሩ።",
    "Rakkoon uumame. Maaloo irra deebi'ii yaali.",
  ],
  none: [
    "No transactions yet.",
    "እስካሁን ግብይት የለም።",
    "Hanga ammaatti daldalli hin jiru.",
  ],
  recent: ["📋 RECENT TRANSACTIONS", "📋 የቅርብ ግብይቶች", "📋 DALDALAWWAN DUUBAA"],
  details: ["📋 DETAILS", "📋 ዝርዝር", "📋 GEEGGEESSA"],
  delBtn: ["🗑 Delete", "🗑 ሰርዝ", "🗑 Haqi"],
  delAsk: ["Delete this transaction?", "ይህ ግብይት ይሰረዝ?", "Daldala kana haquu?"],
  yes: ["✅ Yes, delete", "✅ አዎ፣ ሰርዝ", "✅ Eeyyee, haqi"],
  deleted: ["🗑 Deleted.", "🗑 ተሰርዟል።", "🗑 Haqameera."],
  chooseLang: ["🌐 Language:", "🌐 ቋንቋ፦", "🌐 Afaan:"],
  langSet: ["✅ Language updated.", "✅ ቋንቋ ተቀይሯል።", "✅ Afaan jijjiirameera."],
  inviteBtn: [
    "🔗 Create invite code",
    "🔗 የግብዣ ኮድ ፍጠር",
    "🔗 Koodii affeerraa uumi",
  ],
  invite: [
    "Invite code (valid 24 hours):",
    "የግብዣ ኮድ (ለ24 ሰዓት የሚያገለግል)፦",
    "Koodii affeerraa (sa'aatii 24):",
  ],
  receptionBtn: [
    "👥 Manage receptionists",
    "👥 ተቀባዮችን አስተዳድር",
    "👥 Simattoota to'adhu",
  ],
  receptionTitle: ["👥 Receptionists", "👥 ተቀባዮች", "👥 Simattoota"],
  receptionNone: [
    "No receptionists found.",
    "ምንም ተቀባይ አልተገኘም።",
    "Simataan hin jiru.",
  ],
  activate: ["✅ Activate", "✅ አንቃ", "✅ Kaasi"],
  deactivate: ["⛔ Deactivate", "⛔ አቦዝን", "⛔ Dhaamsi"],
  receptionUpdated: [
    "Receptionist status updated.",
    "የተቀባዩ ሁኔታ ተቀይሯል።",
    "Haalli simataa jijjiirameera.",
  ],
  addReception: ["➕ Add receptionist", "➕ ተቀባይ ጨምር", "➕ Simataa dabali"],
  askReceptionId: [
    "Enter the receptionist Telegram ID:",
    "የተቀባዩን Telegram ID ያስገቡ፦",
    "Telegram ID simataa galchi:",
  ],
  askReceptionName: [
    "Enter the receptionist name:",
    "የተቀባዩን ስም ያስገቡ፦",
    "Maqaa simataa galchi:",
  ],
  askReceptionPassword: [
    "Set the receptionist password:",
    "የተቀባዩን የይለፍ ቃል ያዘጋጁ፦",
    "Jecha icciitii simataa qopheessi:",
  ],
  receptionAdded: [
    "Receptionist added.",
    "ተቀባዩ ተጨምሯል።",
    "Simataan dabalameera.",
  ],
  receptionDeleted: [
    "Receptionist removed.",
    "ተቀባዩ ተወግዷል።",
    "Simataan haqameera.",
  ],
};

export const t = (
  l: Lang,
  k: string,
  v: Record<string, string> = {},
): string => {
  const e = D[k];
  if (!e) return k;
  let s = e[LANGS.indexOf(l)];
  for (const [a, b] of Object.entries(v)) s = s.split(`{${a}}`).join(b);
  return s;
};

const OWNER_MENU = [
  ["out", "today"],
  ["tx", "cash"],
  ["reports", "items"],
  ["close", "settings"],
];
const RECEPTION_MENU = [["sale", "out"], ["tx", "cash"], ["close"]];
export const menuAction = (text: string): string | null => {
  for (const l of LANGS)
    for (const menu of [OWNER_MENU, RECEPTION_MENU])
      for (const row of menu)
        for (const k of row) if (t(l, "m_" + k) === text) return k;
  return null;
};
export const menuKeyboard = (
  l: Lang,
  role: "OWNER" | "RECEPTIONIST" = "RECEPTIONIST",
  canClose = true,
) => {
  const menu =
    role === "OWNER"
      ? OWNER_MENU
      : RECEPTION_MENU.filter((row) => canClose || !row.includes("close"));
  return {
    keyboard: [
      ...menu.map((r) => r.map((k) => ({ text: t(l, "m_" + k) }))),
      [{ text: "/start" }],
    ],
    resize_keyboard: true,
  };
};
