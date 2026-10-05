/**
 * Legacy Grok live-preview OAuth popup — disabled for standalone waslapp.
 * Phone/email + password is the only product auth path.
 */
export async function handleAuthPopupRequest(_request: Request): Promise<Response> {
  return new Response(
    "<!doctype html><html lang=\"ar\"><body><p>تسجيل الدخول الاجتماعي غير متاح. استخدم رقم الجوال وكلمة المرور.</p></body></html>",
    {
      status: 410,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
      },
    },
  );
}
