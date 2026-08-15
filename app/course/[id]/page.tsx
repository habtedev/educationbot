'use client';

import { useEffect, useState, use, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Star } from 'lucide-react';
import { useCourseStore } from '../../../store/useCourseStore';
import { getBestPdfFile } from '../../../lib/pdfPreloader';
import styles from './page.module.css';

// Dynamic import with ssr:false — needed to prevent DOMMatrix error during static build.
// The PDFViewer chunk is small and will be prefetched by Next.js automatically.
const PDFViewer = dynamic(
  () => import('../../../components/PDFViewer').then(m => ({ default: m.PDFViewer })),
  {
    ssr: false,
    // No loading spinner here — the PDFViewer itself shows its own spinner.
    // Showing nothing avoids a double-flash of "Opening PDF..." then spinner.
    loading: () => null,
  }
);

const AVAILABLE_COURSES = {
  'anthropology': { title: 'Anthropology', file: 'Anthropology.pdf' },
  'civics': { title: 'Civics', file: 'Civics.pdf' },
  'economics': { title: 'Economics', file: 'Economics.pdf' },
  'emerging-tech': { title: 'Emerging technology', file: 'Emerging technology.pdf' },
  'global-trend': { title: 'Global trend', file: 'Global trend.pdf' },
  'logic': { title: 'Logic and Critical Thinking', file: 'Logic and Critical Thinking.pdf' },
  'psychology': { title: 'Psychology', file: 'Psychology.pdf' },
} as Record<string, { title: string, file: string }>;

export default function CourseViewer({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);

  const course = AVAILABLE_COURSES[id];
  const activeRef = useRef(true);

  const { favorites, toggleFavorite } = useCourseStore();
  const isFavorite = favorites.includes(id);

  // FIX 1: Compute the best file immediately on first render using 3-layer preloader.
  const originalUrl = course ? `/courses/${course.file}` : null;
  const pdfFile = originalUrl ? getBestPdfFile(originalUrl) : null;

  // Telegram back button
  useEffect(() => {
    let WebApp: any = null;
    const init = async () => {
      if (typeof window !== 'undefined') {
        WebApp = (await import('@twa-dev/sdk')).default;
        if (WebApp.initData) {
          WebApp.BackButton.show();
          WebApp.BackButton.onClick(() => router.back());
        }
      }
    };
    init();
    return () => {
      if (WebApp?.initData) {
        WebApp.BackButton.hide();
        WebApp.BackButton.offClick(() => router.back());
      }
    };
  }, [router]);

  // Background cache — use originalUrl (not blob URL) for the cache key
  useEffect(() => {
    if (!originalUrl) return;
    activeRef.current = true;

    const timer = setTimeout(async () => {
      if (!activeRef.current) return;
      try {
        const { checkIsCached, cachePdf } = await import('../../../lib/cache');
        const cached = await checkIsCached(originalUrl);
        if (!cached && activeRef.current) {
          cachePdf(originalUrl).catch(() => {});
        }
      } catch {}
    }, 2000);

    return () => {
      activeRef.current = false;
      clearTimeout(timer);
    };
  }, [originalUrl]);

  if (!course) {
    return (
      <main className={styles.main}>
        <div style={{ padding: 20, textAlign: 'center', marginTop: 100 }}>
          <h2>Course not found</h2>
          <button onClick={() => router.back()} style={{ color: 'var(--primary)', marginTop: 20 }}>
            Go Back
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => router.back()}>
          <ChevronLeft size={24} /> Back
        </button>
        <h2 className={styles.title}>{course.title}</h2>
        <div className={styles.actions}>
          <button
            className={`${styles.iconBtn} ${isFavorite ? styles.active : ''}`}
            onClick={() => toggleFavorite(id)}
          >
            <Star size={20} fill={isFavorite ? 'currentColor' : 'none'} />
          </button>
        </div>
      </header>

      {/* FIX 3: Always render PDFViewer immediately — never conditionally hide it. */}
      {Boolean(pdfFile) && <PDFViewer courseId={id} file={pdfFile} />}
    </main>
  );
}
