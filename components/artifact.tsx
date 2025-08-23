import type { Attachment, UIMessage } from 'ai';
import { formatDistance } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import {
  type Dispatch,
  memo,
  type SetStateAction,
  useCallback,
  useEffect,
  useState,
  useRef,
} from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { useDebounceCallback, useWindowSize } from 'usehooks-ts';
import type { Document, Vote } from '@/lib/db/schema';
import { fetcher } from '@/lib/utils';
import { MultimodalInput } from './multimodal-input';
import { Messages } from './messages';
import { ChatHeader } from './chat-header';
import { Toolbar } from './toolbar';
import { VersionFooter } from './version-footer';
import { ArtifactActions } from './artifact-actions';
import { ArtifactCloseButton } from './artifact-close-button';
import { ArtifactMessages } from './artifact-messages';
import { useSidebar } from './ui/sidebar';
import { useArtifact } from '@/hooks/use-artifact';
import { useArtifactSelector } from '@/hooks/use-artifact';
import { imageArtifact } from '@/artifacts/image/client';
import { codeArtifact } from '@/artifacts/code/client';
import { sheetArtifact } from '@/artifacts/sheet/client';
import { textArtifact } from '@/artifacts/text/client';
import equal from 'fast-deep-equal';
import type { UseChatHelpers } from '@ai-sdk/react';
import type { VisibilityType } from './visibility-selector';
import type { Session } from 'next-auth';
import { Chat } from './chat';

// Define available artifact types
export const artifactDefinitions = [
  textArtifact,
  codeArtifact,
  imageArtifact,
  sheetArtifact,
];

// Type for artifact kinds
export type ArtifactKind = (typeof artifactDefinitions)[number]['kind'];

// Interface for UIArtifact
export interface UIArtifact {
  title: string;
  documentId: string;
  kind: ArtifactKind;
  content: string;
  isVisible: boolean;
  status: 'streaming' | 'idle';
  boundingBox: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
}

// ResizableDivider component for adjusting the chat panel width
const ResizableDivider = ({ 
  onResize, 
  leftPanelWidth 
}: { 
  onResize: (width: number) => void;
  leftPanelWidth: number;
}) => {
  const [isResizing, setIsResizing] = useState(false);
  const dividerRef = useRef<HTMLDivElement>(null);

  // Handle mouse down to start resizing
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  // Handle mouse move and up events for resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      // Constrain width between 300px and 800px
      const newWidth = Math.max(300, Math.min(800, e.clientX));
      onResize(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    // Cleanup event listeners
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, onResize]);

  return (
    <div
      ref={dividerRef}
      className={`
        absolute top-0 h-full w-1 bg-background hover:bg-blue-500/20 
        cursor-col-resize z-10 transition-colors duration-150
        ${isResizing ? 'bg-blue-500/30' : ''}
      `}
      style={{ left: leftPanelWidth - 2 }}
      onMouseDown={handleMouseDown}
    >
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1 h-8 bg-gray-400 rounded-full opacity-0 hover:opacity-100 transition-opacity" />
    </div>
  );
};

