'use client';

import { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Bookmark } from 'lucide-react';
import { useCourseStore } from '../store/useCourseStore';
import styles from './PDFViewer.module.css';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';

// Set worker url manually
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFViewerProps {
  courseId: string;
  url: string;
}

export const PDFViewer = ({ courseId, url }: PDFViewerProps) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  
  const { progress, updateProgress } = useCourseStore();

  useEffect(() => {
    const saved = progress[courseId];
    if (saved && saved.page) {
      setPageNumber(saved.page);
    }
  }, [courseId, progress]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    // Removed automatic progress update here to rely on scroll
  };

  const observer = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    // Setup intersection observer to track which page is currently in view
    observer.current = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const page = Number(entry.target.getAttribute('data-page'));
          if (page && page !== pageNumber) {
            setPageNumber(page);
            updateProgress(courseId, page, numPages);
          }
        }
      });
    }, {
      root: document.getElementById('pdf-scroll-container'),
      // Create a virtual line in the center of the screen. Whichever page touches it is the "current" page.
      // This fixes the bug where zoomed-in pages get stuck because they are too tall to ever be 50% visible.
      rootMargin: "-50% 0px -50% 0px",
      threshold: 0 
    });

    return () => {
      if (observer.current) observer.current.disconnect();
    };
  }, [pageNumber, courseId, numPages, updateProgress]);

  // Attach observer to page wrappers as they render
  const handleRef = (el: HTMLDivElement | null) => {
    if (el && observer.current) {
      observer.current.observe(el);
    }
  };

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.2, 3.0));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.6));

  // Academic PDFs are standard A4 (1 : 1.414 ratio)
  const pageWidth = typeof window !== 'undefined' ? (window.innerWidth > 768 ? 768 : window.innerWidth - 32) : 300;
  const estimatedPageHeight = pageWidth * 1.414;

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <div className={styles.controls}>
          <span className={styles.pageInfo}>
            {pageNumber} / {numPages || '?'}
          </span>
        </div>
        
        <div className={styles.controls}>
          <button onClick={handleZoomOut} className={styles.iconBtn}>
            <ZoomOut size={20} />
          </button>
          <button onClick={handleZoomIn} className={styles.iconBtn}>
            <ZoomIn size={20} />
          </button>
        </div>
      </div>

      <div className={styles.viewerArea}>
        <Document
          file={url}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={
            <div className={styles.loader}>
              <div>Loading PDF...</div>
            </div>
          }
        >
          <div 
            className={styles.scrollContainer} 
            id="pdf-scroll-container"
          >
            {Array.from(new Array(numPages), (el, index) => {
              const p = index + 1;
              
              return (
                <div 
                  key={`page_${p}`} 
                  className={styles.pageWrapper}
                  data-page={p}
                  ref={handleRef}
                  style={{ minHeight: estimatedPageHeight }}
                >
                  <Page
                    pageNumber={p}
                    scale={scale}
                    renderTextLayer={true}
                    renderAnnotationLayer={true}
                    className="pdf-page"
                    width={pageWidth}
                    loading={
                      <div style={{ width: pageWidth, height: estimatedPageHeight, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
                        Rendering...
                      </div>
                    }
                  />
                </div>
              );
            })}
          </div>
        </Document>
      </div>
    </div>
  );
};
