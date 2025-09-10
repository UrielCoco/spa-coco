import { useRef, useState } from 'react'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/ui/input'
import MessageBubble from './MessageBubble'
import { useAssistantStream } from '@/hooks/useAssistantStream'
import { useTranslation } from 'react-i18next'

export default function ChatPanel({ onTool }: { onTool: (json: any)=>void }) {
  const { t } = useTranslation('common')
  const { messages, pendingText, streaming, send, setMessages } = useAssistantStream()
  const [text, setText] = useState('')
  const listRef = useRef<HTMLDivElement>(null)

  const handleSend = async () => {
    const trimmed = text.trim()
    if (!trimmed) return
    // special: /demo triggers tool-merge after stream (handled by mock automatically)
    await send(trimmed)
    setText('')
    setTimeout(() => { listRef.current?.scrollTo({ top: 999999, behavior: 'smooth' }) }, 50)
  }

  // crude parser to detect tool-call textual marker and emit
  const effectiveMessages = messages.map(m => {
    if (m.content.startsWith('\n[tool-call]')) {
      try {
        const json = JSON.parse(m.content.replace('\n[tool-call]\n', ''))
        onTool(json)
        return { ...m, content: '[tool] Ready to apply' }
      } catch { return m }
    }
    return m
  })

  return (
    <div className="h-full flex flex-col">
      <div ref={listRef} className="flex-1 overflow-auto p-4">
        {effectiveMessages.map((m, idx) => <MessageBubble key={idx} role={m.role} content={m.content} />)}
        {streaming || pendingText ? <MessageBubble role="assistant" content={pendingText || t('loading')} /> : null}
      </div>
      <div className="p-3 border-t flex gap-2">
        <Input
          aria-label={t('typeMessage')}
          placeholder={t('typeMessage')}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
          }}
        />
        <Button onClick={handleSend}>{t('send')}</Button>
      </div>
    </div>
  )
}
