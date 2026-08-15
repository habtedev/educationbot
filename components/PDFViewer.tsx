'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ZoomIn, ZoomOut } from 'lucide-react';
import { useCourseStore } from '../store/useCourseStore';
import styles from './PDFViewer.module.css';

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

// Kept outside — never changes, prevents Document from reloading
const PDF_OPTIONS = {
  cMapUrl: '/cmaps/',
  cMapPacked: true,
  standardFontDataUrl: '/standard_fonts/',
};

// A4 ratio
const PAGE_RATIO = 1.414;

interface PDFViewerProps {
  courseId: string;
  // Accepts: pre-parsed PDFDocumentProxy | { data: ArrayBuffer } | URL string
  // Pre-parsed proxy = instant render, no loading state at all
  file: unknown;
}

interface VirtualPageProps {
  pageNumber: number;
  width: number;
  scale: number;
  scrollRoot: HTMLDivElement | null;
  onVisible: (page: number) => void;
}

// ─── Virtual Page ──────────────────────────────────────────────────────────
// Each page is a placeholder div. The real <Page> only renders when
// the placeholder enters the viewport. This is the key to instant opening:
// instead of rendering 234 pages, we only render ~2-3 visible ones.
const VirtualPage = ({ pageNumber, width, scale, scrollRoot, onVisible }: VirtualPageProps) => {
  const [shouldRender, setShouldRender] = useState(pageNumber <= 2); // render first 2 pages immediately
  const wrapperRef = useRef<HTMLDivElement>(null);
  const pageH = width * PAGE_RATIO;

  useEffect(() => {
    if (shouldRender) return; // already rendering
    const el = wrapperRef.current;
    if (!el || !scrollRoot) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldRender(true);
          observer.disconnect();
        }
      },
      {
        root: scrollRoot,
        // Start rendering 1 full screen height BEFORE the page scrolls into view
        rootMargin: `${window.innerHeight}px 0px ${window.innerHeight}px 0px`,
        threshold: 0,
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [scrollRoot, shouldRender]);

  // Track current page via center-line intersection
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el || !scrollRoot) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) onVisible(pageNumber);
      },
      {
        root: scrollRoot,
        rootMargin: '-45% 0px -45% 0px',
        threshold: 0,
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [scrollRoot, pageNumber, onVisible]);

  return (
    <div
      ref={wrapperRef}
      className={styles.pageWrapper}
      data-page={pageNumber}
      style={{ height: pageH * scale }}
    >
      {shouldRender ? (
        <Page
          pageNumber={pageNumber}
          width={width}
          scale={scale}
          renderTextLayer={false}
          renderAnnotationLayer={false}
          loading={
            <div
              className={styles.pagePlaceholder}
              style={{ width: width * scale, height: pageH * scale }}
            />
          }
        />
      ) : (
        // Skeleton placeholder — correct height so scrollbar is accurate
        <div
          className={styles.pagePlaceholder}
          style={{ width: width * scale, height: pageH * scale }}
        />
      )}
    </div>
  );
};

// ─── Main PDFViewer ────────────────────────────────────────────────────────
export const PDFViewer = ({ courseId, file }: PDFViewerProps) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { progress, updateProgress } = useCourseStore();

  const pageWidth = useRef<number>(
    typeof window !== 'undefined' ? Math.min(window.innerWidth, 768) : 360
  );

  // Restore saved page on mount only
  useEffect(() => {
    const saved = progress[courseId];
    if (saved?.page && saved.page > 1) {
      setPageNumber(saved.page);
    }
  }, [courseId]); // eslint-disable-line

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    try {
      console.timeEnd(`⏱️ Instant Open [${courseId}]`);
    } catch {
      // Ignore if timer was not active
    }
  }, [courseId]);

  const onPageVisible = useCallback((page: number) => {
    setPageNumber(page);
    updateProgress(courseId, page, numPages);
  }, [courseId, numPages, updateProgress]);

  const handleZoomIn = useCallback(() => setScale(s => Math.min(+(s + 0.25).toFixed(2), 3.0)), []);
  const handleZoomOut = useCallback(() => setScale(s => Math.max(+(s - 0.25).toFixed(2), 0.5)), []);
  const handleResetZoom = useCallback(() => setScale(1.0), []);

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <span className={styles.pageInfo}>
          {pageNumber} / {numPages || '—'}
        </span>
        <div className={styles.controls}>
          <button onClick={handleZoomOut} className={styles.iconBtn} aria-label="Zoom out">
            <ZoomOut size={18} />
          </button>
          <button onClick={handleResetZoom} className={styles.scaleBtn}>
            {Math.round(scale * 100)}%
          </button>
          <button onClick={handleZoomIn} className={styles.iconBtn} aria-label="Zoom in">
            <ZoomIn size={18} />
          </button>
        </div>
      </div>

      <div className={styles.viewerArea}>
        <Document
          file={file as any}
          options={PDF_OPTIONS}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={
            <div className={styles.loader}>
              <div className={styles.spinner} />
              <span>Opening...</span>
            </div>
          }
          error={
            <div className={styles.loader}>
              <span>❌ Could not load PDF.</span>
            </div>
          }
        >
          <div
            className={styles.scrollContainer}
            id="pdf-scroll-container"
            ref={scrollContainerRef}
          >
            {numPages > 0 && Array.from({ length: numPages }, (_, i) => (
              <VirtualPage
                key={i + 1}
                pageNumber={i + 1}
                width={pageWidth.current}
                scale={scale}
                scrollRoot={scrollContainerRef.current}
                onVisible={onPageVisible}
              />
            ))}
          </div>
        </Document>
      </div>
    </div>
  );
};
