import fs from 'fs';
import path from 'path';
import { IExpertPrintProfileVariant } from '../../domain/wallet';

export interface IObsidianNote {
  filePath: string;
  relativePath: string;
  folder: string;
  id: string;
  title: string;
  tags: string[];
  frontmatter: Record<string, any>;
  content: string;
  wikiLinks: string[];
  lastModified: string;
}

export interface IVaultStats {
  vaultPath: string;
  totalNotes: number;
  categories: {
    models: number;
    profiles: number;
    defects: number;
    materials: number;
    printers: number;
  };
  recentNotes: { id: string; title: string; folder: string; tags: string[] }[];
}

export class ObsidianVaultService {
  private vaultDir: string;
  private isInitialized = false;

  constructor() {
    this.vaultDir = path.join(process.cwd(), 'data', 'obsidian-vault');
  }

  /**
   * Khởi tạo cấu trúc thư mục Obsidian Vault và nạp dữ liệu tri thức hạt giống
   */
  initVault(): void {
    if (this.isInitialized) return;

    const subFolders = [
      'Models',
      'Profiles',
      'Defects_and_Solutions',
      'Materials',
      'Printers',
    ];

    if (!fs.existsSync(this.vaultDir)) {
      fs.mkdirSync(this.vaultDir, { recursive: true });
    }

    for (const folder of subFolders) {
      const folderPath = path.join(process.cwd(), 'data', 'obsidian-vault', folder);
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }
    }

