import React, { useState, useCallback, useEffect } from 'react';
import { QuizQuestion } from './types';
import { generateQuizQuestionsStream } from './services/geminiService';
import QuizCard from './components/QuizCard';
import { BrainIcon, CodeIcon } from './components/Icons';

// Fix: The previous global declaration for `window.aistudio` used an anonymous
// type, which caused a conflict with an existing declaration. By using a named
// interface `AIStudio`, we enable TypeScript's declaration merging and resolve
// the error.
declare global {
    interface AIStudio {
        hasSelectedApiKey: () => Promise<boolean>;
        openSelectKey: () => Promise<void>;
    }
    interface Window {
        aistudio: AIStudio;
    }
}

type QuizState = 'idle' | 'loading' | 'active' | 'finished' | 'error';

const TOTAL_QUESTIONS_TARGET = 50;

// Helper Component: LoadingSpinner
const LoadingSpinner: React.FC = () => (
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400"></div>
);

// Helper Component: ApiKeySetup
interface ApiKeySetupProps {
    onKeySet: () => void;
    error: string | null;
}
const ApiKeySetup: React.FC<ApiKeySetupProps> = ({ onKeySet, error }) => {
    const handleSetupClick = async () => {
        await window.aistudio.openSelectKey();
        onKeySet();
    };

    return (
        <div className="text-center bg-gray-800 p-8 rounded-xl shadow-lg w-full max-w-md mx-auto border border-gray-700">
            <h2 className="text-3xl font-bold text-purple-400 mb-4">Setup Gemini API Key</h2>
            {error && (
                <div className="bg-red-900/50 border border-red-500 p-4 rounded-lg mb-6 text-red-300 text-left text-sm">
                    <p className="font-bold mb-2">Setup Error</p>
                    <p>{error}</p>
                </div>
            )}
            <p className="text-gray-300 mb-6">
                To generate quiz questions, this application requires a Gemini API key.
            </p>
            <button
                onClick={handleSetupClick}
                className="w-full py-3 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 transition-colors mb-4"
            >
                Select API Key
            </button>
            <a
                href="https://ai.google.dev/gemini-api/docs/billing"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-gray-400 hover:text-purple-400 transition-colors"
            >
                Learn more about API keys and billing
            </a>
        </div>
    );
};


// Helper Component: ProgressBar
interface ProgressBarProps {
    value: number;
    max: number;
}
const ProgressBar: React.FC<ProgressBarProps> = ({ value, max }) => {
    const percentage = max > 0 ? (value / max) * 100 : 0;
    return (
        <div className="w-full bg-gray-700 rounded-full h-2.5">
            <div
                className="bg-purple-500 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${percentage}%` }}
            ></div>
        </div>
    );
};

// Helper Component: ScoreSummary
interface ScoreSummaryProps {
    score: number;
    total: number;
    onRestart: () => void;
}
const ScoreSummary: React.FC<ScoreSummaryProps> = ({ score, total, onRestart }) => {
    const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
    const message = percentage >= 80 ? "Excellent!" : percentage >= 50 ? "Good Job!" : "Keep practicing!";

    return (
        <div className="text-center bg-gray-800 p-8 rounded-xl shadow-lg w-full max-w-md mx-auto">
            <h2 className="text-3xl font-bold text-purple-400 mb-2">Quiz Completed!</h2>
            <p className="text-gray-300 mb-6">{message}</p>
            <div className="text-6xl font-bold text-white mb-2">{percentage}<span className="text-3xl text-gray-400">%</span></div>
            <p className="text-gray-400 mb-8">You answered {score} out of {total} questions correctly.</p>
            <button
                onClick={onRestart}
                className="w-full py-3 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 transition-colors"
            >
                Try Another Quiz
            </button>
        </div>
    );
};

