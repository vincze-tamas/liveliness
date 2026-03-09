'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Send, Bot, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { apiFetch } from '@/lib/api'

interface Message {
  id: string
  role: 'assistant' | 'user'
  content: string
}

// Greeting shown to user but never sent to the API
const GREETING: Message = {
  id: 'greeting',
  role: 'assistant',
  content:
    "Hello! I'm your AI coach. Ask me anything about your training, recovery, nutrition, or race preparation.",
}

export default function CoachPage() {
  const [messages, setMessages] = useState<Message[]>([GREETING])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const idCounter = useRef(0)

  const nextId = () => String(++idCounter.current)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = useCallback(async () => {
    const text = inputValue.trim()
    if (!text || isLoading) return

    const userMsg: Message = { id: nextId(), role: 'user', content: text }
    const nextMessages = [...messages, userMsg]
    setMessages(nextMessages)
    setInputValue('')
    setIsLoading(true)

    try {
      // Send only real messages (skip the UI-only greeting)
      const history = nextMessages
        .filter((m) => m.id !== GREETING.id)
        .map((m) => ({ role: m.role, content: m.content }))

      const data = await apiFetch<{ reply: string }>('/api/coach/chat', {
        method: 'POST',
        body: JSON.stringify({ messages: history }),
      })

      const assistantMsg: Message = {
        id: nextId(),
        role: 'assistant',
        content: data.reply,
      }
      setMessages((prev) => [...prev, assistantMsg])
    } catch (err) {
      const errorMsg: Message = {
        id: nextId(),
        role: 'assistant',
        content:
          err instanceof Error && err.message.includes('503')
            ? 'AI coaching is unavailable — please set your ANTHROPIC_API_KEY on the server.'
            : 'Sorry, something went wrong. Please try again.',
      }
      setMessages((prev) => [...prev, errorMsg])
    } finally {
      setIsLoading(false)
    }
  }, [messages, inputValue, isLoading])

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-2xl mx-auto">
      {/* Header */}
      <div className="px-4 pt-5 pb-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-teal-100 dark:bg-teal-900/40">
            <Bot className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">AI Coach</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Powered by Claude</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="flex items-end gap-2 max-w-[85%]">
                <div className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-teal-100 dark:bg-teal-900/40 mb-0.5">
                  <Bot className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm border border-slate-100 dark:border-slate-700">
                  <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                    {msg.content}
                  </p>
                </div>
              </div>
            )}
            {msg.role === 'user' && (
              <div className="max-w-[85%]">
                <div className="bg-teal-600 text-white rounded-2xl rounded-br-sm px-4 py-3">
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Typing indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex items-end gap-2 max-w-[85%]">
              <div className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-teal-100 dark:bg-teal-900/40 mb-0.5">
                <Bot className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm border border-slate-100 dark:border-slate-700">
                <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="flex-shrink-0 px-4 pb-4">
        <div className="flex gap-2">
          <Input
            placeholder="Ask your coach..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            size="icon"
            onClick={sendMessage}
            disabled={isLoading || !inputValue.trim()}
            className="flex-shrink-0"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
