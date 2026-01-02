/**
 * Parsed structure of a project description from LLM output
 */
export interface ParsedDescription {
    problemTitle: string;
    difficultyLevel: string;
    topics: string;
    problemDescription: string;
    inputFormat: string;
    outputFormat: string;
    constraints: string;
    sampleInput: string;
    sampleOutput: string;
    explanation: string;
    edgeCases: string;
    additionalNotes: string;
}

/**
 * Parse LLM text output into structured sections
 */
export function parseDescription(text: string): ParsedDescription {
    const sections: ParsedDescription = {
        problemTitle: "",
        difficultyLevel: "",
        topics: "",
        problemDescription: "",
        inputFormat: "",
        outputFormat: "",
        constraints: "",
        sampleInput: "",
        sampleOutput: "",
        explanation: "",
        edgeCases: "",
        additionalNotes: "",
    };

    if (!text) return sections;

    // Define section markers and their corresponding keys
    const sectionPatterns: { pattern: RegExp; key: keyof ParsedDescription }[] = [
        { pattern: /^(?:#+\s*)?Problem\s*Title\s*:?\s*/im, key: "problemTitle" },
        { pattern: /^(?:#+\s*)?Difficulty\s*(?:Level)?\s*:?\s*/im, key: "difficultyLevel" },
        { pattern: /^(?:#+\s*)?Topic\(?s?\)?\s*:?\s*/im, key: "topics" },
        { pattern: /^(?:#+\s*)?Problem\s*Description\s*:?\s*/im, key: "problemDescription" },
        { pattern: /^(?:#+\s*)?Input\s*Format\s*:?\s*/im, key: "inputFormat" },
        { pattern: /^(?:#+\s*)?Output\s*Format\s*:?\s*/im, key: "outputFormat" },
        { pattern: /^(?:#+\s*)?Constraints?\s*:?\s*/im, key: "constraints" },
        { pattern: /^(?:#+\s*)?Sample\s*Input\s*:?\s*/im, key: "sampleInput" },
        { pattern: /^(?:#+\s*)?Sample\s*Output\s*:?\s*/im, key: "sampleOutput" },
        { pattern: /^(?:#+\s*)?Explanation\s*:?\s*/im, key: "explanation" },
        { pattern: /^(?:#+\s*)?Edge\s*Cases?\s*(?:to\s*Consider)?\s*:?\s*/im, key: "edgeCases" },
        { pattern: /^(?:#+\s*)?Additional\s*Notes?\s*:?\s*/im, key: "additionalNotes" },
    ];

    // Find all section positions
    const sectionPositions: { key: keyof ParsedDescription; start: number; matchLength: number }[] = [];

    for (const { pattern, key } of sectionPatterns) {
        const match = text.match(pattern);
        if (match && match.index !== undefined) {
            sectionPositions.push({
                key,
                start: match.index,
                matchLength: match[0].length,
            });
        }
    }

    // Sort by position
    sectionPositions.sort((a, b) => a.start - b.start);

    // Extract content for each section
    for (let i = 0; i < sectionPositions.length; i++) {
        const current = sectionPositions[i];
        const next = sectionPositions[i + 1];

        const contentStart = current.start + current.matchLength;
        const contentEnd = next ? next.start : text.length;

        let content = text.slice(contentStart, contentEnd).trim();

        // Clean up the content
        content = content
            .replace(/^\*+\s*/, "") // Remove leading asterisks
            .replace(/\s*\*+$/, "") // Remove trailing asterisks
            .trim();

        sections[current.key] = content;
    }

    return sections;
}

/**
 * Serialize structured sections back to text format
 */
export function serializeDescription(sections: ParsedDescription): string {
    const parts: string[] = [];

    if (sections.problemTitle) {
        parts.push(`Problem Title\n${sections.problemTitle}`);
    }
    if (sections.difficultyLevel) {
        parts.push(`Difficulty Level\n${sections.difficultyLevel}`);
    }
    if (sections.topics) {
        parts.push(`Topic(s)\n${sections.topics}`);
    }
    if (sections.problemDescription) {
        parts.push(`Problem Description\n${sections.problemDescription}`);
    }
    if (sections.inputFormat) {
        parts.push(`Input Format\n${sections.inputFormat}`);
    }
    if (sections.outputFormat) {
        parts.push(`Output Format\n${sections.outputFormat}`);
    }
    if (sections.constraints) {
        parts.push(`Constraints\n${sections.constraints}`);
    }
    if (sections.sampleInput) {
        parts.push(`Sample Input\n${sections.sampleInput}`);
    }
    if (sections.sampleOutput) {
        parts.push(`Sample Output\n${sections.sampleOutput}`);
    }
    if (sections.explanation) {
        parts.push(`Explanation\n${sections.explanation}`);
    }
    if (sections.edgeCases) {
        parts.push(`Edge Cases to Consider\n${sections.edgeCases}`);
    }
    if (sections.additionalNotes) {
        parts.push(`Additional Notes\n${sections.additionalNotes}`);
    }

    return parts.join("\n\n");
}

/**
 * Convert plain text to HTML for display
 */
export function textToHtml(text: string): string {
    if (!text) return "";

    return text
        .split("\n")
        .map((line) => {
            if (line.trim() === "") return "<br/>";
            // Convert markdown-like formatting
            let html = line
                .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>") // Bold
                .replace(/\*(.+?)\*/g, "<em>$1</em>") // Italic
                .replace(/`(.+?)`/g, "<code>$1</code>") // Inline code
                .replace(/^- (.+)$/g, "• $1"); // Bullet points
            return `<p>${html}</p>`;
        })
        .join("");
}

/**
 * Convert HTML back to plain text
 */
export function htmlToText(html: string): string {
    if (!html) return "";

    // Create a temporary element
    const temp = document.createElement("div");
    temp.innerHTML = html;

    // Get text content
    return temp.textContent || temp.innerText || "";
}
