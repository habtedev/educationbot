'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ZoomIn, ZoomOut } from 'lucide-react';
import { useCourseStore } from '../store/useCourseStore';
import styles from './PDFViewer.module.css';

// Worker is local — cached offline by PWA
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

// CRITICAL: Keep options object OUTSIDE component so it never changes reference.
// If created inside, React re-creates it on every render → Document reloads → white screen!
const PDF_OPTIONS = {
  cMapUrl: '/cmaps/',
  cMapPacked: true,
  standardFontDataUrl: '/standard_fonts/',
};

interface PDFViewerProps {
  courseId: string;
  url: string;
}

export const PDFViewer = ({ courseId, url }: PDFViewerProps) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  // scale is CSS-only — we never pass it to <Page>, so PDF never re-renders on zoom!
  const [scale, setScale] = useState<number>(1.0);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const pagesWrapRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const { progress, updateProgress } = useCourseStore();

  // Measure actual screen width once
  const pageWidth = useRef<number>(
    typeof window !== 'undefined' ? Math.min(window.innerWidth, 768) : 360
  );

  // Restore saved progress on mount only
  useEffect(() => {
    const saved = progress[courseId];
    if (saved?.page && saved.page > 1) {
      setPageNumber(saved.page);
    }
  }, [courseId]); // eslint-disable-line react-hooks/exhaustive-deps

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  }, []);

  // Re-attach IntersectionObserver whenever pages re-render
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || numPages === 0) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const page = Number(entry.target.getAttribute('data-page'));
          if (page) {
            setPageNumber(page);
            updateProgress(courseId, page, numPages);
          }
        }
      });
    }, {
      root: container,
      rootMargin: '-45% 0px -45% 0px',
      threshold: 0,
    });

    pageRefs.current.forEach((el) => { if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, [numPages, courseId, updateProgress]);

  const setPageRef = useCallback((el: HTMLDivElement | null, pageNum: number) => {
    if (el) pageRefs.current.set(pageNum, el);
    else pageRefs.current.delete(pageNum);
  }, []);

  // Zoom uses CSS transform on the wrapper — ZERO PDF re-renders, purely GPU!
  const handleZoomIn = useCallback(() => setScale(s => Math.min(+(s + 0.25).toFixed(2), 3.0)), []);
  const handleZoomOut = useCallback(() => setScale(s => Math.max(+(s - 0.25).toFixed(2), 0.5)), []);
  const handleResetZoom = useCallback(() => setScale(1.0), []);

  const estimatedPageHeight = pageWidth.current * 1.414;

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
          file={url}
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
          {/* scrollContainer is the real scrollable area */}
          <div
            className={styles.scrollContainer}
            id="pdf-scroll-container"
            ref={scrollContainerRef}
          >
            {/* pagesWrap is the CSS-scaled inner wrapper — zoom is purely visual, no re-renders */}
            <div
              ref={pagesWrapRef}
              className={styles.pagesWrap}
              style={{
                transform: `scale(${scale})`,
                transformOrigin: 'top center',
                // Adjust scroll height so the scrollbar stays correct when zoomed
                paddingBottom: scale > 1 ? `${(scale - 1) * estimatedPageHeight * numPages}px` : 0,
              }}
            >
              {numPages > 0 && Array.from({ length: numPages }, (_, i) => {
                const p = i + 1;
                return (
                  <div
                    key={`page_${p}`}
                    className={styles.pageWrapper}
                    data-page={p}
                    ref={(el) => setPageRef(el, p)}
                  >
                    <Page
                      pageNumber={p}
                      width={pageWidth.current}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                      loading={
                        <div
                          className={styles.pagePlaceholder}
                          style={{
                            width: pageWidth.current,
                            height: estimatedPageHeight,
                          }}
                        />
                      }
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </Document>
      </div>
    </div>
  );
};
