import fs from 'fs';
import path from 'path';
import { executeNeonQuery } from '@/backend/services/neon/neonClient';

export interface ISyncResultItem {
  file: string;
  status: 'created' | 'updated' | 'unchanged' | 'failed' | 'skipped';
  commitSha?: string;
  error?: string;
}

export interface IGithubSyncSummary {
  success: boolean;
  repo: string;
  branch: string;
  totalLocalFiles: number;
  syncedFiles: number;
  failedFiles: number;
  items: ISyncResultItem[];
  timestamp: string;
}

export class GitHubVaultSyncService {
  private static getGithubConfig() {
    const token =
      process.env.GITHUB_VAULT_SYNC_TOKEN ||
      process.env.GITHUB_TOKEN ||
      process.env.GH_TOKEN ||
      '';

    const repo =
      process.env.GITHUB_REPOSITORY ||
      'PrimiasArt/3dHubv2';

    const branch =
      process.env.GITHUB_VAULT_BRANCH ||
      'main';

    return { token, repo, branch };
  }

  public static isConfigured(): boolean {
    const { token } = this.getGithubConfig();
    return Boolean(token && token.trim().length > 0);
  }

  /**
   * Quét toàn bộ file .md trong thư mục data/obsidian-vault
   */
  public static getLocalVaultFiles(): { relativePath: string; absolutePath: string }[] {
    const vaultDir = path.join(process.cwd(), 'data', 'obsidian-vault');
    if (!fs.existsSync(vaultDir)) {
      return [];
    }

    const results: { relativePath: string; absolutePath: string }[] = [];

    function scanDir(dir: string, currentRel: string) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relPath = currentRel ? `${currentRel}/${entry.name}` : entry.name;
        if (entry.isDirectory()) {
          scanDir(fullPath, relPath);
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          results.push({ relativePath: relPath, absolutePath: fullPath });
        }
      }
    }

    scanDir(vaultDir, '');
    return results;
  }

  /**
   * Đồng bộ toàn bộ Vault lên GitHub Repository
   */
  public static async syncAllNotes(): Promise<IGithubSyncSummary> {
    const { token, repo, branch } = this.getGithubConfig();
    const localFiles = this.getLocalVaultFiles();
    const items: ISyncResultItem[] = [];

    if (!token) {
      return {
        success: false,
        repo,
        branch,
        totalLocalFiles: localFiles.length,
        syncedFiles: 0,
        failedFiles: 0,
        items: localFiles.map((f) => ({
          file: f.relativePath,
          status: 'failed',
          error: 'Chưa cấu hình GITHUB_TOKEN hoặc GITHUB_VAULT_SYNC_TOKEN.',
        })),
        timestamp: new Date().toISOString(),
      };
    }

    for (const fileInfo of localFiles) {
      try {
        const content = fs.readFileSync(fileInfo.absolutePath, 'utf-8');
        const repoFilePath = `data/obsidian-vault/${fileInfo.relativePath}`;

        // 1. Kiểm tra file trên GitHub xem đã tồn tại chưa để lấy current SHA
        const checkUrl = `https://api.github.com/repos/${repo}/contents/${repoFilePath}?ref=${branch}`;
        const checkRes = await fetch(checkUrl, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github.v3+json',
            'User-Agent': '3D-Hub-v2-Vault-Sync',
          },
        });

        let existingSha: string | undefined;
        let isSameContent = false;

        if (checkRes.ok) {
          const fileData = await checkRes.json();
          existingSha = fileData.sha;
          if (fileData.content) {
            const remoteContent = Buffer.from(fileData.content, 'base64').toString('utf-8');
            if (remoteContent === content) {
              isSameContent = true;
            }
          }
        }

        if (isSameContent) {
          items.push({
            file: fileInfo.relativePath,
            status: 'unchanged',
            commitSha: existingSha,
          });
          continue;
        }

        // 2. PUT file lên GitHub
        const putUrl = `https://api.github.com/repos/${repo}/contents/${repoFilePath}`;
        const encodedContent = Buffer.from(content, 'utf-8').toString('base64');
        const putRes = await fetch(putUrl, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
            'User-Agent': '3D-Hub-v2-Vault-Sync',
          },
          body: JSON.stringify({
            message: `chore(vault): auto-sync knowledge note [${fileInfo.relativePath}]`,
            content: encodedContent,
            branch,
            sha: existingSha,
          }),
        });

        if (putRes.ok) {
          const putData = await putRes.json();
          const newSha = putData.commit?.sha || putData.content?.sha;
          items.push({
            file: fileInfo.relativePath,
            status: existingSha ? 'updated' : 'created',
            commitSha: newSha,
          });

          // Lưu trạng thái vào Neon DB nếu có
          await executeNeonQuery(
            `INSERT INTO obsidian_vault_notes (id, title, content, github_sha, last_synced_at)
             VALUES ($1, $2, $3, $4, NOW())
             ON CONFLICT (id) DO UPDATE SET 
               content = EXCLUDED.content, 
               github_sha = EXCLUDED.github_sha,
               last_synced_at = NOW();`,
            [fileInfo.relativePath, path.basename(fileInfo.relativePath, '.md'), content, newSha]
          );
        } else {
          const errData = await putRes.json().catch(() => ({}));
          items.push({
            file: fileInfo.relativePath,
            status: 'failed',
            error: errData.message || `Lỗi HTTP ${putRes.status}`,
          });
        }
      } catch (err: any) {
        items.push({
          file: fileInfo.relativePath,
          status: 'failed',
          error: err?.message || 'Lỗi bất định khi sync',
        });
      }
    }

    const failedCount = items.filter((i) => i.status === 'failed').length;
    const syncedCount = items.filter((i) => i.status === 'created' || i.status === 'updated' || i.status === 'unchanged').length;

    return {
      success: failedCount === 0,
      repo,
      branch,
      totalLocalFiles: localFiles.length,
      syncedFiles: syncedCount,
      failedFiles: failedCount,
      items,
      timestamp: new Date().toISOString(),
    };
  }
}
