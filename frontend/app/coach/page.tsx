'use client'

import { useState } from 'react'
import { Send, Bot, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Message {
  id: string
  role: 'assistant' | 'user'
  content: string
}

const initialMessages: Message[] = [
  {
    id: '1',
    role: 'assistant',
    content:
      "Hello! I'm your AI coach. Ask me anything about your training, recovery, nutrition, or race preparation.",
  },
]

export default function CoachPage() {
  const [messages] = useState<Message[]>(initialMessages)
  const [inputValue, setInputValue] = useState('')
  const isConnected = false // Phase 1: always false until data is synced

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-2xl mx-auto">
      {/* Header area */}
      <div className="px-4 pt-5 pb-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-teal-100 dark:bg-teal-900/40">
            <Bot className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">
              AI Coach
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isConnected ? 'Ready to coach' : 'Connect your data to enable coaching'}
            </p>
          </div>
        </div>

        {/* Data connection banner */}
        {!isConnected && (
          <div className="mt-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 flex items-start gap-2.5">
            <Lock className="w-4 h-4 text-slate-400 dark:text-slate-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Connect Garmin or import Apple Health data to unlock personalised AI coaching.
            </p>
          </div>
        )}
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
                  <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
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
      </div>

      {/* Input Bar */}
      <div className="flex-shrink-0 px-4 pb-4">
        <div
          className="relative"
          title={!isConnected ? 'Connect your data first to enable coaching' : undefined}
        >
          <div className="flex gap-2">
            <Input
              placeholder={
                isConnected
                  ? 'Ask your coach...'
                  : 'Connect data to start coaching...'
              }
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={!isConnected}
              className="flex-1 pr-2"
            />
            <Button
              size="icon"
              disabled={!isConnected || !inputValue.trim()}
              className="flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          {!isConnected && (
            <p className="mt-1.5 text-center text-xs text-slate-400 dark:text-slate-500">
              Connect your data first to enable coaching
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
