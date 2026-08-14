'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import styles from './ProgressDialog.module.css';

interface ProgressDialogProps {
  isOpen: boolean;
  progress: number;
  title?: string;
  message?: string;
  status?: 'downloading' | 'success' | 'error';
  onClose: () => void;
  onRetry?: () => void;
}

export const ProgressDialog = ({
  isOpen,
  progress,
  title = 'Downloading...',
  message = 'Please wait while we save this for offline reading.',
  status = 'downloading',
  onClose,
  onRetry,
}: ProgressDialogProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={styles.overlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className={styles.dialog}
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
          >
            {status === 'success' && (
              <CheckCircle2 size={48} color="#4caf50" />
            )}
            {status === 'error' && (
              <AlertCircle size={48} color="#f44336" />
            )}
            
            <h3 className={styles.title}>{title}</h3>
            <p className={styles.message}>{message}</p>

            {status === 'downloading' && (
              <div className={styles.progressContainer}>
                <div
                  className={styles.progressBar}
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}

            <div className={styles.actions}>
              {status === 'error' && onRetry && (
                <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={onRetry}>
                  Retry
                </button>
              )}
              {status !== 'downloading' && (
                <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={onClose}>
                  Close
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
