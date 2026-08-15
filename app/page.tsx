'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Menu, Lock, ChevronLeft, Star } from 'lucide-react';
import { SearchBar } from '../components/SearchBar';
import { CourseCard } from '../components/CourseCard';
import { ProgressDialog } from '../components/ProgressDialog';
import { checkIsCached, cachePdf } from '../lib/cache';
import { initPdfWorker, preloadCachedPdfs, getBestPdfFile, isPreloaded } from '../lib/pdfPreloader';
import { useCourseStore } from '../store/useCourseStore';
import styles from './page.module.css';

// PDFViewer loaded once — stays mounted in the overlay forever
// No re-download of the JS chunk on every course open
const PDFViewer = dynamic(
  () => import('../components/PDFViewer').then(m => ({ default: m.PDFViewer })),
  { ssr: false, loading: () => null }
);

const AVAILABLE_COURSES = [
  { id: 'logic',        title: 'Logic and Critical Thinking', desc: 'Reasoning & Analysis',      file: 'Logic and Critical Thinking.pdf',  sizeMB: 2.5  },
  { id: 'psychology',   title: 'Psychology',                  desc: 'Mind & Behavior',            file: 'Psychology.pdf',                   sizeMB: 9.1  },
  { id: 'anthropology', title: 'Anthropology',                desc: 'Human Origins & Culture',    file: 'Anthropology.pdf',                 sizeMB: 0.8  },
  { id: 'economics',    title: 'Economics',                   desc: 'Markets & Growth',           file: 'Economics.pdf',                    sizeMB: 8.8  },
  { id: 'emerging-tech',title: 'Emerging Technology',         desc: 'AI, IoT & Future Tech',      file: 'Emerging technology.pdf',          sizeMB: 1.1  },
  { id: 'global-trend', title: 'Global Trends',               desc: 'World Affairs & Shifts',     file: 'Global trend.pdf',                 sizeMB: 2.0  },
  { id: 'civics',       title: 'Civics',                      desc: 'Rights, Law & Society',      file: 'Civics.pdf',                       sizeMB: 34.0 },
];

