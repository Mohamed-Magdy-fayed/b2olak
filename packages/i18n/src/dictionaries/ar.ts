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
    phaseBanner: "المرحلة ٣ — تسجيل الدخول جاهز: جلسات، كود واتساب، ودخول الأدمن.",
  },
  auth: {
    signInTitle: "دخول الأدمن",
    signInSubtitle: "لوحة تحكم بقولك",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    signIn: "تسجيل الدخول",
    signingIn: "جاري الدخول…",
    signOut: "تسجيل الخروج",
    signedInAs: "مسجّل باسم {name} ({role})",
    invalidCredentials: "البريد أو كلمة المرور غير صحيحة.",
    suspended: "هذا الحساب موقوف. تواصل مع الدعم.",
    otpInvalid: "الكود غير صحيح. حاول مرة أخرى.",
    otpExpired: "انتهت صلاحية الكود. اطلب كود جديد.",
    otpTooManyAttempts: "محاولات كثيرة. اطلب كود جديد.",
    driverNotApproved: "حساب الطيّار قيد المراجعة.",
  },
  validation: {
    phoneInvalid: "أدخل رقم موبايل مصري صحيح.",
    otpInvalid: "الكود مكوّن من ٦ أرقام.",
    emailInvalid: "أدخل بريد إلكتروني صحيح.",
    passwordTooShort: "كلمة المرور ٨ أحرف على الأقل.",
  },
  errors: {
    tooManyRequests: "محاولات كثيرة. استنى شوية وحاول تاني.",
    unknown: "حصل خطأ. حاول مرة أخرى.",
  },
} as const satisfies Dictionary;

export default ar;
