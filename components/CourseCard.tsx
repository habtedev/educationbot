'use client';

import { ChevronRight, BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';
import styles from './CourseCard.module.css';

interface CourseCardProps {
  id: string;
  title: string;
  desc?: string;
  onOpen?: () => void;
}

const COURSE_EMOJIS: Record<string, string> = {
  'logic': '🧠',
  'psychology': '👥',
  'anthropology': '🦴',
  'economics': '📈',
  'emerging-tech': '🤖',
  'global-trend': '🌍',
  'civics': '⚖️',
};

export const CourseCard = ({
  id,
  title,
  desc,
  onOpen,
}: CourseCardProps) => {
  const emoji = COURSE_EMOJIS[id] || '📚';

  return (
    <motion.div
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      className={styles.card}
      onClick={onOpen}
    >
      <div className={`${styles.icon} ${styles[id] || ''}`}>
        {emoji}
      </div>

      <div className={styles.content}>
        <h3 className={styles.title}>{title}</h3>
        {desc && <p className={styles.desc}>{desc}</p>}
        
        <div className={styles.badge}>
          <BookOpen size={12} /> TAP TO READ
        </div>
      </div>

      <div className={`${styles.actionBtn} ${styles[id] || ''}`}>
        <ChevronRight size={16} />
      </div>
    </motion.div>
  );
};
