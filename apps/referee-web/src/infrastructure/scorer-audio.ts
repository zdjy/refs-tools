export interface ScorerAudio {
  play(kind: 'whistle' | 'buzzer'): Promise<void>
  dispose(): void
}

/** 在用户手势后创建轻量 Web Audio 提示，不加载媒体资源；失败由界面提供视觉降级。 */
export function createScorerAudio(): ScorerAudio {
  let context: AudioContext | undefined
  return {
    async play(kind) {
      context ??= new AudioContext()
      await context.resume()
      if (context.state !== 'running') throw new Error('音频未获得浏览器授权')
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.type = kind === 'buzzer' ? 'sawtooth' : 'sine'
      oscillator.frequency.value = kind === 'buzzer' ? 220 : 2400
      gain.gain.setValueAtTime(0.08, context.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.7)
      oscillator.connect(gain).connect(context.destination)
      oscillator.start()
      oscillator.stop(context.currentTime + 0.8)
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect() }
    },
    dispose() { if (context) void context.close().catch(() => {}); context = undefined },
  }
}
