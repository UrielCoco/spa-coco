import { cn } from '@/components/ui/utils'

type Role = 'user' | 'assistant' | 'system'

export default function MessageBubble({ role, content }: { role: Role; content: string }) {
  const isUser = role === 'user'
  const isSystem = role === 'system'

  return (
    <div className={cn('mb-3 flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[80%] rounded-2xl p-3 shadow-soft whitespace-pre-wrap',
          isUser
            ? 'bg-primary text-white'
            : isSystem
              ? 'bg-muted border italic opacity-80'
              : 'bg-card border'
        )}
      >
        {content}
      </div>
    </div>
  )
}
