'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from '@uploadthing/react';
import { generateClientDropzoneAccept, generatePermittedFileTypes } from 'uploadthing/client';
import { useUploadThing } from '@/lib/uploadthing/hooks';
import { cn } from '@/lib/utils';
import styles from './FileUpload.module.css';

interface FileUploadProps {
  endpoint: 'petPhoto' | 'petGallery' | 'medicalDocument' | 'consultationImage';
  onUploadComplete: (urls: string[]) => void;
  onUploadError?: (error: Error) => void;
  maxFiles?: number;
  className?: string;
}

export function FileUpload({
  endpoint,
  onUploadComplete,
  onUploadError,
  maxFiles = 1,
  className,
}: FileUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);

  const { startUpload, isUploading, routeConfig } = useUploadThing(endpoint, {
    onClientUploadComplete: (res) => {
      const urls = res?.map((file) => file.ufsUrl) ?? [];
      onUploadComplete(urls);
      setFiles([]);
      setUploadProgress(0);
    },
    onUploadError: (error) => {
      console.error('Upload error:', error);
      onUploadError?.(error);
      setUploadProgress(0);
    },
    onUploadProgress: (progress) => {
      setUploadProgress(progress);
    },
  });

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      setFiles(acceptedFiles);
    },
    []
  );

  const fileTypes = routeConfig ? generatePermittedFileTypes(routeConfig) : { fileTypes: undefined };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: fileTypes.fileTypes ? generateClientDropzoneAccept(fileTypes.fileTypes) : undefined,
    maxFiles,
    disabled: isUploading,
  });

  const handleUpload = async () => {
    if (files.length === 0) return;
    await startUpload(files);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className={cn(styles.container, className)}>
      <div
        {...getRootProps()}
        className={cn(
          styles.dropzone,
          isDragActive && styles.dragActive,
          isUploading && styles.uploading
        )}
      >
        <input {...getInputProps()} />
        <div className={styles.dropzoneContent}>
          <svg
            className={styles.icon}
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          {isDragActive ? (
            <p className={styles.text}>Drop files here...</p>
          ) : (
            <>
              <p className={styles.text}>
                Drag & drop files here, or tap to select
              </p>
              <p className={styles.hint}>
                {endpoint === 'medicalDocument'
                  ? 'PDF or images up to 16MB'
                  : 'Images up to 4MB'}
              </p>
            </>
          )}
        </div>
      </div>

      {files.length > 0 && (
        <div className={styles.fileList}>
          {files.map((file, index) => (
            <div key={`${file.name}-${index}`} className={styles.fileItem}>
              {file.type.startsWith('image/') && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={URL.createObjectURL(file)}
                  alt={file.name}
                  className={styles.preview}
                />
              )}
              {file.type === 'application/pdf' && (
                <div className={styles.pdfIcon}>PDF</div>
              )}
              <div className={styles.fileInfo}>
                <span className={styles.fileName}>{file.name}</span>
                <span className={styles.fileSize}>
                  {(file.size / 1024).toFixed(1)} KB
                </span>
              </div>
              <button
                type="button"
                className={styles.removeButton}
                onClick={() => removeFile(index)}
                disabled={isUploading}
                aria-label="Remove file"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}

          <button
            type="button"
            className={styles.uploadButton}
            onClick={handleUpload}
            disabled={isUploading}
          >
            {isUploading ? (
              <>
                <span className={styles.spinner} />
                Uploading... {uploadProgress}%
              </>
            ) : (
              'Upload'
            )}
          </button>
        </div>
      )}

      {isUploading && (
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
      )}
    </div>
  );
}
