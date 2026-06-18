'use client';

interface SpeedSelectorProps {
  value: number;
  onChange: (speed: number) => void;
  disabled?: boolean;
}

const speedOptions = [
  { value: 0.85, label: '慢速' },
  { value: 1.0, label: '正常' },
  { value: 1.15, label: '快速' },
];

export default function SpeedSelector({ value, onChange, disabled }: SpeedSelectorProps) {
  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        语速选择
      </label>
      <div className="flex space-x-2">
        {speedOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            disabled={disabled}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              value === option.value
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
