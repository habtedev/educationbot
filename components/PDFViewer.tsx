'use client';

import { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Bookmark } from 'lucide-react';
import { useCourseStore } from '../store/useCourseStore';
import styles from './PDFViewer.module.css';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';

// Set worker url manually
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

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

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const scrollLeft = container.scrollLeft;
    const clientWidth = container.clientWidth;
    // Calculate which page we are on based on scroll position
    const newPage = Math.round(scrollLeft / clientWidth) + 1;
    
    if (newPage !== pageNumber && newPage >= 1 && newPage <= numPages) {
      setPageNumber(newPage);
      updateProgress(courseId, newPage, numPages);
    }
  };

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.2, 3.0));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.6));

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
            className={styles.horizontalScrollContainer} 
            onScroll={handleScroll}
            id="pdf-scroll-container"
          >
            {Array.from(new Array(numPages), (el, index) => {
              const p = index + 1;
              return (
                <div key={`page_${p}`} className={styles.pageWrapper}>
                  {/* Only fully render the page if it is within 3 pages of the current page to prevent memory crashes on phones */}
                  {Math.abs(p - pageNumber) <= 3 ? (
                    <Page
                      pageNumber={p}
                      scale={scale}
                      renderTextLayer={true}
                      renderAnnotationLayer={true}
                      className="pdf-page"
                      width={window.innerWidth > 768 ? 768 : window.innerWidth - 32}
                    />
                  ) : (
                    <div style={{ width: window.innerWidth - 32, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
                      Loading page {p}...
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Document>
      </div>
    </div>
  );
};
