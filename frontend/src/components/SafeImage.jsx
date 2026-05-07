import React, { useMemo, useState } from 'react'

export default function SafeImage({
  src,
  alt,
  className,
  fallback,
  title,
  referrerPolicy = 'no-referrer-when-downgrade',
}) {
  const normalizedSrc = useMemo(() => (typeof src === 'string' ? src.trim() : src), [src])
  const [failed, setFailed] = useState(false)

  if (!normalizedSrc || failed) {
    return (
      fallback ?? (
        <div
          className={className}
          title={title}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        />
      )
    )
  }

  return (
    <img
      src={normalizedSrc}
      alt={alt}
      className={className}
      title={title}
      loading="lazy"
      referrerPolicy={referrerPolicy}
      onError={(e) => {
        // Deja una pista visible en consola para depurar fallos en producción (403/CSP/etc.)
        // eslint-disable-next-line no-console
        console.warn('[SafeImage] Error cargando imagen', { src: normalizedSrc, alt, currentSrc: e?.currentTarget?.currentSrc })
        setFailed(true)
      }}
    />
  )
}

