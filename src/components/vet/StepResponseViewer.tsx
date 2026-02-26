'use client';

import styles from './StepResponseViewer.module.css';

interface ResponseData {
  id: string;
  user_id: string;
  response_text: string | null;
  media_urls: string[];
  media_types: string[];
  created_at: string;
}

interface StepResponseViewerProps {
  response: ResponseData;
}

export function StepResponseViewer({ response }: StepResponseViewerProps) {
  const dateStr = new Date(response.created_at).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className={styles.response}>
      <div className={styles.responseHeader}>
        <span className={styles.responseDate}>{dateStr}</span>
      </div>

      {response.response_text && (
        <p className={styles.responseText}>{response.response_text}</p>
      )}

      {response.media_urls && response.media_urls.length > 0 && (
        <div className={styles.mediaGrid}>
          {response.media_urls.map((url, index) => {
            const mediaType = response.media_types?.[index] || 'document';

            if (mediaType === 'photo') {
              return (
                <a
                  key={index}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.mediaItem}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`Response media ${index + 1}`} className={styles.mediaImage} />
                </a>
              );
            }

            if (mediaType === 'video') {
              return (
                <div key={index} className={styles.mediaItem}>
                  <video src={url} controls className={styles.mediaVideo}>
                    <track kind="captions" />
                  </video>
                </div>
              );
            }

            // Document
            return (
              <a
                key={index}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.documentLink}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                Document {index + 1}
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
