import type { Dictionary } from "./en";

/** Arabic dictionary — mirrors every key in en.ts (typechecked). */
const ar = {
  common: {
    appName: "بقولك",
    language: "اللغة",
    loading: "جاري التحميل…",
    retry: "إعادة المحاولة",
    cancel: "إلغاء",
    confirm: "تأكيد",
    save: "حفظ",
  },
  home: {
    tagline: "اطلب، نشتري، نوصّلك لحد الباب.",
    subtitle: "مشاوير السوبر ماركت والسوق… علينا.",
    apiStatus: "حالة الخادم",
    apiOk: "متصل",
    apiChecking: "جاري الفحص…",
    apiError: "غير متاح",
    phaseBanner: "المرحلة ٢ — أساس المشروع جاهز.",
  },
} satisfies Dictionary;

export default ar;
