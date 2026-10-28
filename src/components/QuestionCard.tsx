import { useState } from 'react';
import type { Question } from '../types';

interface Props {
  question: Question;
  index: number;
  total: number;
  onAnswer: (selectedIndex: number) => void;
}

export default function QuestionCard({ question, index, total, onAnswer }: Props) {
  const [selected, setSelected] = useState<number | null>(null);

  const choose = (i: number) => {
    if (selected !== null) return;
    setSelected(i);
    onAnswer(i);
  };

  const letters = ['A', 'B', 'C', 'D'];

  return (
    <div className="question-card">
      <div className="question-meta">
        <span className="tag">{question.topic ?? 'General'}</span>
        <span className="progress-text">
          Question {index + 1} of {total}
        </span>
      </div>

      <h2 className="question-text">{question.question}</h2>

      <div className="options">
        {question.options.map((opt, i) => {
          let cls = 'option';
          if (selected !== null) {
            if (i === question.correctIndex) cls += ' correct';
            else if (i === selected) cls += ' wrong';
            else cls += ' dim';
          }
          return (
            <button
              key={i}
              className={cls}
              onClick={() => choose(i)}
              disabled={selected !== null}
            >
              <span className="option-letter">{letters[i]}</span>
              <span className="option-text">{opt}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
