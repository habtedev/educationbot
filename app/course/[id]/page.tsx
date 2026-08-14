'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Star } from 'lucide-react';
import { PDFViewer } from '../../../components/PDFViewer';
import { getCachedPdfUrl, checkIsCached } from '../../../lib/cache';
import { useCourseStore } from '../../../store/useCourseStore';
import styles from './page.module.css';

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
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  const { favorites, toggleFavorite } = useCourseStore();
  const isFavorite = favorites.includes(id);

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
      if (WebApp && WebApp.initData) {
        WebApp.BackButton.hide();
        WebApp.BackButton.offClick(() => router.back());
      }
    };
  }, [router]);

  useEffect(() => {
    if (!course) {
      setError(true);
      return;
    }

    let active = true;

    const loadPdf = async () => {
      const originalUrl = `/courses/${course.file}`;
      const isCached = await checkIsCached(originalUrl);
      
      if (active) {
        // ALWAYS use the original URL.
        // The Service Worker will instantly intercept this and serve HTTP Range Requests directly from the offline cache!
        setPdfUrl(originalUrl);
        
        if (!isCached) {
          // Delay background caching by 3 seconds so it doesn't steal internet bandwidth from the PDF viewer's initial load
          setTimeout(() => {
            if (active) {
              import('../../../lib/cache').then(({ cachePdf }) => {
                cachePdf(originalUrl).catch(console.error);
              });
            }
          }, 3000);
        }
      }
    };

    loadPdf();

    return () => {
      active = false;
      if (pdfUrl && pdfUrl.startsWith('blob:')) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [course, pdfUrl]);

  if (error || !course) {
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

      {pdfUrl ? (
        <PDFViewer courseId={id} url={pdfUrl} />
      ) : (
        <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          Loading course...
        </div>
      )}
    </main>
  );
}
