import { useChat } from '../context/chat-context'
import { useEffect } from 'react'


const { messages, setMessages, appendMessage } = useChat();

interface AssistantMessage {
  id: string
  role: 'assistant'
  content: string
}

export const useAssistantStream = (
  userMessage: string | null,
  onStreamComplete: (message: AssistantMessage) => void
) => {
  const { appendMessage } = useChat()

  useEffect(() => {
    if (!userMessage) return

    const fetchData = async () => {
      const res = await fetch('/api/spa-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: userMessage
            }
          ]
        })
      })

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let fullMessage = ''

      while (true) {
        const { value, done } = await reader!.read()
        if (done) break

        const chunk = decoder.decode(value)
        fullMessage += chunk

        try {
          const parsed: AssistantMessage = JSON.parse(fullMessage)
          onStreamComplete(parsed)
        } catch {
          // JSON parcial
        }
      }
    }

    fetchData()
  }, [userMessage, onStreamComplete, appendMessage])
}
