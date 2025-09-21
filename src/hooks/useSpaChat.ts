import { useState, useCallback } from 'react'
import { useAssistantStream } from './useAssistantStream'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export const useSpaChat = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [currentUserMessage, setCurrentUserMessage] = useState<string | null>(null)

  const handleAssistantResponse = useCallback((message: ChatMessage) => {
    setMessages(prev => [...prev, message])
  }, [])

  const sendMessage = (message: string) => {
    const newUserMessage: ChatMessage = {
      id: `${Date.now()}`,
      role: 'user',
      content: message
    }

    setMessages(prev => [...prev, newUserMessage])
    setCurrentUserMessage(message)
  }

  useAssistantStream(currentUserMessage, handleAssistantResponse)

  return {
    messages,
    sendMessage
  }
}
