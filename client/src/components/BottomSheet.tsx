import { useState, useRef, useEffect } from 'react'

interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  title?: string
  snapPoints?: number[] // Heights in vh (e.g., [30, 60, 90])
}

/**
 * Mobile-optimized bottom sheet component
 * Supports swipe gestures and snap points
 */
export function BottomSheet({
  isOpen,
  onClose,
  children,
  title = 'Files',
  snapPoints = [30, 60, 90],
}: BottomSheetProps) {
  const [currentSnapIndex, setCurrentSnapIndex] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [startY, setStartY] = useState(0)
  const [currentY, setCurrentY] = useState(0)
  const sheetRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) {
      setCurrentSnapIndex(0)
    }
  }, [isOpen])

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true)
    setStartY(e.touches[0].clientY)
    setCurrentY(e.touches[0].clientY)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return
    setCurrentY(e.touches[0].clientY)
  }

  const handleTouchEnd = () => {
    if (!isDragging) return
    setIsDragging(false)

    const deltaY = currentY - startY
    const threshold = 50 // pixels

    if (deltaY > threshold) {
      // Swipe down - go to smaller snap point or close
      if (currentSnapIndex === 0) {
        onClose()
      } else {
        setCurrentSnapIndex(currentSnapIndex - 1)
      }
    } else if (deltaY < -threshold) {
      // Swipe up - go to larger snap point
      if (currentSnapIndex < snapPoints.length - 1) {
        setCurrentSnapIndex(currentSnapIndex + 1)
      }
    }
  }

  if (!isOpen) return null

  const height = snapPoints[currentSnapIndex]
  const dragOffset = isDragging ? Math.max(0, currentY - startY) : 0

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 999,
          opacity: isOpen ? 1 : 0,
          transition: 'opacity 0.3s ease',
        }}
      />

      {/* Bottom Sheet */}
      <div
        ref={sheetRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: `${height}vh`,
          backgroundColor: '#ffffff',
          borderTopLeftRadius: '16px',
          borderTopRightRadius: '16px',
          boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.1)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          transform: `translateY(${dragOffset}px)`,
          transition: isDragging ? 'none' : 'all 0.3s ease',
        }}
      >
        {/* Handle */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '12px',
            cursor: 'grab',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '4px',
              backgroundColor: '#ccc',
              borderRadius: '2px',
            }}
          />
        </div>

        {/* Header */}
        <div
          style={{
            padding: '0 16px 12px',
            borderBottom: '1px solid #eee',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#333' }}>{title}</h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              padding: '4px 8px',
              color: '#666',
            }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
          }}
        >
          {children}
        </div>
      </div>
    </>
  )
}
