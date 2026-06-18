'use client';

import type { TaskStatus as TaskStatusType } from '@/types';

interface TaskStatusProps {
  status: TaskStatusType;
  error?: string;
  onRetry?: () => void;
}

export default function TaskStatus({ status, error, onRetry }: TaskStatusProps) {
  if (status === 'pending' || status === 'processing') {
    return (
      <div className="w-full bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center space-x-3">
          <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <div>
            <p className="text-blue-800 font-medium">正在生成语音...</p>
            <p className="text-blue-600 text-sm">
              {status === 'processing' ? '语音合成中，请耐心等待' : '请稍候，正在处理中'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="w-full bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <svg className="h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-red-800 font-medium">生成失败</p>
              <p className="text-red-600 text-sm">{error || '请重新尝试'}</p>
            </div>
          </div>
          {onRetry && (
            <button
              onClick={onRetry}
              className="ml-4 px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors"
            >
              重试
            </button>
          )}
        </div>
      </div>
    );
  }

  return null;
}
