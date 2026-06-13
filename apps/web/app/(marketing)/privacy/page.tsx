import { BackHome } from "@/features/marketing/back-home";
import { getT } from "@/lib/i18n";

export default async function PrivacyPage() {
  const { locale } = await getT();

  if (locale === "ar") {
    return (
      <>
        <BackHome />
        <article className="prose mx-auto w-full max-w-3xl px-4 py-12">
          <h1 className="mb-6 text-3xl font-black">سياسة الخصوصية</h1>
          <div className="flex flex-col gap-4 leading-relaxed">
            <p>آخر تحديث: يونيو ٢٠٢٦.</p>
            <h2 className="text-xl font-bold">البيانات اللي بنجمعها</h2>
            <p>
              رقم موبايلك واسمك (لإنشاء الحساب والتحقق عبر واتساب)، عناوين التوصيل
              اللي بتضيفها، وتاريخ طلباتك. مفيش بيانات دفع — الدفع كاش عند الاستلام.
            </p>
            <h2 className="text-xl font-bold">بنستخدمها في إيه</h2>
            <p>
              تنفيذ الطلبات وتوصيلها، التواصل معاك عبر واتساب بخصوص طلباتك،
              وتحسين الخدمة. البيانات لا تُباع لأي طرف ثالث.
            </p>
            <h2 className="text-xl font-bold">مين بيشوف بياناتك</h2>
            <p>
              الطيّار المعيّن لطلبك بيشوف عنوان التوصيل ورقم التواصل الخاص بالطلب
              فقط، وفريق التشغيل لإدارة الطلبات.
            </p>
            <h2 className="text-xl font-bold">حذف الحساب</h2>
            <p>
              تقدر تحذف حسابك من شاشة &quot;حسابي&quot; داخل التطبيق، وبياناتك
              الشخصية بتتجهّل مع الاحتفاظ بسجل الطلبات لأغراض محاسبية.
            </p>
            <h2 className="text-xl font-bold">تواصل معنا</h2>
            <p>لأي استفسار عن الخصوصية تواصل معنا عبر واتساب من داخل التطبيق.</p>
          </div>
        </article>
      </>
    );
  }

  return (
    <>
      <BackHome />
      <article className="mx-auto w-full max-w-3xl px-4 py-12">
        <h1 className="mb-6 text-3xl font-black">Privacy Policy</h1>
        <div className="flex flex-col gap-4 leading-relaxed">
          <p>Last updated: June 2026.</p>
          <h2 className="text-xl font-bold">What we collect</h2>
          <p>
            Your phone number and name (for account creation and WhatsApp
            verification), the delivery addresses you add, and your order
            history. We hold no payment data — payment is cash on delivery.
          </p>
          <h2 className="text-xl font-bold">How we use it</h2>
          <p>
            Fulfilling and delivering your orders, contacting you on WhatsApp
            about your orders, and improving the service. Your data is never
            sold to third parties.
          </p>
          <h2 className="text-xl font-bold">Who sees it</h2>
          <p>
            The rider assigned to your order sees only that order&apos;s
            delivery address and contact number; our operations team manages
            orders.
          </p>
          <h2 className="text-xl font-bold">Account deletion</h2>
          <p>
            Delete your account from the Account screen in the app. Personal
            data is anonymized; order records are retained for accounting.
          </p>
          <h2 className="text-xl font-bold">Contact</h2>
          <p>For privacy questions, reach us on WhatsApp from inside the app.</p>
        </div>
      </article>
    </>
  );
}
