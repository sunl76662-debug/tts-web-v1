// 音色类型
export interface Voice {
  voice_id: string;
  voice_name: string;
}

// TTS 任务状态（MiniMax 异步模式）
export type TaskStatus =
  | 'pending'
  | 'processing'
  | 'downloading'
  | 'success'
  | 'failed';

// TTS 任务
export interface Task {
  id: string;
  title: string;
  text: string;
  text_length: number;
  voice_id: string;
  speed: number;
  model: string;
  status: TaskStatus;
  task_id: string | null;
  audio_filename: string | null;
  audio_duration: number | null;
  audio_size: number | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

// 创建 TTS 任务请求
export interface CreateTtsRequest {
  title?: string;
  text: string;
  voice_id: string;
}

// TTS 任务状态响应（前端轮询）
export interface TtsStatusResponse {
  status: TaskStatus;
  audio_url?: string;
  audio_filename?: string;
  duration?: number;
  size?: number;
  error?: string;
}

// MiniMax 创建异步任务响应
export interface MinimaxCreateResponse {
  base_resp?: {
    status_code?: number;
    status_msg?: string;
  };
  task_id?: string | number;
  task_token?: string;
  file_id?: string | number;
  usage_characters?: number;
}

// MiniMax 查询任务状态响应
export interface MinimaxQueryResponse {
  base_resp?: {
    status_code?: number;
    status_msg?: string;
  };
  status?: string; // Processing | Success | Failed | Expired
  file_id?: string | number;
  task_id?: string | number;
}
