'use client';

import { useState, useRef, useCallback } from 'react';
import { useUploadThing } from '@/lib/uploadthing/hooks';
import { useToast } from '@/components/ui/Toast';
import styles from './MessageComposer.module.css';

interface MessageComposerProps {
  onSend: (content: string, messageType?: 'text' | 'image', attachmentUrl?: string) => Promise<void>;
  disabled?: boolean;
}

export function MessageComposer({ onSend, disabled = false }: MessageComposerProps) {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [pendingImage, setPendingImage] = useState<{ url: string; file: File } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { startUpload } = useUploadThing('followUpImage', {
    onUploadError: (error) => {
      console.error('Upload error:', error);
      toast('Failed to upload image', 'error');
      setIsUploading(false);
    },
  });

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();

    const trimmedMessage = message.trim();

    // If there's a pending image, send it
    if (pendingImage) {
      setIsSending(true);
      try {
        await onSend(trimmedMessage || 'Image', 'image', pendingImage.url);
        setMessage('');
        setPendingImage(null);
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
        }
      } catch (error) {
        console.error('Error sending image:', error);
        toast('Failed to send image', 'error');
      } finally {
        setIsSending(false);
      }
      return;
    }

    // Send text message
    if (!trimmedMessage || isSending || disabled) return;

    setIsSending(true);

    try {
      await onSend(trimmedMessage, 'text');
      setMessage('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast('Failed to send message', 'error');
    } finally {
      setIsSending(false);
    }
  }, [message, pendingImage, isSending, disabled, onSend, toast]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);

    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
  }, []);

  const handleImageClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast('Please select an image file', 'error');
      return;
    }

    // Validate file size (4MB max)
    if (file.size > 4 * 1024 * 1024) {
      toast('Image must be under 4MB', 'error');
      return;
    }

    setIsUploading(true);

    try {
      const result = await startUpload([file]);
      if (result && result[0]) {
        setPendingImage({
          url: result[0].ufsUrl,
          file,
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast('Failed to upload image', 'error');
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [startUpload, toast]);

  const handleCancelImage = useCallback(() => {
    setPendingImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const isDisabled = disabled || isSending || isUploading;
  const canSend = pendingImage || message.trim();

  return (
    <div className={styles.wrapper}>
      {/* Image Preview */}
      {pendingImage && (
        <div className={styles.imagePreview}>
          <img
            src={pendingImage.url}
            alt="Preview"
            className={styles.previewImage}
          />
          <button
            type="button"
            onClick={handleCancelImage}
            className={styles.cancelImage}
            aria-label="Remove image"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.container}>
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className={styles.hiddenInput}
        />

        {/* Image upload button */}
        <button
          type="button"
          onClick={handleImageClick}
          disabled={isDisabled}
          className={styles.imageButton}
          aria-label="Attach image"
        >
          {isUploading ? (
            <span className={styles.uploadSpinner} />
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          )}
        </button>

        <textarea
          ref={textareaRef}
          value={message}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={pendingImage ? 'Add a caption (optional)...' : 'Type a message...'}
          disabled={isDisabled}
          className={styles.textarea}
          rows={1}
        />

        <button
          type="submit"
          disabled={!canSend || isDisabled}
          className={styles.sendButton}
          aria-label="Send message"
        >
          {isSending ? (
            <span className={styles.spinner} />
          ) : (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          )}
        </button>
      </form>
    </div>
  );
}
