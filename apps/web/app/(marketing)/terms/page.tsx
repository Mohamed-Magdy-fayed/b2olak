import { getT } from "@/lib/i18n";

export default async function TermsPage() {
  const { locale } = await getT();

  if (locale === "ar") {
    return (
      <article className="mx-auto w-full max-w-3xl px-4 py-12">
        <h1 className="mb-6 text-3xl font-black">شروط الاستخدام</h1>
        <div className="flex flex-col gap-4 leading-relaxed">
          <p>آخر تحديث: يونيو ٢٠٢٦.</p>
          <h2 className="text-xl font-bold">الخدمة</h2>
          <p>
            بقولك خدمة توصيل: بتطلب أصناف من التطبيق، طيّار بيشتريها من السوق
            بسعر السوق، وبتدفع قيمة الأصناف + رسوم التوصيل كاش عند الاستلام.
          </p>
          <h2 className="text-xl font-bold">الأسعار</h2>
          <p>
            أسعار الأصناف هي أسعار الشراء الفعلية من السوق وبتظهر لك في التطبيق
            أولاً بأول أثناء الشراء. رسوم التوصيل ثابتة ومعلنة قبل تأكيد الطلب.
          </p>
          <h2 className="text-xl font-bold">الإلغاء</h2>
          <p>
            تقدر تلغي طلبك مجاناً قبل بدء الشراء. بعد بدء الشراء، الإلغاء عن
            طريق خدمة العملاء فقط.
          </p>
          <h2 className="text-xl font-bold">الاستخدام العادل</h2>
          <p>
            إساءة الاستخدام (طلبات وهمية، محتوى مسيء في أسماء الأصناف، رفض
            الاستلام المتكرر) قد تؤدي لإيقاف الحساب.
          </p>
        </div>
      </article>
    );
  }

  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-12">
      <h1 className="mb-6 text-3xl font-black">Terms of Service</h1>
      <div className="flex flex-col gap-4 leading-relaxed">
        <p>Last updated: June 2026.</p>
        <h2 className="text-xl font-bold">The service</h2>
        <p>
          ba2olak is a delivery service: you order items in the app, a rider
          buys them from the market at market price, and you pay the items
          total plus the delivery fee in cash on delivery.
        </p>
        <h2 className="text-xl font-bold">Pricing</h2>
        <p>
          Item prices are the actual market purchase prices, shown to you live
          in the app while shopping. The delivery fee is flat and shown before
          you confirm the order.
        </p>
        <h2 className="text-xl font-bold">Cancellation</h2>
        <p>
          You can cancel free of charge before shopping starts. After that,
          cancellation is handled by customer support only.
        </p>
        <h2 className="text-xl font-bold">Fair use</h2>
        <p>
          Abuse (fake orders, offensive item names, repeated refusal to
          receive) may lead to account suspension.
        </p>
      </div>
    </article>
  );
}
