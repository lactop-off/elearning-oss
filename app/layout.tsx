// The root layout is a pass-through. The actual <html>/<body>, fonts, and
// global providers live in app/[locale]/layout.tsx so they can use the
// resolved locale (lang attribute, NextIntlClientProvider).
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
