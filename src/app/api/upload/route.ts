import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import mammoth from 'mammoth';

export async function POST(request: Request) {
  try {
    // 验证认证
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      );
    }

    // 解析表单数据
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: '请选择文件' },
        { status: 400 }
      );
    }

    // 检查文件类型
    const fileName = file.name.toLowerCase();
    const isTxt = fileName.endsWith('.txt');
    const isDocx = fileName.endsWith('.docx');

    if (!isTxt && !isDocx) {
      return NextResponse.json(
        { error: '暂仅支持 .txt 和 .docx 文件' },
        { status: 400 }
      );
    }

    // 读取文件内容
    const buffer = await file.arrayBuffer();
    let text: string;

    if (isTxt) {
      // TXT 文件直接读取
      text = new TextDecoder('utf-8').decode(buffer);
    } else {
      // DOCX 文件使用 mammoth 解析
      try {
        const result = await mammoth.extractRawText({ arrayBuffer: buffer });
        text = result.value;
      } catch {
        return NextResponse.json(
          { error: '文档解析失败，请尝试复制粘贴文本' },
          { status: 400 }
        );
      }
    }

    // 检查文本是否为空
    if (!text.trim()) {
      return NextResponse.json(
        { error: '文件内容为空' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      text: text.trim(),
      length: text.trim().length,
    });
  } catch (error) {
    console.error('文件上传错误:', error);
    return NextResponse.json(
      { error: '文件处理失败' },
      { status: 500 }
    );
  }
}