// ArtifactChatPanel component for the chat interface
const ArtifactChatPanel = ({
  chatId,
  input,
  setInput,
  handleSubmit,
  reload,
  status,
  stop,
  append, // ✅ Added append prop here
  attachments,
  setAttachments,
  messages,
  setMessages,
  votes,
  isReadonly,
  selectedVisibilityType,
  session,
  selectedModelId,
  onModelChange,
  leftPanelWidth,
}: {
  chatId: string;
  input: string;
  setInput: Dispatch<SetStateAction<string>>;
  handleSubmit: UseChatHelpers['handleSubmit'];
  status: UseChatHelpers['status'];
  stop: UseChatHelpers['stop'];
  append: UseChatHelpers['append']; // ✅ Added append type here
  attachments: Array<Attachment>;
  setAttachments: Dispatch<SetStateAction<Array<Attachment>>>;
  messages: Array<UIMessage>;
  setMessages: UseChatHelpers['setMessages'];
  votes: Array<Vote> | undefined;
  isReadonly: boolean;
  reload: UseChatHelpers['reload'];
  selectedVisibilityType: VisibilityType;
  session: Session;
  selectedModelId: string;
  onModelChange: (modelId: string) => void;
  leftPanelWidth: number;
}) => {
  const isArtifactVisible = useArtifactSelector((state) => state.isVisible);

  return (
    <div className="flex flex-col h-dvh bg-background">
      {/* Chat Header with model selection and visibility controls */}
      <ChatHeader
        chatId={chatId}
        selectedModelId={selectedModelId}
        selectedVisibilityType={selectedVisibilityType}
        isReadonly={isReadonly}
        session={session}
        onModelChange={onModelChange}
      />

      {/* Messages Area */}
      {messages.length > 0 ? (
        <Messages
            chatId={chatId}
            status={status}
            votes={votes}
            messages={messages}
            setMessages={setMessages}
            reload={reload}
            isReadonly={isReadonly}
            isArtifactVisible={isArtifactVisible}
          />
      ) : (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-muted-foreground">No messages yet</div>
        </div>
      )}
      
      {/* Input Area */}
      <div className="shrink-0">
        <div className="p-4">
          <form className="flex gap-2 w-full">
            {!isReadonly && (
              <MultimodalInput
                chatId={chatId}
                input={input}
                setInput={setInput}
                handleSubmit={handleSubmit}
                status={status}
                stop={stop}
                append={append} // ✅ Passed append prop to MultimodalInput
                attachments={attachments}
                setAttachments={setAttachments}
                messages={messages}
                setMessages={setMessages}
                className="bg-background dark:bg-muted"
                selectedVisibilityType={selectedVisibilityType}
                session={session}
                selectedModelId={selectedModelId}
                onModelChange={onModelChange}
              />
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

// Main Artifact component
function PureArtifact({
  chatId,
  input,
  setInput,
  handleSubmit,
  status,
  stop,
  append, // ✅ Added append prop to main component
  attachments,
  setAttachments,
  messages,
  setMessages,
  reload,
  votes,
  isReadonly,
  selectedVisibilityType,
  session,
  selectedModelId,
  onModelChange,
}: {
  chatId: string;
  input: string;
  setInput: Dispatch<SetStateAction<string>>;
  status: UseChatHelpers['status'];
  stop: UseChatHelpers['stop'];
  append: UseChatHelpers['append']; // ✅ Added append type to main component
  attachments: Array<Attachment>;
  setAttachments: Dispatch<SetStateAction<Array<Attachment>>>;
  messages: Array<UIMessage>;
  setMessages: UseChatHelpers['setMessages'];
  handleSubmit: UseChatHelpers['handleSubmit'];
  reload: UseChatHelpers['reload'];
  votes: Array<Vote> | undefined;
  isReadonly: boolean;
  selectedVisibilityType: VisibilityType;
  session: Session;
  selectedModelId: string;
  onModelChange: (modelId: string) => void;
}) {
  // State and hooks for artifact management
  const { artifact, setArtifact, metadata, setMetadata } = useArtifact();
  const [leftPanelWidth, setLeftPanelWidth] = useState(450);
  const { open: isSidebarOpen } = useSidebar();

  // Fetch documents using SWR
  const {
    data: documents,
    isLoading: isDocumentsFetching,
    mutate: mutateDocuments,
  } = useSWR<Array<Document>>(
    artifact.documentId !== 'init' && artifact.status !== 'streaming'
      ? `/api/document?id=${artifact.documentId}`
      : null,
    fetcher,
  );

  // State for document editing and versioning
  const [mode, setMode] = useState<'edit' | 'diff'>('edit');
  const [document, setDocument] = useState<Document | null>(null);
  const [currentVersionIndex, setCurrentVersionIndex] = useState(-1);
  const [isContentDirty, setIsContentDirty] = useState(false);
  const { mutate } = useSWRConfig();

  // Update document state when documents are fetched
  useEffect(() => {
    if (documents && documents.length > 0) {
      const mostRecentDocument = documents.at(-1);

      if (mostRecentDocument) {
        setDocument(mostRecentDocument);
        setCurrentVersionIndex(documents.length - 1);
        setArtifact((currentArtifact) => ({
          ...currentArtifact,
          content: mostRecentDocument.content ?? '',
        }));
      }
    }
  }, [documents, setArtifact]);

  // Re-fetch documents when artifact status changes
  useEffect(() => {
    mutateDocuments();
  }, [artifact.status, mutateDocuments]);

  // Handle content changes with debouncing
  const handleContentChange = useCallback(
    (updatedContent: string) => {
      if (!artifact) return;

      mutate<Array<Document>>(
        `/api/document?id=${artifact.documentId}`,
        async (currentDocuments) => {
          if (!currentDocuments) return undefined;

          const currentDocument = currentDocuments.at(-1);

          if (!currentDocument || !currentDocument.content) {
            setIsContentDirty(false);
            return currentDocuments;
          }

          if (currentDocument.content !== updatedContent) {
            await fetch(`/api/document?id=${artifact.documentId}`, {
              method: 'POST',
              body: JSON.stringify({
                title: artifact.title,
                content: updatedContent,
                kind: artifact.kind,
              }),
            });

            setIsContentDirty(false);

            const newDocument = {
              ...currentDocument,
              content: updatedContent,
              createdAt: new Date(),
            };

            return [...currentDocuments, newDocument];
          }
          return currentDocuments;
        },
        { revalidate: false },
      );
    },
    [artifact, mutate],
  );

  const debouncedHandleContentChange = useDebounceCallback(
    handleContentChange,
    2000,
  );

  // Save content with optional debouncing
  const saveContent = useCallback(
    (updatedContent: string, debounce: boolean) => {
      if (document && updatedContent !== document.content) {
        setIsContentDirty(true);

        if (debounce) {
          debouncedHandleContentChange(updatedContent);
        } else {
          handleContentChange(updatedContent);
        }
      }
    },
    [document, debouncedHandleContentChange, handleContentChange],
  );

  // Get document content by index
  function getDocumentContentById(index: number) {
    if (!documents) return '';
    if (!documents[index]) return '';
    return documents[index].content ?? '';
  }

  // Handle version navigation
  const handleVersionChange = (type: 'next' | 'prev' | 'toggle' | 'latest') => {
    if (!documents) return;

    if (type === 'latest') {
      setCurrentVersionIndex(documents.length - 1);
      setMode('edit');
    }

    if (type === 'toggle') {
      setMode((mode) => (mode === 'edit' ? 'diff' : 'edit'));
    }

    if (type === 'prev') {
      if (currentVersionIndex > 0) {
        setCurrentVersionIndex((index) => index - 1);
      }
    } else if (type === 'next') {
      if (currentVersionIndex < documents.length - 1) {
        setCurrentVersionIndex((index) => index + 1);
      }
    }
  };

  // Toolbar visibility state
  const [isToolbarVisible, setIsToolbarVisible] = useState(false);

  // Check if current version is the latest
  const isCurrentVersion =
    documents && documents.length > 0
      ? currentVersionIndex === documents.length - 1
      : true;

  // Window size for responsive design
  const { width: windowWidth, height: windowHeight } = useWindowSize();
  const isMobile = windowWidth ? windowWidth < 768 : false;

  // Find artifact definition
  const artifactDefinition = artifactDefinitions.find(
    (definition) => definition.kind === artifact.kind,
  );

  if (!artifactDefinition) {
    throw new Error('Artifact definition not found!');
  }

  // Initialize artifact metadata
  useEffect(() => {
    if (artifact.documentId !== 'init') {
      if (artifactDefinition.initialize) {
        artifactDefinition.initialize({
          documentId: artifact.documentId,
          setMetadata,
        });
      }
    }
  }, [artifact.documentId, artifactDefinition, setMetadata]);

  // Handle panel resizing
  const handlePanelResize = useCallback((newWidth: number) => {
    setLeftPanelWidth(newWidth);
  }, []);

  return (
    <AnimatePresence>
      {artifact.isVisible && (
        <motion.div
          data-testid="artifact"
          className="flex flex-row h-dvh w-dvw fixed top-0 left-0 z-50 bg-background dotted-bg"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { delay: 0.4 } }}
        >
          {/* Background overlay for non-mobile */}
          {!isMobile && (
            <motion.div
              className="fixed bg-background h-dvh"
              initial={{
                width: isSidebarOpen ? windowWidth - 256 : windowWidth,
                right: 0,
              }}
              animate={{ width: windowWidth, right: 0 }}
              exit={{
                width: isSidebarOpen ? windowWidth - 256 : windowWidth,
                right: 0,
              }}
            />
          )}

          {/* Left Panel (Chat Interface) */}
          {!isMobile && (
            <motion.div
              className="relative bg-background dark:bg-muted h-dvh shrink-0 border-r border-border shadow-sm"
              style={{ width: leftPanelWidth }}
              initial={{ opacity: 0, x: 10, scale: 1 }}
              animate={{
                opacity: 1,
                x: 0,
                scale: 1,
                transition: {
                  delay: 0.1,
                  type: 'spring',
                  stiffness: 300,
                  damping: 25,
                },
              }}
              exit={{
                opacity: 0,
                x: 0,
                scale: 1,
                transition: { duration: 0 },
              }}
            >
              <AnimatePresence>
                {!isCurrentVersion && (
                  <motion.div
                    className="left-0 absolute h-dvh top-0 bg-zinc-900/50 z-50"
                    style={{ width: leftPanelWidth }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  />
                )}
              </AnimatePresence>

              <ArtifactChatPanel
                chatId={chatId}
                input={input}
                setInput={setInput}
                handleSubmit={handleSubmit}
                status={status}
                stop={stop}
                append={append} // ✅ Passed append prop to ArtifactChatPanel
                attachments={attachments}
                setAttachments={setAttachments}
                messages={messages}
                setMessages={setMessages}
                reload={reload}
                votes={votes}
                isReadonly={isReadonly}
                selectedVisibilityType={selectedVisibilityType}
                session={session}
                selectedModelId={selectedModelId}
                onModelChange={onModelChange}
                leftPanelWidth={leftPanelWidth}
              />
            </motion.div>
          )}

          {/* Resizable Divider */}
          {!isMobile && (
            <ResizableDivider 
              onResize={handlePanelResize}
              leftPanelWidth={leftPanelWidth}
            />
          )}

          {/* Right Panel (Artifact Content) */}
          <motion.div
            className="fixed bg-background h-dvh flex flex-col overflow-y-hidden md:border-l border-gray-600"
            initial={
              isMobile
                ? {
                    opacity: 1,
                    x: artifact.boundingBox.left,
                    y: artifact.boundingBox.top,
                    height: artifact.boundingBox.height,
                    width: artifact.boundingBox.width,
                    borderRadius: 50,
                  }
                : {
                    opacity: 1,
                    x: artifact.boundingBox.left,
                    y: artifact.boundingBox.top,
                    height: artifact.boundingBox.height,
                    width: artifact.boundingBox.width,
                    borderRadius: 50,
                  }
            }
            animate={
              isMobile
                ? {
                    opacity: 1,
                    x: 0,
                    y: 0,
                    height: windowHeight,
                    width: windowWidth ? windowWidth : 'calc(100dvw)',
                    borderRadius: 0,
                    transition: {
                      delay: 0,
                      type: 'spring',
                      stiffness: 200,
                      damping: 30,
                    },
                  }
                : {
                    opacity: 1,
                    x: leftPanelWidth,
                    y: 0,
                    height: windowHeight,
                    width: windowWidth ? windowWidth - leftPanelWidth : `calc(100dvw - ${leftPanelWidth}px)`,
                    borderRadius: 0,
                    transition: {
                      delay: 0,
                      type: 'spring',
                      stiffness: 200,
                      damping: 30,
                    },
                  }
            }
            exit={{
              opacity: 0,
              scale: 0.5,
              transition: {
                delay: 0.1,
                type: 'spring',
                stiffness: 600,
                damping: 30,
              },
            }}
          >
            {/* Artifact Header - Clean and minimal */}
            <div className="px-4 py-2 flex flex-row justify-between items-center border-b border-[#404040] bg-[#1a1a1a] shrink-0">
              <div className="flex flex-row gap-3 items-center min-w-0 flex-1">
                <ArtifactCloseButton />
                <div className="flex flex-col min-w-0 flex-1">
                  <div className="font-medium text-sm text-white truncate">{artifact.title}</div>
                  {isContentDirty ? (
                    <div className="text-xs text-gray-400 flex items-center gap-1">
                      <div className="w-1 h-1 bg-blue-400 rounded-full animate-pulse"></div>
                      Saving...
                    </div>
                  ) : document ? (
                    <div className="text-xs text-gray-400">
                      {`Updated ${formatDistance(new Date(document.createdAt), new Date(), { addSuffix: true })}`}
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="flex-shrink-0">
                <ArtifactActions
                  artifact={artifact}
                  currentVersionIndex={currentVersionIndex}
                  handleVersionChange={handleVersionChange}
                  isCurrentVersion={isCurrentVersion}
                  mode={mode}
                  metadata={metadata}
                  setMetadata={setMetadata}
                />
              </div>
            </div>

            {/* Artifact Content - Full frame with proper overflow handling */}
            <div className="bg-background dotted-bg flex-1 flex flex-col">
              <div className="relative flex-1">
                {/* Content area - properly contained with overflow handling */}
                <div className="absolute inset-0">
                  <artifactDefinition.content
                    title={artifact.title}
                    content={
                      isCurrentVersion
                        ? artifact.content
                        : getDocumentContentById(currentVersionIndex)
                    }
                    mode={mode}
                    status={artifact.status}
                    currentVersionIndex={currentVersionIndex}
                    suggestions={[]}
                    onSaveContent={saveContent}
                    isInline={false}
                    isCurrentVersion={isCurrentVersion}
                    getDocumentContentById={getDocumentContentById}
                    isLoading={isDocumentsFetching && !artifact.content}
                    metadata={metadata}
                    setMetadata={setMetadata}
                  />
                </div>

                <AnimatePresence>
                  {isCurrentVersion && (
                    <Toolbar
                      isToolbarVisible={isToolbarVisible}
                      setIsToolbarVisible={setIsToolbarVisible}
                      append={append}
                      status={status}
                      stop={stop}
                      setMessages={setMessages}
                      artifactKind={artifact.kind}
                    />
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Version Footer */}
            <AnimatePresence>
              {!isCurrentVersion && (
                <VersionFooter
                  currentVersionIndex={currentVersionIndex}
                  documents={documents}
                  handleVersionChange={handleVersionChange}
                />
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Memoized Artifact component
export const Artifact = memo(PureArtifact, (prevProps, nextProps) => {
  // Prevent re-render if status changes
  if (prevProps.status !== nextProps.status) return false;
  // Compare votes deeply
  if (!equal(prevProps.votes, nextProps.votes)) return false;
  // Check input changes
  if (prevProps.input !== nextProps.input) return false;
  // Compare messages deeply
  if (!equal(prevProps.messages, nextProps.messages)) return false;
  // Check visibility type
  if (prevProps.selectedVisibilityType !== nextProps.selectedVisibilityType) return false;
  // Check model ID
  if (prevProps.selectedModelId !== nextProps.selectedModelId) return false;

  return true;
});
