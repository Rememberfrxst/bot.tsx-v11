'use client';

import type { Attachment, UIMessage } from "ai";
import cx from "classnames";
import type React from "react";
import {
  useRef,
  useEffect,
  useState,
  useCallback,
  type Dispatch,
  type SetStateAction,
  type ChangeEvent,
  memo,
} from "react";
import { toast } from "sonner";
import { useLocalStorage, useWindowSize } from "usehooks-ts";
import { ArrowUpIcon, PaperclipIcon, StopIcon } from "./icons";
import { PreviewAttachment } from "./preview-attachment";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import ThinkButton from "./ThinkButton";
import equal from "fast-deep-equal";
import type { UseChatHelpers } from "@ai-sdk/react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDownIcon } from "lucide-react";
import { useScrollToBottom } from "@/hooks/use-scroll-to-bottom";
import type { VisibilityType } from "./visibility-selector";
import { WebSearchButton } from "./web-search-button";
import type { Session } from "next-auth";
import { cn } from "@/lib/utils";
import { ImprovePromptButton } from "./improve-prompt-button"; // Import the new button

// Utility function for UUID
const generateUUID = () => crypto.randomUUID();

// Shuffle function for randomizing placeholders
const shuffleArray = (array: string[]) => {
  return array.sort(() => Math.random() - 0.8);
};

// Dynamic placeholder array
const placeholders = shuffleArray([
  "What can I help you solve today?",
  "Search the web for the latest news or trends",
  "Draft an essay, article, or research summary",
  "Analyze data or explain technical concepts clearly",
  "Get real-time answers to current events and news",
  "Write, debug, and optimize your code",
  "Summarize long reports, papers, or transcripts",
  "Generate creative content, from stories to scripts",
  "Compare different viewpoints on a single question",
  "Plan strategies, workflows, or study guides",
  "Ask about science, history, or emerging tech",
  "Break down advanced math or logic problems",
  "Explore step‑by‑step reasoning for tough questions",
  "Translate and explain text in multiple languages",
  "Simulate debates, interviews, or brainstorming sessions",
]);

