// This is a SERVER component layout — it wraps the 'use client' course page.
// generateStaticParams must live in a server component, not a 'use client' one.
// This tells Next.js to pre-build all 7 course pages as STATIC HTML at build time,
// converting them from ƒ (dynamic, needs internet) to ○ (static, works offline).

export function generateStaticParams() {
  return [
    { id: 'anthropology' },
    { id: 'civics' },
    { id: 'economics' },
    { id: 'emerging-tech' },
    { id: 'global-trend' },
    { id: 'logic' },
    { id: 'psychology' },
  ];
}

export default function CourseLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
