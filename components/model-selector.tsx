"use client"

import { startTransition, useMemo, useOptimistic, useState, useEffect } from "react"
import Image from "next/image"
import { saveChatModelAsCookie } from "@/app/(chat)/actions"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { chatModels } from "@/lib/ai/models"
import { cn } from "@/lib/utils"
import { ChevronDown, Brain } from "lucide-react"
import type { Session } from "next-auth"

// Simple useMediaQuery hook
function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const media = window.matchMedia(query)
    setMatches(media.matches)

    const listener = () => setMatches(media.matches)
    media.addEventListener("change", listener)
    return () => media.removeEventListener("change", listener)
  }, [query])

  return matches
}

export function ModelSelector({
  session,
  selectedModelId,
  onModelChange,
  className,
}: {
  session: Session | null
  selectedModelId: string
  onModelChange?: (modelId: string) => void
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [optimisticModelId, setOptimisticModelId] = useOptimistic(selectedModelId)

  // Load from localStorage on mount for instant experience
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedModel = localStorage.getItem('selectedModel')
      if (savedModel && savedModel !== selectedModelId) {
        setOptimisticModelId(savedModel)
      }
    }
  }, [])

  const isMobile = useMediaQuery("(max-width: 767px)")

  // ✅ Show all models without entitlement restriction
  const availableChatModels = chatModels

  const selectedChatModel = useMemo(() => {
    // If in thinking mode, show the original selected model in UI
    const isThinkingMode = sessionStorage.getItem('thinkingMode') === 'true';
    const displayModelId = isThinkingMode 
      ? (sessionStorage.getItem('previousModel') || optimisticModelId)
      : optimisticModelId;

    return availableChatModels.find((chatModel) => chatModel.id === displayModelId) || null;
  }, [optimisticModelId, availableChatModels])

  const handleModelSelect = (modelId: string) => {
    try {
      // Immediate UI update for ultra-fast feedback
      setOptimisticModelId(modelId)
      setOpen(false)

      // Immediate localStorage save for instant persistence
      if (typeof window !== 'undefined') {
        localStorage.setItem('selectedModel', modelId)
        localStorage.setItem('modelSwitchTimestamp', Date.now().toString())
      }

      // Immediate callback to parent
      if (onModelChange) {
        onModelChange(modelId)
      }

      // Background operations without blocking UI
      requestAnimationFrame(() => {
        saveChatModelAsCookie(modelId).catch(console.warn)
      })
    } catch (error) {
      console.error('Model switch error:', error)
      // Fallback - still try to update UI
      setOptimisticModelId(modelId)
      if (onModelChange) {
        onModelChange(modelId)
      }
    }
  }

  // Tag checking functions
  const hasReasoningTag = (model: any) => model.hasReasoningTag
  const hasComingTag = (model: any) => model.hasComingTag
  const hasNewTag = (model: any) => model.hasNewTag

  // Dynamically compute mobile sheet height to fit content (with scroll if overflow)
  const [sheetHeight, setSheetHeight] = useState<string | undefined>(undefined)
  useEffect(() => {
    if (isMobile) {
      const headerHeight = 52
      const modelItemHeight = 80
      const contentPad = 16
      const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 800

      const n = availableChatModels.length
      const neededHeight = Math.min(
        headerHeight + n * modelItemHeight + contentPad,
        viewportHeight * 0.8
      )
      setSheetHeight(`${neededHeight}px`)
    } else {
      setSheetHeight(undefined)
    }
  }, [isMobile, availableChatModels.length])

  const triggerButton = (
    <Button
      data-testid="model-selector"
      variant="ghost"
      className={cn(
        "w-fit px-1.5 py-4 h-8 text-sm bg-transparent focus:border-disabled",
        className
      )}
      onMouseDown={(e) => e.preventDefault()}
    >
      <div className="flex items-center gap-2">
        {selectedChatModel?.icon && (
          <Image
            src={selectedChatModel.icon}
            alt={`${selectedChatModel.name} icon`}
            width={18}
            height={18}
            className="h-4 w-4 rounded-sm"
          />
        )}
        <span className="truncate max-w-[140px] font-medium">
          {selectedChatModel ? selectedChatModel.name : "Select Model"}
        </span>
      </div>
      <ChevronDown size={14} />
    </Button>
  )

  const modelListContent = (
    <div className={cn("p-2 max-h-[calc(100%-40px)] overflow-y-auto rounded-xl")}>
      <div className="px-1.5 py-1 text-[12px] font-mono text-muted-foreground uppercase tracking-wider">
        Available Models
      </div>
      {availableChatModels.map((chatModel) => {
        const { id, name, icon, description } = chatModel
        const isSelected = id === optimisticModelId

        return (
          <div
            key={id}
            data-testid={`model-selector-item-${id}`}
            onClick={() => handleModelSelect(id)}
            className={cn(
              "flex items-center text- gap-2.5 px-1.5 py-3 cursor-pointer rounded-md",
              "hover:bg-accent/20 focus:bg-accent/40 transition-colors",
              isSelected && "bg-accent/40"
            )}
          >

            <div className="flex flex-col">
              <span className="text-sm font-apple text-foreground flex items-center gap-2">
                {name}
                {/* Reasoning Tag */}
                {hasReasoningTag(chatModel) && (
                  <span className="flex rounded-sm text-[13px] font-medium bg-gradient-to-r from-red-600 via-pink-500 to-rose-400 text-transparent bg-clip-text">
                    <div>Reasoning</div>
                  </span>
                )}
                {/* Coming Tag */}
                {hasComingTag(chatModel) && (
                  <span className="flex rounded-sm text-[13px] font-medium bg-gradient-to-r from-orange-500 via-yellow-500 to-amber-400 text-transparent bg-clip-text">
                    <div>Coming</div>
                  </span>
                )}
                {/* New Tag */}
                {hasNewTag(chatModel) && (
                  <span className="flex rounded-sm text-[13px] font-medium bg-gradient-to-r from-green-600 via-emerald-500 to-teal-400 text-transparent bg-clip-text">
                    <div>New</div>
                  </span>
                )}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>{triggerButton}</SheetTrigger>
        <SheetContent
          side="bottom"
          style={sheetHeight ? { height: sheetHeight } : undefined}
          className="overflow-hidden rounded-t-lg p-0"
        >
          <SheetHeader className="px-4 py-3 border-b border-border/20">
            <SheetTitle className="text-sm font-medium">Select Model</SheetTitle>
          </SheetHeader>
          {modelListContent}
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>{triggerButton}</DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className={cn(
          "max-h-[340px] overflow-y-auto custom-scrollbar p-0 bg-background border border-border shadow-sm scrollbar",
          "min-w-[260px]"
        )}
      >
        {modelListContent}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