    // Nạp các tệp hạt giống nếu vault đang trống
    this.seedInitialVaultNotes();
    this.isInitialized = true;
  }

  /**
   * Đọc tất cả các ghi chú markdown (.md) trong Obsidian Vault
   */
  getAllNotes(): IObsidianNote[] {
    this.initVault();
    const notes: IObsidianNote[] = [];

    const scanDir = (dir: string, currentFolder: string) => {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          scanDir(fullPath, entry.name);
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          try {
            const rawContent = fs.readFileSync(fullPath, 'utf8');
            const note = this.parseMarkdownFile(fullPath, currentFolder, rawContent);
            if (note) notes.push(note);
          } catch (e) {
            console.warn(`Lỗi khi đọc file Obsidian ${fullPath}:`, e);
          }
        }
      }
    };

    scanDir(this.vaultDir, 'Root');
    return notes;
  }

  /**
   * Tìm kiếm các ghi chú trong Vault theo từ khóa, tên mô hình hoặc tags
   */
  searchNotes(query: string, categoryFolder?: string): IObsidianNote[] {
    const notes = this.getAllNotes();
    const q = query.toLowerCase().trim();

    return notes.filter((note) => {
      if (categoryFolder && note.folder.toLowerCase() !== categoryFolder.toLowerCase()) {
        return false;
      }
      if (!q) return true;

      const titleMatch = note.title.toLowerCase().includes(q);
      const tagMatch = note.tags.some((t) => t.toLowerCase().includes(q));
      const contentMatch = note.content.toLowerCase().includes(q);
      const idMatch = note.id.toLowerCase().includes(q);

      return titleMatch || tagMatch || contentMatch || idMatch;
    });
  }

  /**
   * Lấy tri thức chuyên biệt cho một mô hình cụ thể từ Vault
   */
  getModelKnowledge(modelName: string): IObsidianNote | null {
    const cleanName = modelName.toLowerCase();
    const notes = this.getAllNotes().filter((n) => n.folder === 'Models');

    // 1. Khớp chính xác
    const exact = notes.find(
      (n) =>
        n.title.toLowerCase() === cleanName ||
        n.id.toLowerCase() === cleanName ||
        cleanName.includes(n.id.toLowerCase())
    );
    if (exact) return exact;

    // 2. Khớp từ khóa cốt lõi
    if (cleanName.includes('benchy')) return notes.find((n) => n.id.includes('benchy')) || null;
    if (cleanName.includes('eule') || cleanName.includes('owl') || cleanName.includes('woven'))
      return notes.find((n) => n.id.includes('eule') || n.id.includes('woven')) || null;
    if (cleanName.includes('dragon')) return notes.find((n) => n.id.includes('dragon')) || null;
    if (cleanName.includes('gear')) return notes.find((n) => n.id.includes('gear')) || null;
    if (cleanName.includes('helmet')) return notes.find((n) => n.id.includes('helmet')) || null;
    if (cleanName.includes('turbine')) return notes.find((n) => n.id.includes('turbine')) || null;
    if (cleanName.includes('eiffel')) return notes.find((n) => n.id.includes('eiffel')) || null;

    return null;
  }

  /**
   * Lưu hoặc cập nhật một ghi chú vào Obsidian Vault
   */
  saveNote(folder: string, filename: string, content: string): string {
    this.initVault();
    const cleanFilename = filename.endsWith('.md') ? filename : `${filename}.md`;
    const targetDir = path.join(this.vaultDir, folder);

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const fullPath = path.join(targetDir, cleanFilename);
    fs.writeFileSync(fullPath, content, 'utf8');
    return fullPath;
  }

  /**
   * Lưu trữ Profile cắt lớp do AI tạo vào Obsidian Vault dưới dạng tài sản số
   */
  saveProfileNote(profile: IExpertPrintProfileVariant): string {
    const safeTitle = (profile.modelName || 'Custom_Model').replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeVariant = (profile.variantId || 'variant').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${safeTitle}_${safeVariant}.md`;

    const wikiLinks = [
      `[[${profile.modelName}]]`,
      `[[${profile.filamentType.split(' ')[0]}]]`,
      `[[Bambu Lab ${profile.compatiblePrinters[0] || 'P1S'}]]`,
    ];

    const markdown = `---
id: ${profile.variantId}
model_name: "${profile.modelName}"
title: "${profile.variantTitle}"
creator: "${profile.creatorName} (${profile.creatorBadge})"
target_style: ${profile.targetStyle}
printers: [${profile.compatiblePrinters.map((p) => `"${p}"`).join(', ')}]
filament: "${profile.filamentType}"
filament_brand: "${profile.filamentBrand}"
nozzle_size_mm: ${profile.nozzleSizeMm}
layer_height_mm: ${profile.layerHeightMm}
first_layer_height_mm: ${profile.firstLayerHeightMm}
wall_loops: ${profile.wallLoops}
wall_generator: "${profile.wallGenerator || 'Arachne'}"
infill_pattern: "${profile.infillPattern}"
infill_density_percent: ${profile.infillDensityPercent}
nozzle_temp_c: ${profile.nozzleTempC}
bed_temp_c: ${profile.bedTempC}
outer_wall_speed_mm_s: ${profile.outerWallSpeedMmS}
inner_wall_speed_mm_s: ${profile.innerWallSpeedMmS}
infill_speed_mm_s: ${profile.infillSpeedMmS}
cooling_fan_percent: ${profile.coolingFanPercent}
retraction_distance_mm: ${profile.retractionDistanceMm}
ironing_enabled: ${profile.ironingEnabled}
tree_support:
  branch_angle_deg: ${profile.treeSupportParams.branchAngleDeg}
  branch_diameter_mm: ${profile.treeSupportParams.branchDiameterMm}
  top_interface_spacing_mm: ${profile.treeSupportParams.topInterfaceSpacingMm}
estimated_hours: ${profile.estimatedHours}
estimated_grams: ${profile.estimatedFilamentGrams}
rating: ${profile.rating}
downloads: ${profile.downloadsCount}
release_date: "${profile.releaseDate || new Date().toISOString().split('T')[0]}"
created_at: "${new Date().toISOString()}"
---

# ${profile.variantTitle}

**Mô hình:** [[${profile.modelName}]]
**Tác giả / Tinh chỉnh bởi:** **${profile.creatorName}** (${profile.creatorBadge})
**Máy in tương thích:** ${profile.compatiblePrinters.join(', ')}

---

## 🎯 Ghi Chú Cân Chỉnh Từ Kỹ Sư In (Tuning Rationale)
> ${profile.creatorNotes}

---

## 📋 Recommended Print Settings
- **Layer height:** \`${profile.recommendedSettingsList?.layerHeight || `${profile.layerHeightMm} mm`}\`
- **Walls:** \`${profile.recommendedSettingsList?.walls ?? profile.wallLoops}\` (${profile.wallGenerator || 'Arachne'})
- **Infill:** \`${profile.recommendedSettingsList?.infill || `${profile.infillDensityPercent}%`}\` (${profile.infillPattern})
- **Support structures:** \`${profile.recommendedSettingsList?.supports || (profile.treeSupportParams.branchDiameterMm > 0 ? 'Activated' : 'Disabled')}\`
- **Material:** \`${profile.recommendedSettingsList?.material || `${profile.filamentType} recommended`}\`

---

## 🛠️ For Best Results
${(profile.forBestResultsList || profile.proTips).map((tip) => `- ${tip}`).join('\n')}

---

## 💡 Đảm Bảo Hoàn Thiện (Outcome Guarantee)
*${profile.outcomeStatement || 'Với thiết lập này, bản in sẽ đạt độ hoàn thiện cao nhất và kết cấu vững chắc.'}*

## 🔗 Liên Kết Tri Thức Liên Quan
${wikiLinks.map((wl) => `- ${wl}`).join('\n')}
`;

    return this.saveNote('Profiles', filename, markdown);
  }

  /**
   * Thống kê toàn diện về Obsidian Knowledge Vault
   */
  getVaultStats(): IVaultStats {
    const notes = this.getAllNotes();

    const categories = {
      models: notes.filter((n) => n.folder === 'Models').length,
      profiles: notes.filter((n) => n.folder === 'Profiles').length,
      defects: notes.filter((n) => n.folder === 'Defects_and_Solutions').length,
      materials: notes.filter((n) => n.folder === 'Materials').length,
      printers: notes.filter((n) => n.folder === 'Printers').length,
    };

    const recentNotes = notes.slice(0, 10).map((n) => ({
      id: n.id,
      title: n.title,
      folder: n.folder,
      tags: n.tags,
    }));

    return {
      vaultPath: this.vaultDir,
      totalNotes: notes.length,
      categories,
      recentNotes,
    };
  }

  /**
   * Phân tích tệp Markdown Obsidian (.md) thành đối tượng có cấu trúc
   */
  private parseMarkdownFile(fullPath: string, folder: string, rawText: string): IObsidianNote | null {
    try {
      const frontmatter: Record<string, any> = {};
      let content = rawText;

      // Trích xuất YAML frontmatter ở đầu file
      if (rawText.startsWith('---')) {
        const endIdx = rawText.indexOf('\n---', 3);
        if (endIdx !== -1) {
          const yamlBlock = rawText.slice(3, endIdx).trim();
          content = rawText.slice(endIdx + 4).trim();

          const lines = yamlBlock.split('\n');
          for (const line of lines) {
            const colonIdx = line.indexOf(':');
            if (colonIdx !== -1) {
              const key = line.slice(0, colonIdx).trim();
              const val = line.slice(colonIdx + 1).trim();

              // Parse mảng JSON hoặc chuỗi
              if (val.startsWith('[') && val.endsWith(']')) {
                try {
                  frontmatter[key] = JSON.parse(val);
                } catch {
                  frontmatter[key] = val.slice(1, -1).split(',').map((s) => s.trim().replace(/^["']|["']$/g, ''));
                }
              } else {
                frontmatter[key] = val.replace(/^["']|["']$/g, '');
              }
            }
          }
        }
      }

      // Trích xuất tiêu đề Markdown đầu tiên (# Title)
      let title = frontmatter.title;
      if (!title) {
        const titleMatch = content.match(/^#\s+(.+)$/m);
        title = titleMatch ? titleMatch[1].trim() : path.basename(fullPath, '.md');
      }

      const id = frontmatter.id || path.basename(fullPath, '.md').toLowerCase().replace(/\s+/g, '-');
      const tags = Array.isArray(frontmatter.tags) ? frontmatter.tags : [];

      // Trích xuất tất cả Obsidian Wiki-links ([[Link]])
      const wikiLinks: string[] = [];
      const linkRegex = /\[\[(.*?)\]\]/g;
      let match;
      while ((match = linkRegex.exec(content)) !== null) {
        wikiLinks.push(match[1]);
      }

      const stats = fs.statSync(fullPath);

      return {
        filePath: fullPath,
        relativePath: path.relative(this.vaultDir, fullPath).replace(/\\/g, '/'),
        folder,
        id,
        title,
        tags,
        frontmatter,
        content,
        wikiLinks: Array.from(new Set(wikiLinks)),
        lastModified: stats.mtime.toISOString(),
      };
    } catch {
      return null;
    }
  }

  /**
   * Tạo các ghi chú Obsidian chuẩn mực ban đầu (Seed Vault)
   */
  private seedInitialVaultNotes(): void {
    const modelsDir = path.join(this.vaultDir, 'Models');
    if (fs.readdirSync(modelsDir).length > 0) return;

    // 1. Note: 3D Benchy
    const benchyMd = `---
id: 3d-benchy
title: "3D Benchy - The Jolly Benchmark"
type: model_knowledge
tags: [benchmark, boat, hull_line, bridging, chimney, overhang]
printers: ["Bambu Lab X1-Carbon", "Bambu Lab P1S", "Bambu Lab A1", "Creality K1", "Prusa MK4"]
materials: ["PLA Basic", "PLA Matte", "PETG"]
difficulty: "Standard"
---

# 3D Benchy - The Jolly Benchmark

3D Benchy là mẫu benchmark in 3D tiêu chuẩn vàng thế giới. Mỗi chi tiết hình học trên thuyền đều được đo lường để bẫy các lỗi in FDM cụ thể.

## 🔍 Điểm Lỗi Cốt Tử & Phép Trừ Lỗi
- **Benchy Hull Line (Gờ ngang thân tàu):** Xuất hiện tại đúng cao độ mặt sàn tàu (Z = 15.5mm).
  - *Nguyên nhân:* Chuyển đổi đột ngột giữa chu trình lớp rỗng sang lớp sàn đặc làm thay đổi thời gian co ngót và lưu lượng đùn nhựa.
  - *Giải pháp:* Khóa cố định **Outer Wall Speed ở 50 - 60 mm/s** trên toàn bộ chiều cao; giữ lưu lượng nhựa đồng đều tuyệt đối.
- **Ống khói tròn (Chimney):**
  - *Giải pháp:* Đặt **Minimum Layer Time = 7 - 8 giây** để đầu in tự động giảm tốc cho quạt 100% làm nguội nhựa kịp thời trước khi đắp lớp mới.
- **Trần vòm Cabin (Bridging 13.5mm):**
  - *Giải pháp:* Bridge Speed 25 mm/s, Bridge Fan 100%, tuyệt đối không cần bật support.

## 🔗 Liên Kết Tri Thức Liên Quan
- [[Benchy Hull Line Defect]]
- [[Cabin Bridging Physics]]
- [[Chimney Minimum Layer Time]]
`;
    fs.writeFileSync(path.join(modelsDir, '3d-benchy.md'), benchyMd, 'utf8');

    // 2. Note: Rootwoven Eule (Lattice Woven Owl)
    const euleMd = `---
id: rootwoven-eule
title: "Rootwoven Eule - The Wisdom Owl"
type: model_knowledge
tags: [lattice, woven, owl, wood_style, thin_struts, no_ironing, part_cooling]
printers: ["Bambu Lab P1S", "Bambu Lab X1-Carbon", "Bambu Lab A1", "H2S", "X2D"]
materials: ["PLA Wood", "PLA Matte", "PLA Standard"]
difficulty: "Advanced"
---

# Rootwoven Eule - The Wisdom Owl

Mô hình cú dạng nan đan rỗng phong cách rễ cây Woven Wood Style cực kỳ nổi tiếng trên MakerWorld của tác giả DElex3D và ModelWorks3D.

## 🔍 Điểm Lỗi Cốt Tử & Phép Trừ Lỗi
- **Tuyệt đối TẮT Ironing (Là phẳng mặt trên):**
  - *Nguyên nhân:* Mẫu rỗng có hàng nghìn khoảng hở nan đan; nếu bật Ironing, đầu in nóng sẽ cào nát các nan mỏng và kéo màng nhựa lấp kín các khe rỗng.
- **Chế độ tạo tường Arachne (Arachne Wall Generator):**
  - *Giải pháp:* Bắt buộc dùng Arachne để phần mềm tự động biến thiên bề rộng nét đùn từ 0.3mm đến 0.6mm, vẽ trọn vẹn từng nan gỗ siêu mảnh.
- **Tree Support chạm bàn in (On Build Plate Only):**
  - *Giải pháp:* Chỉ cho phép Tree Support mọc từ mặt bàn in đỡ cằm và tai cú, không cho phép mọc đâm vào giữa các khoang rỗng bên trong bụng cú.
- **Làm mát cực đại (Part Cooling):**
  - *Giải pháp:* Quạt 100%, Outer wall speed 45 - 50 mm/s để các nan nhô không bị gục xệ.

## 🔗 Liên Kết Tri Thức Liên Quan
- [[Arachne Wall Generation]]
- [[Tree Support On Build Plate Only]]
- [[No Ironing for Lattice]]
`;
    fs.writeFileSync(path.join(modelsDir, 'rootwoven-eule.md'), euleMd, 'utf8');

    // 3. Note: Planetary Gear
    const gearMd = `---
id: planetary-gear
title: "Planetary Gear Bearing"
type: model_knowledge
tags: [mechanical, gear, bearing, print_in_place, tight_clearance, zero_support]
printers: ["Bambu Lab X1-Carbon", "Bambu Lab P1S", "Creality K1", "Prusa MK4"]
materials: ["PETG", "ABS", "PLA Tough"]
difficulty: "High Precision"
---

# Planetary Gear Bearing

Mô hình cụm bánh răng hành tinh in liền Print-in-Place với khe hở dung sai 0.20mm - 0.25mm.

## 🔍 Điểm Lỗi Cốt Tử & Phép Trừ Lỗi
- **TUYỆT ĐỐI KHÔNG BẬT SUPPORT:**
  - *Nguyên nhân:* Bật support sẽ làm nhựa lọt vào giữa các rãnh răng khiến cụm bánh răng bị khóa cứng vĩnh viễn.
- **Triệt tiêu chân voi (Elephant Foot Compensation):**
  - *Giải pháp:* Đặt Elephant Foot Compensation = 0.20 mm ở lớp đầu tiên để mép nhựa không bị bành rộng làm dính khớp đáy.
- **Tăng số vòng tường (Wall Loops = 4):**
  - *Giải pháp:* Bánh răng chịu lực cần vỏ đặc dày, infill Gyroid 25%.

## 🔗 Liên Kết Tri Thức Liên Quan
- [[Elephant Foot Compensation]]
- [[Zero Support Mechanical PIP]]
`;
    fs.writeFileSync(path.join(modelsDir, 'planetary-gear.md'), gearMd, 'utf8');

    // 4. Note: Defects - Benchy Hull Line
    const defectsDir = path.join(this.vaultDir, 'Defects_and_Solutions');
    const hullLineMd = `---
id: benchy-hull-line
title: "Khắc Phục Lỗi Benchy Hull Line Triệt Để"
category: "slicer_tuning"
tags: [benchy, hull_line, surface_quality, orcaslicer, bambu_studio]
---

# Khắc Phục Lỗi Benchy Hull Line Triệt Để

## Hiện Tượng
Một đường gờ ngang nổi cộm chạy dọc quanh thân thuyền Benchy ở cùng độ cao với sàn thuyền (Deck line).

## Cơ Chế Vật Lý
Khi đầu in chuyển từ các lớp chỉ in vỏ thân tàu sang lớp có thêm mặt phẳng sàn tàu nằm ngang, thời gian in của lớp đó đột ngột tăng lên 3-4 lần. Lớp nhựa bên dưới co ngót nhiều hơn, kết hợp với áp suất đầu đùn thay đổi, đẩy lớp vỏ phồng nhẹ ra ngoài.

## Cấu Hình Cắt Lớp Chuẩn Xác
1. Đặt **Outer Wall Speed = 50 mm/s** cố định cho toàn bộ chiều cao bản in.
2. Bật chế độ in **Inner/Outer Wall (In thành trong trước, thành ngoài sau)**.
3. Đồng bộ hóa quạt làm mát ở mức 100% không đổi.
`;
    fs.writeFileSync(path.join(defectsDir, 'benchy-hull-line.md'), hullLineMd, 'utf8');
  }
}

export const obsidianVaultService = new ObsidianVaultService();