// Main App Component
const App: React.FC = () => {
    const [quizState, setQuizState] = useState<QuizState>('idle');
    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
    const [score, setScore] = useState<number>(0);
    const [error, setError] = useState<string | null>(null);
    const [isKeySet, setIsKeySet] = useState<boolean>(false);
    const [isCheckingKey, setIsCheckingKey] = useState<boolean>(true);

    useEffect(() => {
        const checkApiKey = async () => {
            try {
                const hasKey = await window.aistudio.hasSelectedApiKey();
                setIsKeySet(hasKey);
            } catch (e) {
                console.error("Error checking for API key:", e);
                setIsKeySet(false);
            } finally {
                setIsCheckingKey(false);
            }
        };
        checkApiKey();
    }, []);

    const startQuiz = useCallback(async () => {
        setQuizState('loading');
        setQuestions([]);
        setCurrentQuestionIndex(0);
        setScore(0);
        setError(null);

        try {
            const questionStream = generateQuizQuestionsStream();
            for await (const question of questionStream) {
                setQuestions(prev => [...prev, question]);
            }
        } catch (err) {
            console.error(err);
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            
            if (errorMessage.includes("API key not valid")) {
                setError("Your API key appears to be invalid. Please select a new one to continue.");
                setIsKeySet(false);
                setQuizState('idle'); // Reset state to force re-render to the key setup
            } else {
                setError(errorMessage);
                setQuizState('error');
            }
        }
    }, []);
    
    useEffect(() => {
        if (quizState === 'loading' && questions.length > 0) {
            const timer = setTimeout(() => {
                setQuizState('active');
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [quizState, questions.length]);

    const handleAnswer = (isCorrect: boolean) => {
        if (isCorrect) {
            setScore(prev => prev + 1);
        }
    };

    const handleNext = () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        } else {
            setQuizState('finished');
        }
    };
    
    const renderContent = () => {
        if (isCheckingKey) {
            return (
                <div className="text-center flex flex-col items-center gap-6">
                    <LoadingSpinner />
                    <h2 className="text-2xl font-bold text-white">Verifying Setup...</h2>
                </div>
            );
        }

        if (!isKeySet) {
            return <ApiKeySetup 
                error={error}
                onKeySet={() => {
                    setIsKeySet(true);
                    setError(null); // Clear previous errors on new key selection
                }} 
            />;
        }

        switch (quizState) {
            case 'idle':
                return (
                    <div className="text-center">
                        <div className="flex justify-center items-center gap-4 mb-6">
                           <BrainIcon className="w-16 h-16 text-purple-400" />
                           <span className="text-4xl font-bold text-gray-500">+</span>
                           <CodeIcon className="w-16 h-16 text-teal-400" />
                        </div>
                        <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4">Quantum Code Quiz</h1>
                        <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-8">
                            Test your knowledge of Quantum Machine Learning. Get ready for {TOTAL_QUESTIONS_TARGET} code-based questions generated by Gemini.
                        </p>
                        <button
                            onClick={startQuiz}
                            className="px-10 py-4 bg-purple-600 text-white font-bold rounded-lg text-lg hover:bg-purple-700 transition-transform hover:scale-105 duration-200"
                        >
                            Start Quiz
                        </button>
                    </div>
                );
            case 'loading':
                return (
                    <div className="text-center flex flex-col items-center gap-6">
                        <LoadingSpinner />
                        <h2 className="text-2xl font-bold text-white">Generating Your Quantum Quiz...</h2>
                        <div className="w-full max-w-md">
                             <ProgressBar value={questions.length} max={TOTAL_QUESTIONS_TARGET} />
                             <p className="text-gray-400 mt-2">{questions.length} / {TOTAL_QUESTIONS_TARGET} Questions Loaded</p>
                        </div>
                    </div>
                );
            case 'active':
                if (questions.length === 0) return null;
                return (
                    <div className="w-full max-w-3xl">
                        <ProgressBar value={currentQuestionIndex + 1} max={questions.length} />
                        <div className="mt-8">
                          <QuizCard
                            key={currentQuestionIndex}
                            question={questions[currentQuestionIndex]}
                            questionNumber={currentQuestionIndex + 1}
                            totalQuestions={questions.length}
                            onAnswer={handleAnswer}
                            onNext={handleNext}
                          />
                        </div>
                    </div>
                );
            case 'finished':
                return <ScoreSummary score={score} total={questions.length} onRestart={startQuiz} />;
            case 'error':
                 return (
                    <div className="text-center bg-red-900/50 border border-red-500 p-8 rounded-lg">
                        <h2 className="text-2xl font-bold text-red-400 mb-4">An Error Occurred</h2>
                        <p className="text-gray-300 mb-6">{error}</p>
                        <button
                            onClick={() => setQuizState('idle')}
                            className="px-8 py-3 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 transition-colors"
                        >
                            Back to Home
                        </button>
                    </div>
                );
        }
    };

    return (
        <main className="min-h-screen text-white flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
            <div className="w-full flex items-center justify-center">
               {renderContent()}
            </div>
        </main>
    );
};

export default App;
