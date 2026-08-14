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
    updateProgress(courseId, pageNumber, numPages);
  };

  const changePage = (offset: number) => {
    const newPage = Math.min(Math.max(1, pageNumber + offset), numPages || 1);
    setPageNumber(newPage);
    updateProgress(courseId, newPage, numPages);
  };

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.2, 3.0));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.6));

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <div className={styles.controls}>
          <button onClick={() => changePage(-1)} disabled={pageNumber <= 1} className={styles.iconBtn}>
            <ChevronLeft size={24} />
          </button>
          <span className={styles.pageInfo}>
            {pageNumber} / {numPages || '?'}
          </span>
          <button onClick={() => changePage(1)} disabled={pageNumber >= numPages} className={styles.iconBtn}>
            <ChevronRight size={24} />
          </button>
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
          {numPages > 0 && (
            <Page
              pageNumber={pageNumber}
              scale={scale}
              renderTextLayer={true}
              renderAnnotationLayer={true}
              className="pdf-page"
              width={window.innerWidth > 768 ? 768 : window.innerWidth - 32}
            />
          )}
        </Document>
      </div>
    </div>
  );
};
