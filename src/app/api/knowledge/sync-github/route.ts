import { NextResponse } from 'next/server';
import { GitHubVaultSyncService } from '@/backend/services/knowledge/GitHubVaultSyncService';

export async function GET() {
  const isConfigured = GitHubVaultSyncService.isConfigured();
  const localFiles = GitHubVaultSyncService.getLocalVaultFiles();

  return NextResponse.json({
    status: isConfigured ? 'ready' : 'unconfigured',
    isConfigured,
    totalFiles: localFiles.length,
    files: localFiles.map((f) => f.relativePath),
    instruction: isConfigured
      ? 'Gửi POST request đến route này để bắt đầu đồng bộ toàn bộ file markdown lên GitHub repository.'
      : 'Vui lòng cung cấp GITHUB_VAULT_SYNC_TOKEN hoặc GITHUB_TOKEN (Personal Access Token với quyền repo:contents write) trong file .env hoặc Vercel dashboard.',
  });
}

export async function POST() {
  const result = await GitHubVaultSyncService.syncAllNotes();
  return NextResponse.json(result, { status: result.success ? 200 : 207 });
}
