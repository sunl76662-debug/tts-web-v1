'use client';

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export default function TextInput({ value, onChange, disabled }: TextInputProps) {
  return (
    <div className="w-full">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="请粘贴或输入要转换的文稿内容..."
        className="w-full min-h-[200px] max-h-[400px] px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all resize-y text-gray-900 placeholder-gray-400 disabled:bg-gray-50 disabled:cursor-not-allowed"
        style={{ lineHeight: '1.6' }}
      />
    </div>
  );
}
