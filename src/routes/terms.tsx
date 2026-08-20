import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal-page";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "شروط الاستخدام — وصل" },
      { name: "description", content: "قواعد استخدام تطبيق وصل: الاحترام، المحتوى، وصلاحيات الإدارة." },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <LegalPage title="شروط الاستخدام">
      <p>وصل خدمة تواصل مجتمعية. بالدخول فأنت توافق على الآتي.</p>
      <ul className="list-disc space-y-1 ps-5">
        <li>لا تنشر محتوى للبالغين أو عنفاً أو احتيالاً أو إساءة للآخرين</li>
        <li>لا تنتحل شخصية أحد ولا تخترق حسابات</li>
        <li>المحتوى الذي تنشره يبقى مسؤوليتك، ويمنح وصل ترخيصاً لعرضه داخل التطبيق</li>
        <li>مالك التطبيق قد يحذف منشوراً أو يوقف حساباً عند البلاغ أو مخالفة القواعد</li>
        <li>الخدمة تُقدَّم كما هي، وقد تتوقف للصيانة أو التطوير</li>
      </ul>
      <p>للاستفسار استخدم صفحة الإدارة داخل التطبيق إن كنت المالك، أو راسله من حسابك.</p>
    </LegalPage>
  );
}
