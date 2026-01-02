/**
 * Coding Problem Description Data Types
 * 
 * These types represent the structured format for coding problem descriptions
 * used throughout the application.
 */

/**
 * Structured coding problem description fields
 */
export interface CodingProblemDescription {
    problemTitle: string;
    difficultyLevel: "Easy" | "Medium" | "Hard" | "Expert" | "";
    topics: string; // Comma-separated topics
    problemDescription: string; // HTML formatted
    inputFormat: string; // HTML formatted
    outputFormat: string; // HTML formatted
    constraints: string; // HTML formatted
    sampleInput: string; // Plain text
    sampleOutput: string; // Plain text
    explanation: string; // HTML formatted
    edgeCases: string; // HTML formatted
    additionalNotes: string; // HTML formatted
}

/**
 * Database row from project_descriptions table
 */
export interface ProjectDescriptionRow extends CodingProblemDescription {
    id: string;
    session_id: string;
    user_id: string;
    version: number;
    full_description: string; // Backward compatibility
    created_at: string;
    updated_at: string;
}

/**
 * JSON format returned by AI generation
 */
export interface AIGeneratedProblem {
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
 * Request payload for generating description
 */
export interface GenerateDescriptionRequest {
    messages: ChatMessage[];
    memory: ChatMemory;
    action: "generate_description";
}

/**
 * Chat message structure
 */
export interface ChatMessage {
    role: "user" | "assistant" | "system";
    content: string;
}

/**
 * Chat memory structure
 */
export interface ChatMemory {
    questions_asked: string[];
    user_answers: Record<string, string>;
    ready_to_generate: boolean;
}

/**
 * Insert payload for project_descriptions table
 */
export interface ProjectDescriptionInsert {
    session_id: string;
    user_id: string;
    version: number;
    full_description: string;
    problem_title: string;
    difficulty_level: string;
    topics: string;
    problem_description: string;
    input_format: string;
    output_format: string;
    constraints: string;
    sample_input: string;
    sample_output: string;
    explanation: string;
    edge_cases: string;
    additional_notes: string;
}

/**
 * Difficulty level options
 */
export const DIFFICULTY_LEVELS = ["Easy", "Medium", "Hard", "Expert"] as const;
export type DifficultyLevel = typeof DIFFICULTY_LEVELS[number];

/**
 * Common coding problem topics
 */
export const COMMON_TOPICS = [
    "Arrays",
    "Strings",
    "Linked Lists",
    "Stacks",
    "Queues",
    "Trees",
    "Graphs",
    "Hash Tables",
    "Dynamic Programming",
    "Greedy Algorithms",
    "Backtracking",
    "Bit Manipulation",
    "Math",
    "Two Pointers",
    "Sliding Window",
    "Binary Search",
    "Sorting",
    "Recursion",
    "Divide and Conquer",
] as const;

/**
 * Validates a difficulty level
 */
export function isValidDifficulty(level: string): level is DifficultyLevel {
    return DIFFICULTY_LEVELS.includes(level as DifficultyLevel);
}

/**
 * Parses topics string into array
 */
export function parseTopics(topics: string): string[] {
    return topics
        .split(",")
        .map(t => t.trim())
        .filter(t => t.length > 0);
}

/**
 * Formats topics array into string
 */
export function formatTopics(topics: string[]): string {
    return topics.join(", ");
}

/**
 * Validates a coding problem description
 */
export function validateProblemDescription(
    data: Partial<CodingProblemDescription>
): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.problemTitle || data.problemTitle.trim().length === 0) {
        errors.push("Problem title is required");
    }

    if (!data.difficultyLevel || data.difficultyLevel.trim().length === 0) {
        errors.push("Difficulty level is required");
    } else if (!isValidDifficulty(data.difficultyLevel)) {
        errors.push(`Invalid difficulty level: ${data.difficultyLevel}`);
    }

    if (!data.topics || data.topics.trim().length === 0) {
        errors.push("At least one topic is required");
    }

    if (!data.problemDescription || data.problemDescription.trim().length === 0) {
        errors.push("Problem description is required");
    }

    if (!data.inputFormat || data.inputFormat.trim().length === 0) {
        errors.push("Input format is required");
    }

    if (!data.outputFormat || data.outputFormat.trim().length === 0) {
        errors.push("Output format is required");
    }

    if (!data.constraints || data.constraints.trim().length === 0) {
        errors.push("Constraints are required");
    }

    if (!data.sampleInput || data.sampleInput.trim().length === 0) {
        errors.push("Sample input is required");
    }

    if (!data.sampleOutput || data.sampleOutput.trim().length === 0) {
        errors.push("Sample output is required");
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}

/**
 * Converts HTML to plain text
 */
export function htmlToPlainText(html: string): string {
    if (typeof document === "undefined") {
        // Server-side: simple regex-based stripping
        return html
            .replace(/<[^>]*>/g, "")
            .replace(/&nbsp;/g, " ")
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&quot;/g, '"')
            .trim();
    }

    // Client-side: use DOM
    const temp = document.createElement("div");
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || "";
}

/**
 * Converts plain text to HTML paragraphs
 */
export function plainTextToHtml(text: string): string {
    return text
        .split("\n\n")
        .map(para => `<p>${para.replace(/\n/g, "<br>")}</p>`)
        .join("");
}
