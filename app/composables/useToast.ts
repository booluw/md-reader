import { readonly, ref } from 'vue'

const message = ref('')
let timer: ReturnType<typeof setTimeout> | undefined

export function useToast(): {
  message: Readonly<typeof message>
  showToast: (text: string, duration?: number) => void
  clearToast: () => void
} {
  function clearToast(): void {
    message.value = ''
    if (timer !== undefined) {
      clearTimeout(timer)
      timer = undefined
    }
  }

  function showToast(text: string, duration = 3000): void {
    clearToast()
    message.value = text
    if (duration > 0) {
      timer = setTimeout(() => {
        message.value = ''
        timer = undefined
      }, duration)
    }
  }

  return { message: readonly(message), showToast, clearToast }
}
