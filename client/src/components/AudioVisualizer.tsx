import { useEffect, useRef } from 'react'

interface AudioVisualizerProps {
  analyser: AnalyserNode | null
  isActive: boolean
  width?: number
  height?: number
  barCount?: number
  barColor?: string
  barGap?: number
}

/**
 * Winamp-style audio visualizer with vertical bars
 */
export function AudioVisualizer({
  analyser,
  isActive,
  width = 300,
  height = 100,
  barCount = 32,
  barColor = '#4CAF50',
  barGap = 2,
}: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !analyser || !isActive) {
      // Clear canvas when inactive
      if (canvas) {
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.clearRect(0, 0, width, height)
          // Draw idle state
          drawIdleState(ctx, width, height, barCount, barGap, barColor)
        }
      }
      return
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    const barWidth = (width - (barCount - 1) * barGap) / barCount

    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate)

      // Get frequency data
      analyser.getByteFrequencyData(dataArray)

      // Clear canvas
      ctx.fillStyle = '#1a1a1a'
      ctx.fillRect(0, 0, width, height)

      // Calculate step to sample frequency data
      const step = Math.floor(bufferLength / barCount)

      for (let i = 0; i < barCount; i++) {
        // Get average value for this bar
        let sum = 0
        for (let j = 0; j < step; j++) {
          sum += dataArray[i * step + j]
        }
        const average = sum / step

        // Normalize to 0-1 range
        const normalizedValue = average / 255

        // Calculate bar height
        const barHeight = normalizedValue * height

        // Draw bar
        const x = i * (barWidth + barGap)
        const y = height - barHeight

        // Gradient from bottom (bright) to top (dark)
        const gradient = ctx.createLinearGradient(x, height, x, y)
        gradient.addColorStop(0, barColor)
        gradient.addColorStop(1, adjustColorBrightness(barColor, -30))

        ctx.fillStyle = gradient
        ctx.fillRect(x, y, barWidth, barHeight)
      }
    }

    animate()

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [analyser, isActive, width, height, barCount, barColor, barGap])

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        border: '1px solid #333',
        borderRadius: '4px',
        backgroundColor: '#1a1a1a',
      }}
    />
  )
}

/**
 * Draw idle state (flat bars at bottom)
 */
function drawIdleState(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  barCount: number,
  barGap: number,
  barColor: string
) {
  ctx.fillStyle = '#1a1a1a'
  ctx.fillRect(0, 0, width, height)

  const barWidth = (width - (barCount - 1) * barGap) / barCount
  const idleBarHeight = 4

  ctx.fillStyle = adjustColorBrightness(barColor, -60)

  for (let i = 0; i < barCount; i++) {
    const x = i * (barWidth + barGap)
    const y = height - idleBarHeight
    ctx.fillRect(x, y, barWidth, idleBarHeight)
  }
}

/**
 * Adjust color brightness
 */
function adjustColorBrightness(color: string, amount: number): string {
  // Parse hex color
  const hex = color.replace('#', '')
  const r = Math.max(0, Math.min(255, parseInt(hex.substring(0, 2), 16) + amount))
  const g = Math.max(0, Math.min(255, parseInt(hex.substring(2, 4), 16) + amount))
  const b = Math.max(0, Math.min(255, parseInt(hex.substring(4, 6), 16) + amount))

  return `rgb(${r}, ${g}, ${b})`
}
