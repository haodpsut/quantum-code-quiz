import { GoogleGenAI } from "@google/genai";
import { QuizQuestion } from "../types";

const TOTAL_QUESTIONS = 50;
const DELIMITER = '---QML_QUIZ_DELIMITER---';

const PROMPT = `
Generate ${TOTAL_QUESTIONS} unique, high-quality, multiple-choice quiz questions about Quantum Machine Learning (QML).
The questions should cover a range of topics including quantum bits (qubits), superposition, entanglement, quantum gates, quantum circuits, variational quantum eigensolvers (VQE), quantum approximate optimization algorithms (QAOA), quantum support vector machines (QSVM), and popular QML libraries like Qiskit, Pennylane, and TensorFlow Quantum.

For each question, adhere to the following rules:
1.  If the question involves code, provide a concise code snippet in the 'code_snippet' field. The snippet should be in Python using a common library like Qiskit or Pennylane.
2.  Provide four distinct options.
3.  Clearly identify the single correct answer.
4.  Provide a clear and concise explanation for the correct answer.
5.  Return EACH question as a single, valid JSON object.
6.  Separate each JSON object with the exact string: "${DELIMITER}".
7.  DO NOT wrap the output in a JSON array or markdown backticks.

Each JSON object must have the following structure:
{
  "question": "A clear and specific question.",
  "code_snippet": "(Optional) A Python code snippet relevant to the question.",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctAnswer": "The exact string of the correct option.",
  "explanation": "A brief explanation of why the answer is correct."
}

Start generating the questions now.
`;

export async function* generateQuizQuestionsStream(): AsyncGenerator<QuizQuestion, void, undefined> {
  // The API key check is now handled by the UI flow before this function is called.
  // A new instance is created on each call to ensure the latest key is used.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const stream = await ai.models.generateContentStream({
    model: 'gemini-2.5-pro', // Using Pro for better JSON generation and code snippets
    contents: PROMPT,
  });

  let buffer = '';
  for await (const chunk of stream) {
    buffer += chunk.text;

    // Process buffer to extract complete JSON objects separated by the delimiter.
    while (buffer.includes(DELIMITER)) {
      const delimiterIndex = buffer.indexOf(DELIMITER);
      const jsonString = buffer.substring(0, delimiterIndex).trim();
      buffer = buffer.substring(delimiterIndex + DELIMITER.length);

      if (jsonString) {
        try {
          const question: QuizQuestion = JSON.parse(jsonString);
          yield question;
        } catch (e) {
          console.error("Failed to parse JSON chunk:", jsonString, e);
          // Continue to the next chunk without yielding a malformed question.
        }
      }
    }
  }

  // After the loop, process any remaining content in the buffer.
  if (buffer.trim()) {
    try {
      const question: QuizQuestion = JSON.parse(buffer.trim());
      yield question;
    } catch (e) {
      console.error("Failed to parse final JSON chunk:", buffer.trim(), e);
    }
  }
}