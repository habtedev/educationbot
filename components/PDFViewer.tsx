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
  file: unknown;
  fallbackUrl?: string;
}

interface VirtualPageProps {
  pageNumber: number;
  width: number;
  scale: number;
  scrollRoot: HTMLDivElement | null;
  onVisible: (page: number) => void;
}

// ─── Virtual Page ──────────────────────────────────────────────────────────
const VirtualPage = ({ pageNumber, width, scale, scrollRoot, onVisible }: VirtualPageProps) => {
  const [shouldRender, setShouldRender] = useState(pageNumber <= 5); // render first 5 pages immediately
  const wrapperRef = useRef<HTMLDivElement>(null);
  const pageH = width * PAGE_RATIO;

  useEffect(() => {
    if (shouldRender) return;
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
        rootMargin: `${Math.round(window.innerHeight * 2.5)}px 0px ${Math.round(window.innerHeight * 2.5)}px 0px`,
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
        <div
          className={styles.pagePlaceholder}
          style={{ width: width * scale, height: pageH * scale }}
        />
      )}
    </div>
  );
};

// ─── Main PDFViewer ────────────────────────────────────────────────────────
export const PDFViewer = ({ courseId, file, fallbackUrl }: PDFViewerProps) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [currentFile, setCurrentFile] = useState<unknown>(file);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { progress, updateProgress } = useCourseStore();

  const pageWidth = useRef<number>(
    typeof window !== 'undefined' ? Math.min(window.innerWidth, 768) : 360
  );

  // Sync prop changes
  useEffect(() => {
    setCurrentFile(file);
  }, [file]);

  // Restore saved page on mount only
  useEffect(() => {
    const saved = progress[courseId];
    if (saved?.page && saved.page > 1) {
      setPageNumber(saved.page);
    }
  }, [courseId]); // eslint-disable-line

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  }, []);

  const onDocumentLoadError = useCallback(() => {
    // If RAM buffer failed, auto-fallback to URL string
    if (fallbackUrl && currentFile !== fallbackUrl) {
      setCurrentFile(fallbackUrl);
    }
  }, [fallbackUrl, currentFile]);

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
          file={currentFile as any}
          options={PDF_OPTIONS}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={
            <div className={styles.loader}>
              <div className={styles.spinner} />
              <span>Opening...</span>
            </div>
          }
          error={
            <div className={styles.loader}>
              <span>❌ Could not load PDF. Please tap back and open again.</span>
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
