import Image from 'next/image';

interface PetImageProps {
  src: string | null | undefined;
  alt: string;
  width: number;
  height: number;
  className?: string;
  priority?: boolean;
  fallback?: React.ReactNode;
}

// Resize/format pet photos directly through Supabase Storage's transformation
// API (Pro plan feature). Per audit F-17 / D-5 option C.
//
// Original Supabase public URLs look like:
//   https://<proj>.supabase.co/storage/v1/object/public/<bucket>/<key>
// Transformed render URLs look like:
//   https://<proj>.supabase.co/storage/v1/render/image/public/<bucket>/<key>
//   ?width=W&height=H&resize=cover&quality=80
//
// For Supabase URLs we set unoptimized so Vercel's image optimizer is
// bypassed (we get CDN-direct delivery from Supabase). For non-Supabase
// URLs (e.g., /public assets) we let Next.js optimize normally.
function buildSrc(src: string, width: number, height: number): {
  finalSrc: string;
  isSupabase: boolean;
} {
  const isSupabase = src.includes('/storage/v1/object/');
  if (!isSupabase) {
    return { finalSrc: src, isSupabase: false };
  }

  try {
    // Account for high-DPI displays — request 2x the layout size.
    const renderUrl = src.replace('/storage/v1/object/', '/storage/v1/render/image/');
    const url = new URL(renderUrl);
    url.searchParams.set('width', String(width * 2));
    url.searchParams.set('height', String(height * 2));
    url.searchParams.set('resize', 'cover');
    url.searchParams.set('quality', '80');
    return { finalSrc: url.toString(), isSupabase: true };
  } catch {
    return { finalSrc: src, isSupabase: false };
  }
}

export function PetImage({
  src,
  alt,
  width,
  height,
  className,
  priority,
  fallback = null,
}: PetImageProps) {
  if (!src) {
    return <>{fallback}</>;
  }

  const { finalSrc, isSupabase } = buildSrc(src, width, height);

  return (
    <Image
      src={finalSrc}
      alt={alt}
      width={width}
      height={height}
      className={className}
      priority={priority}
      unoptimized={isSupabase}
    />
  );
}
