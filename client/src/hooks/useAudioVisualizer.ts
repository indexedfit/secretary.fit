import { useRef, useEffect, useCallback } from 'react'

interface UseAudioVisualizerOptions {
  audioContext: AudioContext | null
  fftSize?: number
  smoothingTimeConstant?: number
}

/**
 * Hook for audio visualization using Web Audio API AnalyserNode
 * Provides frequency data for Winamp-style visualizers
 */
export function useAudioVisualizer({
  audioContext,
  fftSize = 256,
  smoothingTimeConstant = 0.8,
}: UseAudioVisualizerOptions) {
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  useEffect(() => {
    if (!audioContext) return

    // Create analyser node
    const analyser = audioContext.createAnalyser()
    analyser.fftSize = fftSize
    analyser.smoothingTimeConstant = smoothingTimeConstant
    analyserRef.current = analyser

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      analyserRef.current = null
    }
  }, [audioContext, fftSize, smoothingTimeConstant])

  /**
   * Get the analyser node to connect audio sources
   */
  const getAnalyser = useCallback(() => {
    return analyserRef.current
  }, [])

  /**
   * Get frequency data (for bars visualization)
   */
  const getFrequencyData = useCallback(() => {
    if (!analyserRef.current) return new Uint8Array(0)

    const bufferLength = analyserRef.current.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    analyserRef.current.getByteFrequencyData(dataArray)
    return dataArray
  }, [])

  /**
   * Get time domain data (for waveform visualization)
   */
  const getTimeDomainData = useCallback(() => {
    if (!analyserRef.current) return new Uint8Array(0)

    const bufferLength = analyserRef.current.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    analyserRef.current.getByteTimeDomainData(dataArray)
    return dataArray
  }, [])

  /**
   * Start animation loop for canvas rendering
   */
  const startVisualization = useCallback((
    canvasRef: HTMLCanvasElement,
    renderFrame: (ctx: CanvasRenderingContext2D, data: Uint8Array) => void,
    dataType: 'frequency' | 'waveform' = 'frequency'
  ) => {
    const ctx = canvasRef.getContext('2d')
    if (!ctx || !analyserRef.current) return

    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate)

      const data = dataType === 'frequency' ? getFrequencyData() : getTimeDomainData()
      renderFrame(ctx, data)
    }

    animate()
  }, [getFrequencyData, getTimeDomainData])

  /**
   * Stop animation loop
   */
  const stopVisualization = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
  }, [])

  return {
    getAnalyser,
    getFrequencyData,
    getTimeDomainData,
    startVisualization,
    stopVisualization,
  }
}
