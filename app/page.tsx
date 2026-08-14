'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, Sun, Lock } from 'lucide-react';
import { SearchBar } from '../components/SearchBar';
import { CourseCard } from '../components/CourseCard';
import { ProgressDialog } from '../components/ProgressDialog';
import { checkIsCached, cachePdf } from '../lib/cache';
import styles from './page.module.css';

// Added description for the course subtitles seen in the image
const AVAILABLE_COURSES = [
  { id: 'logic', title: 'Logic and Critical Thinking', desc: 'Reasoning & Analysis', file: 'Logic and Critical Thinking.pdf', sizeMB: 2.5 },
  { id: 'psychology', title: 'Psychology', desc: 'Mind & Behavior', file: 'Psychology.pdf', sizeMB: 9.1 },
  { id: 'anthropology', title: 'Anthropology', desc: 'Human Origins & Culture', file: 'Anthropology.pdf', sizeMB: 0.8 },
  { id: 'economics', title: 'Economics', desc: 'Markets & Growth', file: 'Economics.pdf', sizeMB: 8.8 },
  { id: 'emerging-tech', title: 'Emerging Technology', desc: 'AI, IoT & Future Tech', file: 'Emerging technology.pdf', sizeMB: 1.1 },
  { id: 'global-trend', title: 'Global Trends', desc: 'World Affairs & Shifts', file: 'Global trend.pdf', sizeMB: 2.0 },
  { id: 'civics', title: 'Civics', desc: 'Rights, Law & Society', file: 'Civics.pdf', sizeMB: 34.0 },
];

export default function Home() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [cachedStatus, setCachedStatus] = useState<Record<string, boolean>>({});
  const [isClient, setIsClient] = useState(false);
  
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadStatus, setDownloadStatus] = useState<'downloading' | 'success' | 'error'>('downloading');

  useEffect(() => {
    setIsClient(true);
    AVAILABLE_COURSES.forEach(async (course) => {
      const cached = await checkIsCached(`/courses/${course.file}`);
      setCachedStatus(prev => ({ ...prev, [course.id]: cached }));
    });
  }, []);

  const handleOpenCourse = (courseId: string) => {
    router.push(`/course/${courseId}`);
  };

  const handleDownloadAll = async () => {
    setIsDownloading(true);
    setDownloadStatus('downloading');
    
    try {
      let completed = 0;
      for (const course of AVAILABLE_COURSES) {
        if (!cachedStatus[course.id]) {
          await cachePdf(`/courses/${course.file}`);
          setCachedStatus(prev => ({ ...prev, [course.id]: true }));
        }
        completed++;
        setDownloadProgress(Math.round((completed / AVAILABLE_COURSES.length) * 100));
      }
      setDownloadStatus('success');
      setTimeout(() => setIsDownloading(false), 2000);
    } catch (e) {
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
    <main className={styles.main}>
      <header className={styles.topBar}>
        <button className={styles.iconBtn} style={{ background: 'transparent' }}>
          <Menu size={24} />
        </button>
        <div className={styles.topTitle}>
          📚 A to Z Academy
        </div>
        <button className={styles.iconBtn}>
          <Sun size={20} color="#ffb300" />
        </button>
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
  );
}
