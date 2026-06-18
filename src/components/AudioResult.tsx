'use client';

interface AudioResultProps {
  audioUrl: string;
  filename: string;
  textLength: number;
  duration?: number;
  size?: number;
}

export default function AudioResult({ audioUrl, filename, textLength, duration, size }: AudioResultProps) {
  // 格式化文件大小
  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // 格式化时长
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full bg-green-50 border border-green-200 rounded-lg p-4">
      <div className="flex items-center space-x-3 mb-4">
        <svg className="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <p className="text-green-800 font-medium">语音生成成功！</p>
          <p className="text-green-600 text-sm">
            文稿 {textLength.toLocaleString()} 字
            {duration && ` · 时长 ${formatDuration(duration)}`}
            {size && ` · 大小 ${formatSize(size)}`}
          </p>
        </div>
      </div>

      {/* 音频播放器 */}
      <audio controls className="w-full mb-4">
        <source src={audioUrl} type="audio/mpeg" />
        您的浏览器不支持音频播放
      </audio>

      {/* 下载按钮 */}
      <a
        href={audioUrl}
        download={filename}
        className="w-full flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
      >
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        下载 MP3
      </a>
    </div>
  );
}
