// components/toolbars/EditorHeader.tsx

import { useState } from "react";
import "../../styles/editor/EditorHeader.scss";
import remixiconUrl from "remixicon/fonts/remixicon.symbol.svg";
import ResponsePreview from "../common/ResponsePreview";
import { Editor } from "@tiptap/react";
import { proofreadText } from "../../services";

interface EditorHeaderProps {
  editor: Editor;
}

export default function EditorHeader({ editor }: EditorHeaderProps) {
  const [showModal, setShowModal] = useState(false);
  const [previewText, setPreviewText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleProofread = async () => {
    setIsProcessing(true);
    setShowModal(true);

    try {
      const editedText = await proofreadText(editor.getText());
      setPreviewText(editedText);
    } catch (error) {
      console.error("Error processing text:", error);
      setPreviewText(
        error instanceof Error
          ? `Error: ${error.message}`
          : "An unexpected error occurred while processing the text."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAccept = () => {
    editor.commands.setContent(previewText);
    setShowModal(false);
  };

  const handleDecline = () => {
    setShowModal(false);
  };

  const handleRegenerate = async () => {
    setIsProcessing(true);
    await handleProofread();
  };

  return (
    <>
      <div className="editor-header">
        <div className="agent-toolbar">
          <button
            className="toolbar-item"
            onClick={handleProofread}
            disabled={isProcessing}
          >
            <svg className="remix">
              <use xlinkHref={`${remixiconUrl}#ri-eraser-fill`} />
            </svg>
            Proofread
          </button>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <ResponsePreview
              previewText={previewText}
              isProcessing={isProcessing}
              onAccept={handleAccept}
              onDecline={handleDecline}
              onRegenerate={handleRegenerate}
            />
          </div>
        </div>
      )}
    </>
  );
}
