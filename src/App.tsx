// App.tsx
import React, { useState, useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import CharacterCount from "@tiptap/extension-character-count";
import Highlight from "@tiptap/extension-highlight";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import TextStyle from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import MenuBar from "./components/MarksNodes/MenuBar";
import Link from "@tiptap/extension-link";
import CustomBubbleMenu from "./components/BubbleMenu";
import Focus from "@tiptap/extension-focus";
import "./App.scss"; // Ensure you have appropriate styling

const App: React.FC = () => {
  // Global states
  const [isTyping, setIsTyping] = useState(false);
  const [characterCount, setCharacterCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Automatically hide error message after 3 seconds
  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => {
        setErrorMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  // Initialize the TipTap editor with desired extensions and configurations
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: true, linkOnPaste: true }),
      Highlight.configure({ multicolor: true }),
      TaskList,
      TaskItem,
      CharacterCount.configure({ limit: 10000 }),
      Placeholder.configure({
        placeholder: ({ node }) => {
          switch (node.type.name) {
            case "paragraph":
              return "Write something...";
            case "heading":
              return "What’s the title?";
            default:
              return "";
          }
        },
        emptyNodeClass: "empty-node",
      }),
      Underline,
      TextStyle,
      Color,
      Focus.configure({
        className: "has-focus",
        mode: "shallowest",
      }),
    ],
    editable: true,
    onUpdate: ({ editor }) => {
      setCharacterCount(editor.storage.characterCount.characters());
    },
    editorProps: {
      // Removed handleDOMEvents
      // If you have other editorProps, retain them here
    },
  });

  if (!editor) {
    return null; // Render nothing if the editor is not initialized
  }

  return (
    <div className="editor-container">
      {/* Error Message Display */}
      {errorMessage && (
        <div className="error-message" role="alert">
          {errorMessage}
        </div>
      )}

      <div className={`editor ${isProcessing ? "processing" : ""}`}>
        {/* Toolbar/Menu Bar */}
        <MenuBar editor={editor} />

        {/* Editor Content */}
        <EditorContent
          className="editor__content"
          editor={editor}
          spellCheck={false}
          aria-disabled={isTyping || isProcessing}
        />

        {/* Footer with Character Count */}
        <div className="editor__footer">
          <div className="character-count">{characterCount} characters</div>
        </div>

        {/* Custom Bubble Menu */}
        <CustomBubbleMenu
          editor={editor}
          isTyping={isTyping}
          isProcessing={isProcessing}
          setIsTyping={setIsTyping}
          setIsProcessing={setIsProcessing}
          setErrorMessage={setErrorMessage}
        />

        {/* Overlay Removed */}
        {/* 
          Previously, the overlay was used to prevent interactions during typing or processing.
          Since we're removing it, users can freely interact with the editor at all times.
        */}
      </div>
    </div>
  );
};

export default App;