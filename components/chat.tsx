"use client"


import type { Attachment, UIMessage } from "ai"
import { useChat } from "@ai-sdk/react"
import { useEffect, useState, useRef, useCallback } from "react" // Added useRef for scrolling
import useSWR, { useSWRConfig } from "swr"
import { ChatHeader } from "@/components/chat-header"
import type { Vote } from "@/lib/db/schema"
import { fetcher, generateUUID } from "@/lib/utils"
import { Artifact } from "./artifact"
import { MultimodalInput } from "./multimodal-input"
import { Messages } from "./messages"
import type { VisibilityType } from "./visibility-selector"
import { useArtifactSelector } from "@/hooks/use-artifact"
import { unstable_serialize } from "swr/infinite"
import { getChatHistoryPaginationKey } from "./sidebar-history"
import { toast } from "./toast"
import type { Session } from "next-auth"
import { useSearchParams } from "next/navigation"
import { useChatVisibility } from "@/hooks/use-chat-visibility"


// Define the props interface for the Chat component
interface ChatProps {
  id: string
  initialMessages: Array<UIMessage>
  initialChatModel: string
  initialVisibilityType: VisibilityType
  isReadonly: boolean
  session: Session
  autoResume: boolean
}


export function Chat({
  id,
  initialMessages,
  initialChatModel,
  initialVisibilityType,
  isReadonly,
  session,
  autoResume,
}: ChatProps) {
  const { mutate } = useSWRConfig()
  const { visibilityType } = useChatVisibility({
    chatId: id,
    initialVisibilityType,
  })


  const [currentChatModel, setCurrentChatModel] = useState(initialChatModel)


  const { messages, setMessages, handleSubmit, input, setInput, append, status, stop, reload, experimental_resume } =
    useChat({
      id,
      initialMessages,
      experimental_throttle: 100,
      sendExtraMessageFields: true,
      generateId: generateUUID,
      experimental_prepareRequestBody: (body) => ({
        id,
        message: body.messages.at(-1),
        selectedChatModel: currentChatModel,
        selectedVisibilityType: visibilityType,
      }),
      onFinish: () => {
        mutate(unstable_serialize(getChatHistoryPaginationKey))
      },
      onError: (error) => {
        toast({
          type: "error",
          description: error.message,
        })
      },
    })


  // Auto-scroll to bottom during streaming/message updates
  const messagesEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);


  useEffect(() => {
    if (autoResume) {
      experimental_resume()
    }
  }, [])


  const searchParams = useSearchParams()
  const query = searchParams.get("query")
  const [hasAppendedQuery, setHasAppendedQuery] = useState(false)


  useEffect(() => {
    if (query && !hasAppendedQuery) {
      append({
        role: "user",
        content: query,
      })
      setHasAppendedQuery(true)
      window.history.replaceState({}, "", `/chat/${id}`)
    }
  }, [query, append, hasAppendedQuery, id])


  const { data: votes } = useSWR<Array<Vote>>(messages.length >= 2 ? `/api/vote?chatId=${id}` : null, fetcher)


  const [attachments, setAttachments] = useState<Array<Attachment>>([])


  const isArtifactVisible = useArtifactSelector((state) => state.isVisible)


  const handleModelChange = useCallback((newModelId: string) => {
    setCurrentChatModel(newModelId)
  }, [])


  return (
    <>
      <div className="flex flex-col min-w-0 h-dvh overflow-hidden bg-background dotted-bg">
        <ChatHeader
          chatId={id}
          selectedModelId={currentChatModel}
          selectedVisibilityType={initialVisibilityType}
          isReadonly={isReadonly}
          session={session}
          onModelChange={handleModelChange}
        />


        {messages.length > 0 && (
          <Messages
            chatId={id}
            status={status}
            votes={votes}
            messages={messages}
            setMessages={setMessages}
            reload={reload}
            isReadonly={isReadonly}
            isArtifactVisible={isArtifactVisible}
          />

        )}
        <div ref={messagesEndRef} /> {/* Scroll anchor for streaming */}

        {messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center w-full px-4 pb-4 md:pb-6">
            <form className="flex mx-auto gap-2 w-full md:max-w-[50rem]">
              {!isReadonly && (
                <MultimodalInput
                  chatId={id}
                  input={input}
                  setInput={setInput}
                  handleSubmit={handleSubmit}
                  status={status}
                  stop={stop}
                  attachments={attachments}
                  setAttachments={setAttachments}
                  messages={messages}
                  setMessages={setMessages}
                  append={append}
                  selectedVisibilityType={visibilityType}
                  session={session}
                  selectedModelId={currentChatModel}
                  onModelChange={handleModelChange}
                />
              )}
            </form>
          </div>
        ) : (
          <form className="flex mx-auto px-4 pb-4 md:pb-6 gap-2 w-full md:max-w-[52rem]">
            {!isReadonly && (
              <MultimodalInput
                chatId={id}
                input={input}
                setInput={setInput}
                handleSubmit={handleSubmit}
                status={status}
                stop={stop}
                attachments={attachments}
                setAttachments={setAttachments}
                messages={messages}
                setMessages={setMessages}
                append={append}
                selectedVisibilityType={visibilityType}
                session={session}
                selectedModelId={currentChatModel}
                onModelChange={handleModelChange}
              />
            )}
          </form>
        )}
      </div>


      <Artifact
        chatId={id}
        input={input}
        setInput={setInput}
        status={status}
        stop={stop}
        attachments={attachments}
        setAttachments={setAttachments}
        handleSubmit={handleSubmit}
        messages={messages}
        setMessages={setMessages}
        reload={reload}
        votes={votes}
        isReadonly={isReadonly}
        selectedVisibilityType={visibilityType}
        session={session}
        selectedModelId={currentChatModel}
        onModelChange={handleModelChange}
      />
    </>
  )
}