export default function Home() {
  const [search, setSearch]               = useState('');
  const [cachedStatus, setCachedStatus]   = useState<Record<string, boolean>>({});
  const [isClient, setIsClient]           = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadStatus, setDownloadStatus]     = useState<'downloading' | 'success' | 'error'>('downloading');

  // ── Overlay state ────────────────────────────────────────────────────────
  // Instead of router.push() (causes white flash), we just show/hide an overlay.
  const [openCourseId, setOpenCourseId] = useState<string | null>(null);
  const openCourse = AVAILABLE_COURSES.find(c => c.id === openCourseId) ?? null;
  // getBestPdfFile returns: pre-parsed doc > ArrayBuffer > URL string
  // Pre-parsed doc = zero loading time, renders page 1 instantly
  const pdfFile = openCourse ? getBestPdfFile(`/courses/${openCourse.file}`) : null;

  const { favorites, toggleFavorite } = useCourseStore();

  // ── Cache status ─────────────────────────────────────────────────────────
  const checkCacheStatus = useCallback(() => {
    AVAILABLE_COURSES.forEach(async (course) => {
      const url = `/courses/${course.file}`;
      const cached = await checkIsCached(url);
      setCachedStatus(prev => ({ ...prev, [course.id]: cached }));
      if (cached) preloadCachedPdfs([url]);
    });
  }, []);

  useEffect(() => {
    setIsClient(true);
    checkCacheStatus();
    initPdfWorker();
    // Pre-load the PDFViewer JS chunk silently
    import('../components/PDFViewer').catch(() => {});

    window.addEventListener('focus', checkCacheStatus);
    const interval = setInterval(checkCacheStatus, 4000);
    return () => {
      window.removeEventListener('focus', checkCacheStatus);
      clearInterval(interval);
    };
  }, [checkCacheStatus]);

  const handleOpenCourse = useCallback((courseId: string) => {
    try { console.timeEnd(`⏱️ Instant Open [${courseId}]`); } catch {}
    console.time(`⏱️ Instant Open [${courseId}]`);
    // Start background caching if not cached
    const course = AVAILABLE_COURSES.find(c => c.id === courseId);
    if (course && !cachedStatus[courseId]) {
      const url = `/courses/${course.file}`;
      setTimeout(() => cachePdf(url).catch(() => {}), 1000);
    }
    setOpenCourseId(courseId);
  }, [cachedStatus]);

  const handleClose = useCallback(() => {
    setOpenCourseId(null);
    checkCacheStatus();
  }, [checkCacheStatus]);

  // ── Download all ─────────────────────────────────────────────────────────
  const handleDownloadAll = async () => {
    setIsDownloading(true);
    setDownloadStatus('downloading');
    try {
      let completed = 0;
      for (const course of AVAILABLE_COURSES) {
        const url = `/courses/${course.file}`;
        if (!cachedStatus[course.id]) {
          await cachePdf(url);
          setCachedStatus(prev => ({ ...prev, [course.id]: true }));
        }
        // Immediately start preloading to RAM & pre-parsing
        preloadCachedPdfs([url]);
        completed++;
        setDownloadProgress(Math.round((completed / AVAILABLE_COURSES.length) * 100));
      }
      setDownloadStatus('success');
      setTimeout(() => setIsDownloading(false), 2000);
    } catch {
      setDownloadStatus('error');
    }
  };

  const filteredCourses = useMemo(() => {
    if (!search) return AVAILABLE_COURSES;
    return AVAILABLE_COURSES.filter(c =>
      c.title.toLowerCase().includes(search.toLowerCase())
    );
  }, [search]);

  if (!isClient) return null;

  return (
    <>
      {/* ── Home screen ───────────────────────────────────────────────── */}
      <main className={styles.main}>
        <header className={styles.topBar}>
          <button className={styles.iconBtn} style={{ background: 'transparent' }}>
            <Menu size={24} />
          </button>
          <div className={styles.topTitle}>📚 A to Z Academy</div>
          <div style={{ width: 40 }} />
        </header>

        <div className={styles.content}>
          <div className={styles.heroCard}>
            <div className={styles.overline}>FRESHMAN • SEMESTER 2</div>
            <h1 className={styles.heroTitle}>
              Your Course<br />
              <span className={styles.heroLibrary}>Library</span> 💧
            </h1>
            <div className={styles.heroSubtitle}>
              {AVAILABLE_COURSES.length} courses • Read-only • Secure viewer
            </div>
            <button className={styles.downloadAllBtn} onClick={handleDownloadAll}>
              ↓ Download all for offline
            </button>
          </div>

          <div className={styles.searchSection}>
            <SearchBar value={search} onChange={setSearch} placeholder="Search courses..." />
          </div>

          <div className={styles.courseList}>
            {filteredCourses.map(course => (
              <CourseCard
                key={course.id}
                id={course.id}
                title={course.title}
                desc={course.desc}
                isCached={cachedStatus[course.id]}
                onOpen={() => handleOpenCourse(course.id)}
              />
            ))}
          </div>

          <footer className={styles.footer}>
            <Lock size={12} /> Read-Only • No Download • No Copy • © A to Z Tutorial Class
          </footer>
        </div>

        <ProgressDialog
          isOpen={isDownloading}
          progress={downloadProgress}
          status={downloadStatus}
          onClose={() => setIsDownloading(false)}
          onRetry={handleDownloadAll}
        />
      </main>

      {/* ── PDF Overlay — slides in instantly, no page navigation ─────── */}
      <div className={`${styles.overlay} ${openCourseId ? styles.overlayOpen : ''}`}>
        {openCourse && (
          <>
            <header className={styles.overlayHeader}>
              <button className={styles.backBtn} onClick={handleClose}>
                <ChevronLeft size={24} /> Back
              </button>
              <h2 className={styles.overlayTitle}>{openCourse.title}</h2>
              <button
                className={`${styles.iconBtn} ${favorites.includes(openCourseId!) ? styles.active : ''}`}
                onClick={() => toggleFavorite(openCourseId!)}
              >
                <Star size={20} fill={favorites.includes(openCourseId!) ? 'currentColor' : 'none'} />
              </button>
            </header>

            {Boolean(pdfFile) && (
              <PDFViewer courseId={openCourseId!} file={pdfFile} />
            )}
          </>
        )}
      </div>
    </>
  );
}
