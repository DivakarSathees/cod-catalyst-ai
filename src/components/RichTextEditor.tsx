import React, { useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Bold, Italic, Underline, List, ListOrdered, Code, Link } from "lucide-react";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    readOnly?: boolean;
    minHeight?: string;
}

export function RichTextEditor({
    value,
    onChange,
    placeholder = "Enter text...",
    className,
    readOnly = false,
    minHeight = "100px",
}: RichTextEditorProps) {
    const editorRef = useRef<HTMLDivElement>(null);

    const execCommand = useCallback((command: string, value?: string) => {
        document.execCommand(command, false, value);
        // Update the parent with the new content
        if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
        }
        editorRef.current?.focus();
    }, [onChange]);

    const handleInput = useCallback(() => {
        if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
        }
    }, [onChange]);

    const ToolbarButton = ({
        command,
        icon: Icon,
        title,
    }: {
        command: string;
        icon: React.ElementType;
        title: string;
    }) => (
        <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-muted"
            onClick={() => execCommand(command)}
            title={title}
            disabled={readOnly}
        >
            <Icon className="h-4 w-4" />
        </Button>
    );

    return (
        <div className={cn("border rounded-lg overflow-hidden bg-[#f5f9f5] dark:bg-muted/30", className)}>
            {/* Toolbar */}
            <div className="flex items-center gap-1 px-2 py-1.5 border-b bg-[#f0f5f0] dark:bg-muted/50">
                <ToolbarButton command="bold" icon={Bold} title="Bold (Ctrl+B)" />
                <ToolbarButton command="italic" icon={Italic} title="Italic (Ctrl+I)" />
                <ToolbarButton command="underline" icon={Underline} title="Underline (Ctrl+U)" />

                <div className="w-px h-5 bg-border mx-1" />

                <ToolbarButton command="insertUnorderedList" icon={List} title="Bullet List" />
                <ToolbarButton command="insertOrderedList" icon={ListOrdered} title="Numbered List" />

                <div className="w-px h-5 bg-border mx-1" />

                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-muted"
                    onClick={() => {
                        const selection = window.getSelection();
                        if (selection && selection.toString()) {
                            execCommand("formatBlock", "pre");
                        }
                    }}
                    title="Code Block"
                    disabled={readOnly}
                >
                    <Code className="h-4 w-4" />
                </Button>

                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-muted"
                    onClick={() => {
                        const url = prompt("Enter URL:");
                        if (url) {
                            execCommand("createLink", url);
                        }
                    }}
                    title="Insert Link"
                    disabled={readOnly}
                >
                    <Link className="h-4 w-4" />
                </Button>

                <div className="w-px h-5 bg-border mx-1" />

                <Select
                    defaultValue="p"
                    onValueChange={(val) => execCommand("formatBlock", val)}
                    disabled={readOnly}
                >
                    <SelectTrigger className="h-8 w-24 text-xs">
                        <SelectValue placeholder="Normal" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="p">Normal</SelectItem>
                        <SelectItem value="h1">Heading 1</SelectItem>
                        <SelectItem value="h2">Heading 2</SelectItem>
                        <SelectItem value="h3">Heading 3</SelectItem>
                        <SelectItem value="pre">Code</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Editor Content */}
            <div
                ref={editorRef}
                contentEditable={!readOnly}
                className={cn(
                    "px-4 py-3 outline-none prose prose-sm dark:prose-invert max-w-none",
                    "focus:ring-0 focus:outline-none",
                    readOnly && "cursor-default bg-muted/20"
                )}
                style={{ minHeight }}
                onInput={handleInput}
                onBlur={handleInput}
                dangerouslySetInnerHTML={{ __html: value }}
                data-placeholder={placeholder}
                suppressContentEditableWarning
            />
        </div>
    );
}

export default RichTextEditor;
