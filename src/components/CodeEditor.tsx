import Editor from "@monaco-editor/react";
import { Loader2 } from "lucide-react";

interface CodeEditorProps {
    value: string;
    onChange: (value: string | undefined) => void;
    language: string;
    readOnly?: boolean;
    height?: string;
    theme?: "vs-dark" | "light" | "vs";
}

export function CodeEditor({
    value,
    onChange,
    language,
    readOnly = false,
    height = "400px",
    theme = "vs-dark",
}: CodeEditorProps) {
    return (
        <div className="border rounded-lg overflow-hidden">
            <Editor
                height={height}
                language={language}
                value={value}
                onChange={onChange}
                theme={theme}
                options={{
                    readOnly,
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineNumbers: "on",
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    tabSize: 2,
                    wordWrap: "on",
                }}
                loading={
                    <div className="flex items-center justify-center h-full bg-[#1e1e1e]">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                }
            />
        </div>
    );
}
