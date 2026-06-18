'use client';

import type { Voice } from '@/types';

interface VoiceSelectorProps {
  voices: Voice[];
  selectedVoiceId: string;
  onChange: (voiceId: string) => void;
  disabled?: boolean;
}

export default function VoiceSelector({ voices, selectedVoiceId, onChange, disabled }: VoiceSelectorProps) {
  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        选择音色
      </label>
      <select
        value={selectedVoiceId}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || voices.length === 0}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all bg-white text-gray-900 disabled:bg-gray-50 disabled:cursor-not-allowed appearance-none cursor-pointer"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
          backgroundPosition: 'right 0.75rem center',
          backgroundRepeat: 'no-repeat',
          backgroundSize: '1.25em 1.25em',
        }}
      >
        {voices.length === 0 ? (
          <option value="">加载中...</option>
        ) : (
          voices.map((voice) => (
            <option key={voice.voice_id} value={voice.voice_id}>
              {voice.voice_name}
            </option>
          ))
        )}
      </select>
    </div>
  );
}