function PureMultimodalInput({
  chatId,
  input,
  setInput,
  status,
  stop,
  attachments,
  setAttachments,
  messages,
  setMessages,
  append,
  handleSubmit,
  className,
  selectedVisibilityType,
  session,
  selectedModelId,
  onModelChange,
  onWebSearch,
}: {
  chatId: string;
  input: UseChatHelpers["input"];
  setInput: UseChatHelpers["setInput"];
  status: UseChatHelpers["status"];
  stop: () => void;
  attachments: Array<Attachment>;
  setAttachments: Dispatch<SetStateAction<Array<Attachment>>>;
  messages: Array<UIMessage>;
  setMessages: UseChatHelpers["setMessages"];
  append: UseChatHelpers["append"];
  handleSubmit: UseChatHelpers["handleSubmit"];
  className?: string;
  selectedVisibilityType: VisibilityType;
  session: Session | null;
  selectedModelId: string;
  onModelChange?: (modelId: string) => void;
  onWebSearch?: () => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { width } = useWindowSize();
  const [currentPlaceholderIndex, setCurrentPlaceholderIndex] = useState(0);
  const [displayedPlaceholder, setDisplayedPlaceholder] = useState("");

  // Fallback for undefined messages
  const safeMessages = messages || [];

  // Check if this is a new/empty chat
  const isEmptyChat = safeMessages.length === 0;

  // Clear input and localStorage when a new chat starts
  useEffect(() => {
    if (safeMessages.length === 0) {
      setInput("");
      setLocalStorageInput("");
      if (textareaRef.current) {
        textareaRef.current.value = "";
      }
      setCurrentPlaceholderIndex(0);
      setDisplayedPlaceholder("");
    }
  }, [chatId, safeMessages.length, setInput]);

  // Adjust textarea height
  useEffect(() => {
    if (textareaRef.current) {
      adjustHeight();
    }
  }, [input, attachments.length]);

  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight + (attachments.length * 80) + 2}px`;
    }
  };

  const resetHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = "104px";
    }
  };

  // Placeholder cycling with bottom-to-top slide effect (only for centered/empty chat)
  useEffect(() => {
    if (status !== "ready" || input || safeMessages.length > 0) {
      setDisplayedPlaceholder(safeMessages.length === 0 ? "" : "Ask Anything");
      return;
    }

    const cycleInterval = setInterval(() => {
      setCurrentPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
    }, 4000);

    return () => clearInterval(cycleInterval);
  }, [status, input, safeMessages.length, currentPlaceholderIndex]);

  // Sync displayedPlaceholder with current index
  useEffect(() => {
    setDisplayedPlaceholder(placeholders[currentPlaceholderIndex]);
  }, [currentPlaceholderIndex]);

  // Sync localStorage with input
  const [localStorageInput, setLocalStorageInput] = useLocalStorage("input", "");

  useEffect(() => {
    if (textareaRef.current) {
      const domValue = textareaRef.current.value;
      const finalValue = domValue || localStorageInput || "";
      setInput(finalValue);
      adjustHeight();
    }
  }, [setInput, localStorageInput]);

  useEffect(() => {
    setLocalStorageInput(input);
  }, [input, setLocalStorageInput]);

  const handleInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(event.target.value);
    adjustHeight();
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadQueue, setUploadQueue] = useState<Array<string>>([]);

  // 🔥 OLD PATTERN: Simple submitForm with URL history management
  const submitForm = useCallback(() => {
    // 🔥 KEY FIX: URL history management (same as old code)
    window.history.replaceState({}, "", `/chat/${chatId}`);

    handleSubmit(undefined, {
      experimental_attachments: attachments,
    });
    setAttachments([]);
    setLocalStorageInput("");
    resetHeight();
    setCurrentPlaceholderIndex(0);
    setDisplayedPlaceholder("");
    if (width && width > 768) {
      textareaRef.current?.focus();
    }
  }, [attachments, handleSubmit, setAttachments, setLocalStorageInput, width, chatId]);

  // 🔥 NEW: Web search with same pattern
  const handleWebSearch = useCallback(() => {
    const trimmedInput = input.trim();
    if (!trimmedInput) return;

    // URL history management
    window.history.replaceState({}, "", `/chat/${chatId}`);

    append({
      id: generateUUID(),
      role: 'user',
      parts: [{ text: input }],
      experimental_attachments: attachments,
      experimental_toolCall: 'searchWeb',
    });
    setAttachments([]);
    setLocalStorageInput("");
    resetHeight();
    setCurrentPlaceholderIndex(0);
    setDisplayedPlaceholder("");
    if (width && width > 768) {
      textareaRef.current?.focus();
    }
  }, [input, attachments, append, setAttachments, setLocalStorageInput, width, chatId]);

  // 🔥 NEW: Improve Prompt feature
  const handleImprovedPrompt = useCallback((improvedText: string) => {
    setInput(improvedText);
    adjustHeight(); // Adjust height for the new content
  }, [setInput]);

  const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/files/upload", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        const { url, pathname, contentType } = data;
        return { url, name: pathname, contentType };
      }

      const { error } = await response.json();
      toast.error(error);
    } catch (error) {
      toast.error("Failed to upload file, please try again!");
    }
  };

  const handleFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []);
      setUploadQueue(files.map((file) => file.name));

      try {
        const uploadPromises = files.map((file) => uploadFile(file));
        const uploadedAttachments = await Promise.all(uploadPromises);
        const successfullyUploadedAttachments = uploadedAttachments.filter((attachment) => attachment !== undefined);
        setAttachments((currentAttachments) => [...currentAttachments, ...successfullyUploadedAttachments]);
      } catch (error) {
        console.error("Error uploading files!", error);
      } finally {
        setUploadQueue([]);
      }
    },
    [setAttachments],
  );

  const { isAtBottom, scrollToBottom } = useScrollToBottom();

  useEffect(() => {
    if (status === "submitted") {
      scrollToBottom();
    }
  }, [status, scrollToBottom]);

  if (!chatId) {
    return <div>Error: Chat ID is required</div>;
  }

  return (
    <>
      {/* Centered Layout for Empty Chat */}
      {isEmptyChat && (
        <div className="flex flex-col items-center min-h-[44vh] w-full">
          <div className="w-full max-w-3xl">
            {/* Chat Title */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="text-center mb-6"
            >
              <h1
                className="flex font-bold text-ellipsis overflow-hidden text-[rgba(6, 182, 212, 0.2)] dark:text-[rgba(0, 255, 255, 0.2)]"
                style={{
                  fontSize: "1.5rem",
                  minHeight: "2rem",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                Ask Anything Checkbox AI
              </h1>
            </motion.div>

            {/* Centered Input Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="w-full max-w-4xl mx-auto"
            >
              <CenteredInputForm
                textareaRef={textareaRef}
                input={input}
                handleInput={handleInput}
                displayedPlaceholder={displayedPlaceholder}
                safeMessages={safeMessages}
                className={className}
                submitForm={submitForm}
                status={status}
                fileInputRef={fileInputRef}
                handleFileChange={handleFileChange}
                attachments={attachments}
                uploadQueue={uploadQueue}
                stop={stop}
                setMessages={setMessages}
                session={session}
                selectedModelId={selectedModelId}
                onModelChange={onModelChange}
                onWebSearch={onWebSearch} // Added onWebSearch prop
                input={input}
                onImprovedPrompt={handleImprovedPrompt}
              />
            </motion.div>
          </div>
        </div>
      )}

      {/* Bottom Layout for Active Chat */}
      {!isEmptyChat && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="relative w-full flex flex-col gap-4"
        >
          <AnimatePresence>
            <div className="absolute right-1.5">
              {!isAtBottom && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="relative bottom-14 bg-transparent -translate-x-1/2 z-50"
                >
                  <Button
                    data-testid="scroll-to-bottom-button"
                    className="rounded-full border bg-muted"
                    size="icon"
                    variant="outline"
                    onClick={(event) => {
                      event.preventDefault();
                      scrollToBottom();
                    }}
                  >
                    <ArrowDownIcon size={14} />
                  </Button>
                </motion.div>
              )}
            </div>
          </AnimatePresence>

          <input
            type="file"
            className="fixed -top-4 -left-4 size-0.5 opacity-0 pointer-events-none"
            ref={fileInputRef}
            multiple
            onChange={handleFileChange}
            tabIndex={-1}
          />

          {(attachments?.length > 0 || uploadQueue.length > 0) && (
            <div data-testid="attachments-preview" className="flex flex-row gap-2 overflow-x-scroll items-end">
              {attachments?.map((attachment) => (
                <PreviewAttachment key={attachment.url} attachment={attachment} />
              ))}
              {uploadQueue.map((filename) => (
                <PreviewAttachment
                  key={filename}
                  attachment={{ url: "", name: filename, contentType: "" }}
                  isUploading={true}
                />
              ))}
            </div>
          )}

          <BottomInputForm
            textareaRef={textareaRef}
            input={input}
            handleInput={handleInput}
            displayedPlaceholder={displayedPlaceholder}
            safeMessages={safeMessages}
            className={className}
            submitForm={submitForm}
            status={status}
            fileInputRef={fileInputRef}
            attachments={attachments}
            uploadQueue={uploadQueue}
            stop={stop}
            setMessages={setMessages}
            session={session}
            selectedModelId={selectedModelId}
            onModelChange={onModelChange}
            onWebSearch={onWebSearch}
            input={input}
            onImprovedPrompt={handleImprovedPrompt}
          />
        </motion.div>
      )}
    </>
  );
}

// Centered Input Form Component (for empty chats - keeps cycling)
function CenteredInputForm({
  textareaRef,
  input,
  handleInput,
  displayedPlaceholder,
  safeMessages,
  className,
  submitForm,
  status,
  fileInputRef,
  handleFileChange,
  attachments,
  uploadQueue,
  stop,
  setMessages,
  session,
  selectedModelId,
  onModelChange,
  onWebSearch, // Accepted onWebSearch prop
  input: improvedPromptInput, // Renamed to avoid conflict
  onImprovedPrompt, // Accept the new prop
}: any) {
  const handleInputFocus = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    textareaRef.current?.focus();
  }, []);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      if (status !== "ready") {
        toast.error("Please wait for the model to finish its response!");
      } else if (input.trim()) {
        submitForm();
      }
    }
  }, [status, input, submitForm]);

  return (
    <div className="w-full">
      <input
        type="file"
        className="fixed -top-4 -left-4 size-0.5 opacity-0 pointer-events-none"
        ref={fileInputRef}
        multiple
        onChange={handleFileChange}
        tabIndex={-1}
      />

      <div
        className={cn(
          "flex w-full flex-col rounded-[1.6rem] bg-muted overflow-hidden cursor-text gap-2.5",
          className
        )}
        onClick={handleInputFocus}
        onTouchStart={handleInputFocus}
      >
        {(attachments?.length > 0 || uploadQueue.length > 0) && (
          <div className="p-2 flex flex-row gap-2 overflow-x-auto items-end border-b-[2.5px]">
            {attachments?.map((attachment: any) => (
              <PreviewAttachment key={attachment.url} attachment={attachment} />
            ))}
            {uploadQueue.map((filename: string) => (
              <PreviewAttachment
                key={filename}
                attachment={{ url: "", name: filename, contentType: "" }}
                isUploading={true}
              />
            ))}
          </div>
        )}

        <div className="flex w-full flex-col p-2">
          <div className="relative text-base">
            <Textarea
              data-testid="multimodal-input"
              ref={textareaRef}
              value={input}
              onChange={handleInput}
              className={cx(
                "w-full flex overflow-y-auto resize-none rounded-t-2xl pr-8 cursor-text focus:ring-0 focus:border-0 scrollbar-thin scrollbar-thumb-foreground scrollbar-track-transparent",
                className,
              )}
              rows={1}
              autoFocus
              placeholder=""
              onKeyDown={handleKeyDown}
              style={{ paddingLeft: '10px', backgroundColor: 'transparent !important' }}
            />
            {!input && safeMessages.length === 0 && (
              <AnimatePresence>
                <motion.div
                  key={displayedPlaceholder}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -40, transition: { duration: 0.3 } }}
                  transition={{ type: "spring", stiffness: 200, damping: 25, duration: 0.7 }}
                  className="absolute top-0 left-[3px] pointer-events-none text-muted-foreground placeholder-visible p-2"
                  style={{
                    fontStyle: "inherit",
                    fontWeight: 300,
                    fontSize: "clamp(16px, 2.5vw, 16px)",
                    letterSpacing: "0.2px",
                  }}
                >
                  {displayedPlaceholder}
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </div>

        <div className="flex justify-between items-center rounded-b-2xl pl-2 pr-2 pb-2">
          <div className="flex items-center gap-1.5">
            <AttachmentsButton fileInputRef={fileInputRef} status={status} />
            <ThinkButton
               selectedModelId={selectedModelId}
               onModelChange={onModelChange!}
               onThinkModeToggle={(isThinking) => {
                 // Store thinking mode state without affecting UI model selector
                 if (typeof window !== 'undefined') {
                   if (isThinking) {
                     sessionStorage.setItem('thinkingMode', 'true');
                   } else {
                     sessionStorage.removeItem('thinkingMode');
                   }
                 }
               }}
             />
              <WebSearchButton
                status={status}
                onWebSearch={onWebSearch}
              />
              <ImprovePromptButton
                input={input}
                onImprovedPrompt={onImprovedPrompt}
                status={status}
              />
          </div>
          <div className="flex items-center gap-1">
            {status === "submitted" ? (
              <StopButton stop={stop} setMessages={setMessages} />
            ) : (
              <SendButton input={input} submitForm={submitForm} uploadQueue={uploadQueue} />
            )}
          </div>
        </div>
      </div>
      <InputStyles />
    </div>
  );
}

// Bottom Input Form Component (for active chats - static "Ask Anything" placeholder)
function BottomInputForm({
  textareaRef,
  input,
  handleInput,
  displayedPlaceholder,
  safeMessages,
  className,
  submitForm,
  status,
  fileInputRef,
  attachments,
  uploadQueue,
  stop,
  setMessages,
  session,
  selectedModelId,
  onModelChange,
  onWebSearch,
  input: improvedPromptInput, // Renamed to avoid conflict
  onImprovedPrompt, // Accept the new prop
}: any) {
  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      if (status !== "ready") {
        toast.error("Please wait for the model to finish its response!");
      } else if (input.trim()) {
        submitForm();
      }
    }
  }, [status, input, submitForm]);

  return (
    <div
      className={cn(
        "flex w-full flex-col grow rounded-[1.6rem] bg-muted overflow-x-auto cursor-text gap-2.5",
        className
      )}
    >
      {(attachments?.length > 0 || uploadQueue.length > 0) && (
        <div className="p-2 flex flex-row gap-2 overflow-x-auto items-end border-b-[2.5px] border-[rgba(6, 182, 212, 0.2)] dark:border-[rgba(0, 255, 255, 0.2)]">
          {attachments?.map((attachment) => (
            <PreviewAttachment key={attachment.url} attachment={attachment} />
          ))}
          {uploadQueue.map((filename) => (
            <PreviewAttachment
              key={filename}
              attachment={{ url: "", name: filename, contentType: "" }}
              isUploading={true}
            />
          ))}
        </div>
      )}

      <div className="flex w-full flex-col p-2">
        <div className="relative">
          <Textarea
            data-testid="multimodal-input"
            ref={textareaRef}
            value={input}
            onChange={handleInput}
            className={cx(
              "w-full flex overflow-x-auto overflow-y-auto resize-none rounded-t-[1.6rem] bg-transparent cursor-text focus:ring-0 focus:border-0 scrollbar-thin scrollbar-thumb-foreground scrollbar-track-muted",
              className,
            )}
            rows={1}
            autoFocus
            placeholder={!input ? "Ask Anything" : ""}
            onKeyDown={handleKeyDown}
            style={{ paddingLeft: '10px', backgroundColor: 'transparent !important' }}
          />
        </div>
      </div>

      <div className="flex justify-between w-full pt-12 cursor-auto gap-1">
        <div className="absolute bottom-0 p-2 w-full rounded-b-[1.6rem] flex justify-between items-center gap-2">
          <div className="flex items-center gap-1.5">
            <AttachmentsButton fileInputRef={fileInputRef} status={status} />
            <ThinkButton
               selectedModelId={selectedModelId}
               onModelChange={onModelChange!}
               onThinkModeToggle={(isThinking) => {
                 if (typeof window !== 'undefined') {
                   if (isThinking) {
                     sessionStorage.setItem('thinkingMode', 'true');
                   } else {
                     sessionStorage.removeItem('thinkingMode');
                   }
                 }
               }}
             />
              <WebSearchButton
                status={status}
                onWebSearch={onWebSearch}
              />
              <ImprovePromptButton
                input={input}
                onImprovedPrompt={onImprovedPrompt}
                status={status}
              />
          </div>
          <div className="flex items-center px-0.5 gap-1">
            {status === "submitted" ? (
              <StopButton stop={stop} setMessages={setMessages} />
            ) : (
              <SendButton input={input} submitForm={submitForm} uploadQueue={uploadQueue} />
            )}
          </div>
        </div>
      </div>
      <InputStyles />
    </div>
  );
}

// 🔥 OLD PATTERN: Shared Input Styles Component
function InputStyles() {
  return (
    <style jsx>{`
      .placeholder-visible {
        opacity: 1;
        transition: opacity 0.4s ease-in-out, transform 0.4s ease-in-out;
        color: transparent;
        background: linear-gradient(90deg, #3b82f6, #a855f7, #ec4899);
        background-size: 200% 200%;
        -webkit-background-clip: text;
        background-clip: text;
        animation: gradientShift 6s ease infinite;
      }

      @keyframes gradientShift {
        0% {
          background-position: 0% 50%;
        }
        50% {
          background-position: 100% 50%;
        }
        100% {
          background-position: 0% 50%;
        }
      }

      [data-testid="multimodal-input"] {
        white-space: pre-wrap;
        overflow-x: auto;
        scrollbar-width: thin;
        scrollbar-color: #d1d5db transparent;
        display: block !important;
        visibility: visible !important;
        font-size: clamp(12px, 2vw, 14px);
      }

      [data-testid="multimodal-input"]::-webkit-scrollbar {
        height: 6px;
      }

      [data-testid="multimodal-input"]::-webkit-scrollbar-track {
        background: transparent;
        border-radius: 3px;
      }

      [data-testid="multimodal-input"]::-webkit-scrollbar-thumb {
        background: #d1d5db;
        border-radius: 3px;
      }

      [data-testid="multimodal-input"]::-webkit-scrollbar-thumb:hover {
        background: #9ca3af;
      }

      [data-testid="multimodal-input"]:focus {
        border-color: #3b82f6;
        box-shadow: 0 0 10px rgba(59, 130, 246, 0.3);
        transform: scale(1.01);
      }

      [data-testid="multimodal-input"]:hover {
        box-shadow: 0 0 12px rgba(0, 0, 0, 0.1);
      }

      [data-testid="attachments-button"] {
        transition: transform 0.2s ease, background-color 0.2s ease;
      }

      [data-testid="attachments-button"]:hover:not(:disabled) {
        transform: scale(1.1);
        background-color: rgba(59, 130, 246, 0.1);
      }

      @media (prefers-color-scheme: dark) {
        .placeholder-visible {
          background: linear-gradient(90deg, #60a5fa, #c084fc, #f472b6);
        }

        [data-testid="multimodal-input"]::placeholder {
          text-shadow: 0 0 8px rgba(96, 165, 250, 0.4);
          color: #999;
        }

        [data-testid="multimodal-input"] {
          scrollbar-color: #6b7280 transparent;
          caret-color: #60a5fa;
        }

        [data-testid="multimodal-input"]::-webkit-scrollbar-track {
          background: transparent;
          border-radius: 3px;
        }

        [data-testid="multimodal-input"]::-webkit-scrollbar-thumb {
          background: #6b7280;
          border-radius: 3px;
        }

        [data-testid="multimodal-input"]::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }
      }
    `}</style>
  );
}

export const MultimodalInput = memo(PureMultimodalInput, (prevProps, nextProps) => {
  if (prevProps.input !== nextProps.input) return false;
  if (prevProps.status !== nextProps.status) return false;
  if (!equal(prevProps.attachments, nextProps.attachments)) return false;
  if (!equal(prevProps.messages, nextProps.messages)) return false;
  if (prevProps.selectedVisibilityType !== nextProps.selectedVisibilityType) return false;
  if (prevProps.selectedModelId !== nextProps.selectedModelId) return false;
  return true;
});

function PureAttachmentsButton({
  fileInputRef,
  status,
}: {
  fileInputRef: React.MutableRefObject<HTMLInputElement | null>;
  status: UseChatHelpers["status"];
}) {
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    fileInputRef.current?.click();
  }, [fileInputRef]);

  return (
    <Button
      data-testid="attachments-button"
      className="rounded-md rounded-bl-lg p-[7px] h-fit dark:border-zinc-700 hover:dark:bg-[#272727] hover:bg-zinc-200 disabled:opacity-50"
      onClick={handleClick}
      disabled={status !== "ready"}
      variant="ghost"
    >
      <PaperclipIcon size={22} />
    </Button>
  );
}

const AttachmentsButton = memo(PureAttachmentsButton);

function PureStopButton({
  stop,
  setMessages,
}: {
  stop: () => void;
  setMessages: UseChatHelpers["setMessages"];
}) {
  const onClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    stop();
    setMessages((messages) => messages);
  }, [stop, setMessages]);

  return (
    <Button
      data-testid="stop-button"
      className="rounded-full p-1.5 h-fit border dark:border-zinc-600"
      onClick={onClick}
      aria-label="Stop generation"
    >
      <StopIcon size={20} />
    </Button>
  );
}

const StopButton = memo(PureStopButton);

function PureSendButton({
  submitForm,
  input,
  uploadQueue,
}: {
  submitForm: () => void;
  input: string;
  uploadQueue: Array<string>;
}) {
  const isDisabled = input.length === 0 || uploadQueue.length > 0;

  const onClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDisabled) submitForm();
  }, [isDisabled, submitForm]);

  return (
    <Button
      data-testid="send-button"
      className="rounded-full p-1.5 h-fit border dark:border-zinc-600 disabled:opacity-50"
      onClick={onClick}
      disabled={isDisabled}
      aria-label="Send message"
    >
      <ArrowUpIcon size={20} />
    </Button>
  );
}

const SendButton = memo(PureSendButton, (prevProps, nextProps) => {
  if (prevProps.uploadQueue.length !== nextProps.uploadQueue.length) return false;
  if (prevProps.input !== nextProps.input) return false;
  return true;
});
