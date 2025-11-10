
import React, { useState, useEffect } from 'react';
import { QuizQuestion } from '../types';
import { CheckCircleIcon, XCircleIcon } from './Icons';

interface QuizCardProps {
  question: QuizQuestion;
  questionNumber: number;
  totalQuestions: number;
  onAnswer: (isCorrect: boolean) => void;
  onNext: () => void;
}

const QuizCard: React.FC<QuizCardProps> = ({ question, questionNumber, totalQuestions, onAnswer, onNext }) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState<boolean>(false);

  useEffect(() => {
    setSelectedOption(null);
    setIsAnswered(false);
  }, [question]);

  const handleOptionClick = (option: string) => {
    if (isAnswered) return;
    
    const isCorrect = option === question.correctAnswer;
    setSelectedOption(option);
    setIsAnswered(true);
    onAnswer(isCorrect);
  };

  const getOptionClass = (option: string) => {
    if (!isAnswered) {
      return 'border-gray-600 bg-gray-800 hover:bg-gray-700 hover:border-purple-500';
    }
    if (option === question.correctAnswer) {
      return 'border-green-500 bg-green-900/50 text-white';
    }
    if (option === selectedOption && option !== question.correctAnswer) {
      return 'border-red-500 bg-red-900/50 text-white';
    }
    return 'border-gray-700 bg-gray-800 opacity-60';
  };

  const renderIconForOption = (option: string) => {
    if (!isAnswered) return null;
    if (option === question.correctAnswer) {
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
    }
    if (option === selectedOption && option !== question.correctAnswer) {
        return <XCircleIcon className="w-5 h-5 text-red-500" />;
    }
    return <div className="w-5 h-5"></div>; // Placeholder for alignment
  };

  return (
    <div className="bg-gray-800 border border-gray-700 shadow-2xl shadow-purple-900/20 rounded-xl p-6 md:p-8 w-full transition-all duration-300">
      <div className="text-sm text-purple-400 font-medium mb-2">
        Question {questionNumber} of {totalQuestions}
      </div>
      <h2 className="text-xl md:text-2xl font-bold text-gray-100 mb-4">{question.question}</h2>
      
      {question.code_snippet && (
        <div className="bg-gray-900 rounded-lg p-4 my-4 border border-gray-700">
          <pre className="text-left text-sm text-gray-300 overflow-x-auto">
            <code className="font-mono">{question.code_snippet}</code>
          </pre>
        </div>
      )}

      <div className="space-y-3">
        {question.options.map((option, index) => (
          <button
            key={index}
            onClick={() => handleOptionClick(option)}
            disabled={isAnswered}
            className={`w-full text-left p-4 rounded-lg border-2 transition-all duration-200 flex items-center justify-between ${getOptionClass(option)} ${!isAnswered ? 'cursor-pointer' : 'cursor-default'}`}
          >
            <span className="font-medium text-gray-200">{option}</span>
            {renderIconForOption(option)}
          </button>
        ))}
      </div>

      {isAnswered && (
        <div className="mt-6 p-4 bg-gray-900/70 border border-gray-700 rounded-lg animate-fade-in">
          <h3 className="font-bold text-lg text-purple-400 mb-2">Explanation</h3>
          <p className="text-gray-300">{question.explanation}</p>
        </div>
      )}

      <div className="mt-8 text-right">
        <button
          onClick={onNext}
          disabled={!isAnswered}
          className="px-8 py-3 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors duration-200"
        >
          {questionNumber === totalQuestions ? 'Finish' : 'Next'}
        </button>
      </div>
    </div>
  );
};

export default QuizCard;
