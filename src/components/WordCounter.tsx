'use client';

interface WordCounterProps {
  text: string;
}

export default function WordCounter({ text }: WordCounterProps) {
  const count = text.length;
  const maxCount = 50000;
  const isOverLimit = count > maxCount;

  return (
    <div className={`text-sm ${isOverLimit ? 'text-red-500' : 'text-gray-500'}`}>
      <span className="font-medium">当前字数：</span>
      <span className={isOverLimit ? 'font-bold' : ''}>{count.toLocaleString()}</span>
      <span> / {maxCount.toLocaleString()}</span>
      {isOverLimit && (
        <span className="ml-2 text-red-500 font-medium">
          ⚠️ 已超过限制
        </span>
      )}
    </div>
  );
}
