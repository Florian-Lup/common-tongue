// CustomBubbleMenu.tsx
import React, { useState, useEffect } from "react";
import { BubbleMenu, Editor } from "@tiptap/react";
import remixiconUrl from "remixicon/fonts/remixicon.symbol.svg"; // Ensure this import is present
import "./BubbleMenu.scss";

interface CustomBubbleMenuProps {
  editor: Editor;
  isTyping: boolean;
  isProcessing: boolean;
  setIsTyping: React.Dispatch<React.SetStateAction<boolean>>;
  setIsProcessing: React.Dispatch<React.SetStateAction<boolean>>;
}

const CustomBubbleMenu: React.FC<CustomBubbleMenuProps> = ({
  editor,
  isTyping,
  isProcessing,
  setIsTyping,
  setIsProcessing,
}) => {
  const [isFixing, setIsFixing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const processingColor = "#d3d3d3"; // Light gray
  const CHARACTER_LIMIT = 700; // Define the character limit

  const handleFixGrammar = async () => {
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, " ");

    if (!selectedText) {
      return;
    }

    // Check if selected text exceeds the character limit
    if (selectedText.length > CHARACTER_LIMIT) {
      setErrorMessage(
        `Selected text exceeds the ${CHARACTER_LIMIT} character limit.`
      );
      return;
    }

    try {
      setIsFixing(true);
      setIsProcessing(true);
      setErrorMessage(null);

      if (!editor.isActive("strike")) {
        editor.chain().focus().toggleStrike().run();
      }

      editor.chain().focus().setColor(processingColor).run();

      const response = await fetch("/api/fixGrammar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inputs: { manuscript: selectedText },
          version: "^1.2",
        }),
      });

      const data = await response.json();

      if (response.ok) {
        const { finalRevision } = data;

        editor.commands.focus();

        if (editor.isActive("strike")) {
          editor.chain().focus().toggleStrike().run();
        }

        if (editor.isActive({ color: processingColor })) {
          editor.chain().focus().unsetColor().run();
        }

        typeWriterEffect(editor, from, to, finalRevision);
      } else {
        console.error("Error fixing grammar:", data.error || data.details);
        setErrorMessage("An error occurred.");

        if (editor.isActive("strike")) {
          editor.chain().focus().toggleStrike().run();
        }

        if (editor.isActive({ color: processingColor })) {
          editor.chain().focus().unsetColor().run();
        }
      }
    } catch (error) {
      console.error("Error fixing grammar:", error);
      setErrorMessage("An error occurred.");

      if (editor.isActive("strike")) {
        editor.chain().focus().toggleStrike().run();
      }

      if (editor.isActive({ color: processingColor })) {
        editor.chain().focus().unsetColor().run();
      }
    } finally {
      setIsFixing(false);
      setIsProcessing(false);
    }
  };

  // Typewriter effect function
  const typeWriterEffect = (
    editor: Editor,
    from: number,
    to: number,
    text: string
  ) => {
    setIsTyping(true);

    editor.commands.deleteRange({ from, to });

    let index = 0;
    const length = text.length;

    const interval = setInterval(() => {
      if (index < length) {
        const char = text.charAt(index);
        editor.commands.insertContentAt(from + index, char);
        index++;
      } else {
        clearInterval(interval);
        setIsTyping(false);
        // Set the cursor position after the inserted text
        editor.commands.setTextSelection(from + length);
      }
    }, 10); // Typewriter speed
  };

  // Automatically dismiss error message after 3 seconds
  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => {
        setErrorMessage(null);
      }, 3000); // Dismiss after 3 seconds

      return () => clearTimeout(timer); // Cleanup the timer on component unmount or when errorMessage changes
    }
  }, [errorMessage]);

  return (
    <>
      <BubbleMenu
        editor={editor}
        tippyOptions={{ duration: 100, placement: "bottom" }}
      >
        <div className="bubble-menu">
          <button
            onClick={handleFixGrammar}
            disabled={isFixing || isTyping || isProcessing}
            className="bubble-button"
            title="Fix Grammar" // Tooltip using title attribute
            aria-label="Fix Grammar" // Accessibility for screen readers
          >
            {isFixing || isProcessing || isTyping ? (
              <div className="spinner" aria-label="Loading"></div>
            ) : (
              <svg className="icon" aria-hidden="true">
                <use href={`${remixiconUrl}#ri-eraser-fill`} />
              </svg>
            )}
            Fix Grammar
          </button>
          {/* You can add other buttons here */}
        </div>
      </BubbleMenu>
      {/* Display error message below the BubbleMenu */}
      {errorMessage && (
        <div className="error-message" role="alert">
          {errorMessage}
        </div>
      )}
    </>
  );
};

export default CustomBubbleMenu;
