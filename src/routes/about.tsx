import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal-page";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "عن وصل — تطبيق تواصل عربي للدردشة والغرف" },
      {
        name: "description",
        content: "وصل تطبيق تواصل عربي: غرف دردشة، رسائل خاصة، مكالمات صوت وفيديو، قصص ومنشورات. ادخل من المتصفح وثبّته على هاتفك.",
      },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <LegalPage title="وصل — تطبيق تواصل عربي">
      <p>
        وصل منصة تواصل عربية للدردشة الصوتية والمرئية والنصية. تدخل بجوجل أو برقم الجوال، تضيف أصدقاء برقم وصل،
        وتفتح غرفة أو محادثة خاصة.
      </p>
      <h2 className="pt-2 text-lg text-fg">ماذا يقدم وصل؟</h2>
      <ul className="list-disc space-y-1 ps-5">
        <li>غرف عامة وخاصة مع دردشة فورية وهدايا وستيكرز</li>
        <li>محادثات خاصة: نص، صوت، صورة، فيديو، رسائل لمرة واحدة</li>
        <li>مكالمات صوت وفيديو، مع إمكانية دعوة صديق ثالث</li>
        <li>قصص ومنشورات وريلز على الخط الزمني</li>
        <li>ألعاب بسيطة، تلفاز وراديو داخل التطبيق</li>
        <li>قابل للتثبيت على الشاشة الرئيسية كـ PWA</li>
      </ul>
      <h2 className="pt-2 text-lg text-fg">لمن وصل؟</h2>
      <p>
        للعائلات والأصدقاء والمجتمعات العربية التي تريد غرفة هادئة بدل الضجيج. التطبيق مجاني للدخول،
        والتثبيت من المتصفح لا يحتاج متجر في البداية.
      </p>
      <p>
        ابدأ من الصفحة الرئيسية:{" "}
        <a href="/" className="text-accent underline">
          waslapp
        </a>
      </p>
    </LegalPage>
  );
}
