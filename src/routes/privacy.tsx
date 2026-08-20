import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal-page";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "سياسة الخصوصية — وصل" },
      { name: "description", content: "كيف يجمع وصل بياناتك، أين تُحفظ، وكيف تطلب حذف حسابك." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <LegalPage title="سياسة الخصوصية">
      <p>آخر تحديث: أغسطس 2026. باستخدام وصل فأنت توافق على هذه السياسة.</p>
      <h2 className="pt-2 text-lg text-fg">ما الذي نجمعه</h2>
      <ul className="list-disc space-y-1 ps-5">
        <li>بيانات الحساب: الاسم، اسم المستخدم، رقم الجوال أو بريد جوجل، الصورة، النبذة</li>
        <li>المحتوى الذي تنشره: رسائل، منشورات، قصص، تعليقات، مرفقات</li>
        <li>بيانات تقنية لازمة للتشغيل: جلسة الدخول، اشتراك الإشعارات، وقت آخر ظهور</li>
      </ul>
      <h2 className="pt-2 text-lg text-fg">أين تُحفظ</h2>
      <p>
        الحسابات والرسائل على قاعدة بيانات PostgreSQL (Neon). الملفات الكبيرة على تخزين سحابي (Vercel Blob).
        الاستضافة عبر Vercel. لا نبيع بياناتك لطرف ثالث للدعاية.
      </p>
      <h2 className="pt-2 text-lg text-fg">المكالمات</h2>
      <p>
        الصوت والفيديو يمرّان بين الأجهزة عبر WebRTC قدر الإمكان. إشارات الاتصال تُنقل عبر خوادمنا لتنسيق الجلسة،
        ولا نُسجّل المكالمة كمحتوى صوتي أو مرئي.
      </p>
      <h2 className="pt-2 text-lg text-fg">الإشعارات</h2>
      <p>إن فعّلت تنبيهات الجهاز، نحفظ عنوان اشتراك الدفع لإرسال تنبيه عند رسالة أو مكالمة. يمكنك إيقافها من إعدادات الهاتف.</p>
      <h2 className="pt-2 text-lg text-fg">الحذف</h2>
      <p>
        لطلب حذف الحساب ومحتواه، راسل مالك التطبيق من داخل وصل أو عبر صفحة الحساب. قد نحتفظ بنسخ احتياطية لمدة قصيرة
        لأسباب أمنية ثم تُزال.
      </p>
      <h2 className="pt-2 text-lg text-fg">العمر</h2>
      <p>وصل موجّه لمن يبلغ 13 سنة فأكثر. لا نطلب بيانات أطفال عن قصد.</p>
    </LegalPage>
  );
}
