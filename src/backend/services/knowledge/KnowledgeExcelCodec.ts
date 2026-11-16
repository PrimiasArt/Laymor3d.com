import zlib from 'node:zlib';
import { IKnowledgeEntry } from '@/backend/domain/knowledge';
import { normalizeModerationStatus } from './KnowledgeSanitizer';

export interface KnowledgeExcelColumnDef {
  key: string;
  header: string;
  width: number;
}

export const KNOWLEDGE_EXCEL_COLUMNS: KnowledgeExcelColumnDef[] = [
  { key: 'id', header: 'ID_QuyTac', width: 22 },
  { key: 'title', header: 'TenLoi_QuyTac (*)', width: 40 },
  { key: 'defectType', header: 'NhomLoi_DefectType', width: 22 },
  { key: 'severity', header: 'MucDo_Severity', width: 18 },
  { key: 'category', header: 'DanhMuc_Category', width: 24 },
  { key: 'applicableFilaments', header: 'VatLieu_Nhua', width: 20 },
  { key: 'applicablePrinters', header: 'MayIn_TuongThich', width: 20 },
  { key: 'problemSymptom', header: 'DauHieu_HienTuong', width: 38 },
  { key: 'rootCause', header: 'NguyenNhan_GocRe', width: 42 },
  { key: 'solutionText', header: 'GiaiPhap_KhacPhuc (*)', width: 50 },
  { key: 'triggerParamKey', header: 'ThongSo_KichHoat', width: 22 },
  { key: 'triggerOperator', header: 'ToanTu', width: 12 },
  { key: 'triggerThresholdValue', header: 'Nguong_GiaTri', width: 16 },
  { key: 'triggerDescription', header: 'MoTa_DieuKien', width: 32 },
  { key: 'autoFixJson', header: 'BanVa_AutoFix_JSON', width: 36 },
  { key: 'tags', header: 'TuKhoa_Tags', width: 26 },
  { key: 'moderationStatus', header: 'TrangThai_Duyet', width: 16 },
  { key: 'submittedBy', header: 'NguoiDongGop', width: 20 },
  { key: 'reviewedBy', header: 'AdminDuyet', width: 18 },
  { key: 'rejectionReason', header: 'LyDoTuChoi', width: 28 },
  { key: 'updatedAt', header: 'CapNhatCuoi', width: 22 },
];

export interface IParsedKnowledgeExcelRow {
  rowNumber: number;
  id?: string;
  title: string;
  defectType?: string;
  severity?: string;
  category?: string;
  applicableFilaments?: string[];
  applicablePrinters?: string[];
  problemSymptom?: string;
  rootCause?: string;
  solutionText: string;
  triggerCondition?: {
    paramKey?: string;
    operator?: string;
    thresholdValue?: string | number | boolean;
    description?: string;
  };
  autoFixPatch?: Record<string, unknown>;
  tags?: string[];
  requestedStatus?: string;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function escapeXml(raw: unknown): string {
  const str = String(raw ?? '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function decodeXmlEntities(str: string): string {
  return str
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function toExcelCol(colIdx: number): string {
  let col = colIdx + 1;
  let res = '';
  while (col > 0) {
    const rem = (col - 1) % 26;
    res = String.fromCharCode(65 + rem) + res;
    col = Math.floor((col - 1) / 26);
  }
  return res;
}

function colIndexFromRef(cellRef: string): number {
  const match = /^([A-Za-z]+)/.exec(cellRef.trim());
  if (!match) return -1;
  const letters = match[1].toUpperCase();
  let col = 0;
  for (let i = 0; i < letters.length; i++) {
    col = col * 26 + (letters.charCodeAt(i) - 64);
  }
  return col - 1;
}

function entryToRowValues(e: IKnowledgeEntry): string[] {
  const trigger = typeof e.triggerCondition === 'object' ? e.triggerCondition : undefined;
  const patchObj = e.autoFixPatch || e.slicerOverrides;
  const patchJson =
    patchObj && Object.keys(patchObj).length > 0 ? JSON.stringify(patchObj) : '';
  return [
    e.id || '',
    e.title || '',
    e.defectType || 'custom_defect',
    e.severity || 'medium',
    e.category || 'simulator_defect_learning',
    (e.applicableFilaments || ['PLA']).join(', '),
    (e.applicablePrinters || ['all']).join(', '),
    e.problemSymptom || '',
    e.rootCause || '',
    e.solutionText || '',
    trigger?.paramKey || '',
    trigger?.operator || '',
    trigger?.thresholdValue !== undefined ? String(trigger.thresholdValue) : '',
    trigger?.description || '',
    patchJson,
    (e.tags || []).join(', '),
    normalizeModerationStatus(e),
    e.submittedBy || '',
    e.reviewedBy || '',
    e.rejectionReason || '',
    e.updatedAt || e.createdAt || '',
  ];
}

function buildWorksheetXml(
  rows: string[][],
  colWidths: number[],
  freezeHeader: boolean
): string {
  const colsXml = colWidths
    .map(
      (w, idx) =>
        `<col min="${idx + 1}" max="${idx + 1}" width="${w}" customWidth="1"/>`
    )
    .join('');

  const sheetViewsXml = freezeHeader
    ? `<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>`
    : `<sheetViews><sheetView workbookViewId="0"/></sheetViews>`;

  const rowsXml = rows
    .map((cells, rIdx) => {
      const rNum = rIdx + 1;
      const styleIdx = rIdx === 0 ? '1' : '0';
      const cellsXml = cells
        .map((val, cIdx) => {
          const ref = `${toExcelCol(cIdx)}${rNum}`;
          return `<c r="${ref}" t="inlineStr" s="${styleIdx}"><is><t xml:space="preserve">${escapeXml(
            val
          )}</t></is></c>`;
        })
        .join('');
      return `<row r="${rNum}"${rIdx === 0 ? ' ht="26" customHeight="1"' : ''}>${cellsXml}</row>`;
    })
    .join('');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  ${sheetViewsXml}
  <sheetFormatPr defaultRowHeight="20"/>
  <cols>${colsXml}</cols>
  <sheetData>${rowsXml}</sheetData>
</worksheet>`;
}

function buildZipArchive(files: Array<{ name: string; content: Buffer }>): Buffer {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBuf = Buffer.from(file.name, 'utf8');
    const crc = crc32(file.content);
    const compressed = zlib.deflateRawSync(file.content, { level: 6 });

    const localHdr = Buffer.alloc(30);
    localHdr.writeUInt32LE(0x04034b50, 0);
    localHdr.writeUInt16LE(20, 4);
    localHdr.writeUInt16LE(0x0800, 6);
    localHdr.writeUInt16LE(8, 8);
    localHdr.writeUInt16LE(0, 10);
    localHdr.writeUInt16LE(0, 12);
    localHdr.writeUInt32LE(crc, 14);
    localHdr.writeUInt32LE(compressed.length, 18);
    localHdr.writeUInt32LE(file.content.length, 22);
    localHdr.writeUInt16LE(nameBuf.length, 26);
    localHdr.writeUInt16LE(0, 28);

    localParts.push(localHdr, nameBuf, compressed);

    const centralHdr = Buffer.alloc(46);
    centralHdr.writeUInt32LE(0x02014b50, 0);
    centralHdr.writeUInt16LE(20, 4);
    centralHdr.writeUInt16LE(20, 6);
    centralHdr.writeUInt16LE(0x0800, 8);
    centralHdr.writeUInt16LE(8, 10);
    centralHdr.writeUInt16LE(0, 12);
    centralHdr.writeUInt16LE(0, 14);
    centralHdr.writeUInt32LE(crc, 16);
    centralHdr.writeUInt32LE(compressed.length, 20);
    centralHdr.writeUInt32LE(file.content.length, 24);
    centralHdr.writeUInt16LE(nameBuf.length, 28);
    centralHdr.writeUInt16LE(0, 30);
    centralHdr.writeUInt16LE(0, 32);
    centralHdr.writeUInt16LE(0, 34);
    centralHdr.writeUInt16LE(0, 36);
    centralHdr.writeUInt32LE(0, 38);
    centralHdr.writeUInt32LE(offset, 42);

    centralParts.push(centralHdr, nameBuf);
    offset += localHdr.length + nameBuf.length + compressed.length;
  }

  const centralDir = Buffer.concat(centralParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(centralDir.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralDir, eocd]);
}

/**
 * Generates an authentic Microsoft Excel (.xlsx) workbook with:
 * - Sheet 1 (TriThuc_AI): Structured AI Defect Knowledge rows or clean Trainer Template
 * - Sheet 2 (HuongDan_NhapLieu): Vietnamese reference dictionary & allowed parameters
 */
export function buildKnowledgeWorkbookXlsx(
  entries: IKnowledgeEntry[],
  options?: { templateOnly?: boolean }
): Buffer {
  const headers = KNOWLEDGE_EXCEL_COLUMNS.map((c) => c.header);
  const widths = KNOWLEDGE_EXCEL_COLUMNS.map((c) => c.width);

  const sheet1Rows: string[][] = [headers];
  if (options?.templateOnly) {
    sheet1Rows.push([
      '',
      '[VÍ DỤ - SỬA HOẶC XÓA] Nhựa PETG bị kéo tơ & đọng nhựa ở góc nhọn',
      'stringing',
      'high',
      'simulator_defect_learning',
      'PETG, PLA+',
      'all',
      'Sợi nhựa mảnh giăng mạng nhện giữa các trụ thẳng đứng',
      'Nhiệt độ đầu phun > 248°C kết hợp Retraction ngắn < 0.6mm gây rỉ nhựa',
      'Giảm nhiệt đầu phun về 235°C, tăng Retraction lên 1.2mm và tăng Travel Speed',
      'nozzleTemp',
      '>',
      '248',
      'PETG in ở nhiệt độ > 248°C',
      '{"nozzleTemp":235,"retractionDistanceMm":1.2}',
      'petg, stringing, nhiet_do',
      'pending',
      '',
      '',
      '',
      '',
    ]);
  } else {
    for (const entry of entries) {
      sheet1Rows.push(entryToRowValues(entry));
    }
  }

  const guideRows: string[][] = [
    ['TenCot', 'BatBuoc', 'MoTa_Va_GiaTriHopLe'],
    ['ID_QuyTac', 'Không', 'Để trống khi thêm lỗi mới (hệ thống tự cấp ID mới). Giữ nguyên ID nếu Admin muốn cập nhật bài cũ.'],
    ['TenLoi_QuyTac (*)', 'CÓ', 'Tên ngắn gọn mô tả lỗi in 3D (tối thiểu 4 ký tự). VD: "Nhựa ABS bị cong vênh góc bàn in".'],
    ['NhomLoi_DefectType', 'Nên có', 'overhang | warping | stringing | clogging | ringing | delamination | z_seam_scarring | bed_adhesion | layer_shift | custom_defect'],
    ['MucDo_Severity', 'Nên có', 'low | medium | high | critical (mặc định: medium)'],
    ['DanhMuc_Category', 'Không', 'simulator_defect_learning | troubleshooting | material_benchmark | slicer_tuning | printer_hardware | vietnam_environment | commercial_practice'],
    ['VatLieu_Nhua', 'Nên có', 'Danh sách nhựa cách dấu phẩy. VD: PLA, PETG, ABS, TPU, PLA-CF, ASA, PA-CF hoặc all'],
    ['DauHieu_HienTuong', 'Không', 'Dấu hiệu quan sát thấy trên mẫu in hỏng thực tế'],
    ['NguyenNhan_GocRe', 'Không', 'Giải thích nguyên nhân vật lý, nhiệt học, lưu biến nhựa hoặc phần cứng'],
    ['GiaiPhap_KhacPhuc (*)', 'CÓ', 'Giải pháp chi tiết giúp AI tư vấn & người dùng xử lý lỗi (tối thiểu 8 ký tự)'],
    ['ThongSo_KichHoat', 'Không', 'nozzleTemp | bedTemp | printSpeed | retractionDistanceMm | coolingFanSpeed | layerHeight | flowRatio | infillDensity | wallLoops | supportMode | supportAngleThreshold'],
    ['ToanTu / Nguong_GiaTri', 'Không', 'Toán tử: > | < | >= | <= | == | !=  •  Ngưỡng giá trị số hoặc chuỗi (VD: 245, 0.4, tree)'],
    ['BanVa_AutoFix_JSON', 'Không', 'JSON thông số vá tự động trong /3dsim. VD: {"nozzleTemp": 215, "coolingFanSpeed": 100, "supportMode": "tree"}'],
    ['Luu y Trainer', 'QUAN TRỌNG', 'Mọi tài khoản AI Trainer khi Import Excel sẽ tự động lưu lên Neon PostgreSQL ở trạng thái CHỜ DUYỆT (pending) để Admin kiểm tra và duyệt trước khi phát hành toàn hệ thống.'],
  ];

  const sheet1Xml = buildWorksheetXml(sheet1Rows, widths, true);
  const sheet2Xml = buildWorksheetXml(guideRows, [24, 14, 85], true);

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`;

  const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="TriThuc_AI" sheetId="1" r:id="rId1"/>
    <sheet name="HuongDan_NhapLieu" sheetId="2" r:id="rId2"/>
  </sheets>
</workbook>`;

  const workbookRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="2">
    <font><sz val="11"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
  </fonts>
  <fills count="3">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF0F172A"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border><left style="thin"/><right style="thin"/><top style="thin"/><bottom style="thin"/><diagonal/></border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="2">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyAlignment="1" applyBorder="1"><alignment vertical="top" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
  </cellXfs>
  <cellStyles count="1">
    <cellStyle name="Normal" xfId="0" builtinId="0"/>
  </cellStyles>
</styleSheet>`;

  return buildZipArchive([
    { name: '[Content_Types].xml', content: Buffer.from(contentTypesXml, 'utf8') },
    { name: '_rels/.rels', content: Buffer.from(rootRelsXml, 'utf8') },
    { name: 'xl/workbook.xml', content: Buffer.from(workbookXml, 'utf8') },
    { name: 'xl/_rels/workbook.xml.rels', content: Buffer.from(workbookRelsXml, 'utf8') },
    { name: 'xl/styles.xml', content: Buffer.from(stylesXml, 'utf8') },
    { name: 'xl/worksheets/sheet1.xml', content: Buffer.from(sheet1Xml, 'utf8') },
    { name: 'xl/worksheets/sheet2.xml', content: Buffer.from(sheet2Xml, 'utf8') },
  ]);
}

function escapeCsvCell(val: string): string {
  const s = String(val ?? '');
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function buildKnowledgeCsv(entries: IKnowledgeEntry[]): Buffer {
  const headers = KNOWLEDGE_EXCEL_COLUMNS.map((c) => c.header);
  const lines = [headers.map(escapeCsvCell).join(',')];
  for (const e of entries) {
    lines.push(entryToRowValues(e).map(escapeCsvCell).join(','));
  }
  return Buffer.from('\uFEFF' + lines.join('\r\n'), 'utf8');
}

function readZipEntries(zipBuf: Buffer): Map<string, Buffer> {
  const result = new Map<string, Buffer>();
  if (zipBuf.length < 22) return result;

  // Locate End of Central Directory (PK\x05\x06) scanning backwards from tail
  let eocdOffset = -1;
  const minOffset = Math.max(0, zipBuf.length - 65558);
  for (let i = zipBuf.length - 22; i >= minOffset; i--) {
    if (
      zipBuf[i] === 0x50 &&
      zipBuf[i + 1] === 0x4b &&
      zipBuf[i + 2] === 0x05 &&
      zipBuf[i + 3] === 0x06
    ) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset === -1) return result;

  const totalEntries = zipBuf.readUInt16LE(eocdOffset + 10);
  const cdOffset = zipBuf.readUInt32LE(eocdOffset + 16);
  let ptr = cdOffset;

  for (let i = 0; i < totalEntries && ptr + 46 <= zipBuf.length; i++) {
    if (zipBuf.readUInt32LE(ptr) !== 0x02014b50) break;
    const method = zipBuf.readUInt16LE(ptr + 10);
    const compSize = zipBuf.readUInt32LE(ptr + 20);
    const nameLen = zipBuf.readUInt16LE(ptr + 28);
    const extraLen = zipBuf.readUInt16LE(ptr + 30);
    const commentLen = zipBuf.readUInt16LE(ptr + 32);
    const localHeaderOffset = zipBuf.readUInt32LE(ptr + 42);
    const entryName = zipBuf.toString('utf8', ptr + 46, ptr + 46 + nameLen);
    ptr += 46 + nameLen + extraLen + commentLen;

    if (localHeaderOffset + 30 > zipBuf.length) continue;
    if (zipBuf.readUInt32LE(localHeaderOffset) !== 0x04034b50) continue;
    const lNameLen = zipBuf.readUInt16LE(localHeaderOffset + 26);
    const lExtraLen = zipBuf.readUInt16LE(localHeaderOffset + 28);
    const dataStart = localHeaderOffset + 30 + lNameLen + lExtraLen;
    if (dataStart + compSize > zipBuf.length) continue;

    const rawSlice = zipBuf.subarray(dataStart, dataStart + compSize);
    if (method === 0) {
      result.set(entryName.replace(/\\/g, '/'), Buffer.from(rawSlice));
    } else if (method === 8) {
      try {
        result.set(entryName.replace(/\\/g, '/'), zlib.inflateRawSync(rawSlice));
      } catch {
        // Ignore corrupted zip entry
      }
    }
  }

  return result;
}

function parseSharedStringsXml(xml: string): string[] {
  const strings: string[] = [];
  const siRegex = /<si\b[^>]*>([\s\S]*?)<\/si>/g;
  let m: RegExpExecArray | null;
  while ((m = siRegex.exec(xml)) !== null) {
    const inner = m[1];
    const parts: string[] = [];
    const tRegex = /<t\b[^>]*>([\s\S]*?)<\/t>/g;
    let tm: RegExpExecArray | null;
    while ((tm = tRegex.exec(inner)) !== null) {
      parts.push(decodeXmlEntities(tm[1]));
    }
    strings.push(parts.join(''));
  }
  return strings;
}

function parseSheetRowsXml(xml: string, sharedStrings: string[]): string[][] {
  const rows: string[][] = [];
  const rowRegex = /<row\b[^>]*>([\s\S]*?)<\/row>/g;
  let rm: RegExpExecArray | null;

  while ((rm = rowRegex.exec(xml)) !== null) {
    const rowBody = rm[1];
    const cells: string[] = [];
    let nextSequentialCol = 0;

    const cellRegex = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
    let cm: RegExpExecArray | null;
    while ((cm = cellRegex.exec(rowBody)) !== null) {
      const attrs = cm[1] || '';
      const inner = cm[2] || '';
      const refMatch = /\br="([^"]+)"/.exec(attrs);
      const typeMatch = /\bt="([^"]+)"/.exec(attrs);
      const colIdx = refMatch ? colIndexFromRef(refMatch[1]) : nextSequentialCol;
      const targetCol = colIdx >= 0 ? colIdx : nextSequentialCol;
      nextSequentialCol = targetCol + 1;

      const cellType = typeMatch ? typeMatch[1] : '';
      let value = '';

      if (cellType === 'inlineStr' || /<is\b/.test(inner)) {
        const parts: string[] = [];
        const tRegex = /<t\b[^>]*>([\s\S]*?)<\/t>/g;
        let tm: RegExpExecArray | null;
        while ((tm = tRegex.exec(inner)) !== null) {
          parts.push(decodeXmlEntities(tm[1]));
        }
        value = parts.join('');
      } else {
        const vMatch = /<v\b[^>]*>([\s\S]*?)<\/v>/.exec(inner);
        const rawV = vMatch ? decodeXmlEntities(vMatch[1]) : '';
        if (cellType === 's') {
          const idx = Number(rawV);
          value = Number.isInteger(idx) && idx >= 0 && idx < sharedStrings.length ? sharedStrings[idx] : '';
        } else if (cellType === 'b') {
          value = rawV === '1' ? 'true' : 'false';
        } else {
          value = rawV;
        }
      }

      while (cells.length <= targetCol) cells.push('');
      cells[targetCol] = value.trim();
    }

    if (cells.some((c) => c.length > 0)) {
      rows.push(cells);
    }
  }
  return rows;
}

function parseDelimitedText(text: string): string[][] {
  const clean = text.replace(/^\uFEFF/, '');
  const firstLine = clean.split(/\r?\n/, 1)[0] || '';
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semiCount = (firstLine.match(/;/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;
  const delim =
    tabCount > commaCount && tabCount >= semiCount
      ? '\t'
      : semiCount > commaCount
        ? ';'
        : ',';

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (inQuotes) {
      if (ch === '"') {
        if (clean[i + 1] === '"') {
          currentCell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        currentCell += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === delim) {
      currentRow.push(currentCell.trim());
      currentCell = '';
    } else if (ch === '\r') {
      if (clean[i + 1] === '\n') i++;
      currentRow.push(currentCell.trim());
      if (currentRow.some((c) => c.length > 0)) rows.push(currentRow);
      currentRow = [];
      currentCell = '';
    } else if (ch === '\n') {
      currentRow.push(currentCell.trim());
      if (currentRow.some((c) => c.length > 0)) rows.push(currentRow);
      currentRow = [];
      currentCell = '';
    } else {
      currentCell += ch;
    }
  }

  currentRow.push(currentCell.trim());
  if (currentRow.some((c) => c.length > 0)) {
    rows.push(currentRow);
  }
  return rows;
}

function normalizeHeaderName(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

const HEADER_ALIASES: Record<string, string> = {
  id: 'id',
  idquytac: 'id',
  maquytac: 'id',
  title: 'title',
  tenloi: 'title',
  tieude: 'title',
  tieudeloi: 'title',
  tenloiquytac: 'title',
  defecttype: 'defectType',
  nhomloi: 'defectType',
  nhomloidefecttype: 'defectType',
  loailoi: 'defectType',
  severity: 'severity',
  mucdo: 'severity',
  mucdoseverity: 'severity',
  category: 'category',
  danhmuc: 'category',
  danhmuccategory: 'category',
  applicablefilaments: 'applicableFilaments',
  vatlieu: 'applicableFilaments',
  vatlieunhua: 'applicableFilaments',
  vatlieufilaments: 'applicableFilaments',
  filaments: 'applicableFilaments',
  nhua: 'applicableFilaments',
  applicableprinters: 'applicablePrinters',
  mayin: 'applicablePrinters',
  mayintuongthich: 'applicablePrinters',
  printers: 'applicablePrinters',
  problemsymptom: 'problemSymptom',
  dauhieu: 'problemSymptom',
  dauhieuhientuong: 'problemSymptom',
  symptom: 'problemSymptom',
  rootcause: 'rootCause',
  nguyennhan: 'rootCause',
  nguyennhangocre: 'rootCause',
  solutiontext: 'solutionText',
  content: 'solutionText',
  solution: 'solutionText',
  giaiphap: 'solutionText',
  giaiphapkhacphuc: 'solutionText',
  explanation: 'solutionText',
  triggerparamkey: 'triggerParamKey',
  thongsokichhoat: 'triggerParamKey',
  paramkey: 'triggerParamKey',
  triggeroperator: 'triggerOperator',
  toantu: 'triggerOperator',
  operator: 'triggerOperator',
  triggerthresholdvalue: 'triggerThresholdValue',
  nguonggiatri: 'triggerThresholdValue',
  thresholdvalue: 'triggerThresholdValue',
  triggerdescription: 'triggerDescription',
  motadieukien: 'triggerDescription',
  triggercondition: 'triggerDescription',
  autofixjson: 'autoFixJson',
  banvaautofixjson: 'autoFixJson',
  autofixpatch: 'autoFixJson',
  sliceroverrides: 'autoFixJson',
  tags: 'tags',
  tukhoatags: 'tags',
  thetags: 'tags',
  moderationstatus: 'moderationStatus',
  trangthaiduyet: 'moderationStatus',
  status: 'moderationStatus',
};

function resolveFirstWorksheetPath(entries: Map<string, Buffer>): string {
  const wbBuf = entries.get('xl/workbook.xml');
  const relsBuf = entries.get('xl/_rels/workbook.xml.rels');
  if (wbBuf && relsBuf) {
    const wbXml = wbBuf.toString('utf8');
    const relsXml = relsBuf.toString('utf8');
    const firstSheetMatch = /<sheet\b[^>]*r:id="([^"]+)"/.exec(wbXml);
    if (firstSheetMatch) {
      const rId = firstSheetMatch[1];
      const relRegex = new RegExp(
        `<Relationship\\b[^>]*Id="${rId}"[^>]*Target="([^"]+)"`,
        'i'
      );
      const targetMatch = relRegex.exec(relsXml);
      if (targetMatch) {
        const target = targetMatch[1].replace(/^\/+/, '');
        const full = target.startsWith('xl/') ? target : `xl/${target}`;
        if (entries.has(full)) return full;
      }
    }
  }
  if (entries.has('xl/worksheets/sheet1.xml')) return 'xl/worksheets/sheet1.xml';
  for (const key of entries.keys()) {
    if (/^xl\/worksheets\/sheet\d+\.xml$/i.test(key)) return key;
  }
  return '';
}

function splitCommaList(val: string): string[] {
  return val
    .split(/[,;|]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Parses either an .xlsx workbook or UTF-8 .csv uploaded by Admin or AI Trainers.
 */
export function parseKnowledgeSpreadsheetBuffer(
  fileBuffer: Buffer
): {
  format: 'xlsx' | 'csv';
  rows: IParsedKnowledgeExcelRow[];
  skippedExampleRows: number;
} {
  let tableRows: string[][];
  let format: 'xlsx' | 'csv' = 'csv';

  if (fileBuffer.length >= 4 && fileBuffer[0] === 0x50 && fileBuffer[1] === 0x4b) {
    format = 'xlsx';
    const entries = readZipEntries(fileBuffer);
    const sharedBuf = entries.get('xl/sharedStrings.xml');
    const sharedStrings = sharedBuf ? parseSharedStringsXml(sharedBuf.toString('utf8')) : [];
    const sheetPath = resolveFirstWorksheetPath(entries);
    if (!sheetPath || !entries.has(sheetPath)) {
      throw new Error('File .xlsx không chứa trang dữ liệu TriThuc_AI hợp lệ.');
    }
    tableRows = parseSheetRowsXml(entries.get(sheetPath)!.toString('utf8'), sharedStrings);
  } else {
    tableRows = parseDelimitedText(fileBuffer.toString('utf8'));
  }

  if (tableRows.length < 2) {
    return { format, rows: [], skippedExampleRows: 0 };
  }

  const headerCells = tableRows[0];
  const colToField = new Map<number, string>();
  headerCells.forEach((h, idx) => {
    const norm = normalizeHeaderName(h);
    const mapped = HEADER_ALIASES[norm];
    if (mapped) {
      colToField.set(idx, mapped);
    } else if (idx < KNOWLEDGE_EXCEL_COLUMNS.length && KNOWLEDGE_EXCEL_COLUMNS[idx].key) {
      // Allow fallback positional mapping only if header looks close or missing
    }
  });

  if (!Array.from(colToField.values()).includes('title')) {
    throw new Error(
      'Không tìm thấy cột "TenLoi_QuyTac (*)" hoặc "Title" trong dòng tiêu đề Excel/CSV.'
    );
  }

  const parsed: IParsedKnowledgeExcelRow[] = [];
  let skippedExampleRows = 0;

  for (let r = 1; r < tableRows.length; r++) {
    const cells = tableRows[r];
    const record: Record<string, string> = {};
    for (const [colIdx, field] of colToField.entries()) {
      record[field] = (cells[colIdx] || '').trim();
    }

    const title = record.title || '';
    const solutionText = record.solutionText || record.rootCause || record.problemSymptom || '';
    if (!title && !solutionText) continue;

    if (title.startsWith('[VÍ DỤ') || title.startsWith('[EXAMPLE')) {
      skippedExampleRows++;
      continue;
    }

    let autoFixPatch: Record<string, unknown> | undefined;
    if (record.autoFixJson) {
      try {
        const parsedJson = JSON.parse(record.autoFixJson);
        if (parsedJson && typeof parsedJson === 'object' && !Array.isArray(parsedJson)) {
          autoFixPatch = parsedJson;
        }
      } catch {
        // Ignore invalid JSON patch instead of crashing row; row still imports knowledge
      }
    }

    const thresholdRaw = record.triggerThresholdValue || '';
    const thresholdParsed =
      thresholdRaw === ''
        ? undefined
        : thresholdRaw === 'true'
          ? true
          : thresholdRaw === 'false'
            ? false
            : Number.isNaN(Number(thresholdRaw))
              ? thresholdRaw
              : Number(thresholdRaw);

    const hasTrigger =
      Boolean(record.triggerParamKey) ||
      Boolean(record.triggerDescription) ||
      thresholdParsed !== undefined;

    parsed.push({
      rowNumber: r + 1,
      id: record.id || undefined,
      title,
      defectType: record.defectType || undefined,
      severity: record.severity || undefined,
      category: record.category || undefined,
      applicableFilaments: record.applicableFilaments
        ? splitCommaList(record.applicableFilaments)
        : undefined,
      applicablePrinters: record.applicablePrinters
        ? splitCommaList(record.applicablePrinters)
        : undefined,
      problemSymptom: record.problemSymptom || undefined,
      rootCause: record.rootCause || undefined,
      solutionText,
      triggerCondition: hasTrigger
        ? {
            paramKey: record.triggerParamKey || undefined,
            operator: record.triggerOperator || undefined,
            thresholdValue: thresholdParsed,
            description: record.triggerDescription || undefined,
          }
        : undefined,
      autoFixPatch,
      tags: record.tags ? splitCommaList(record.tags) : undefined,
      requestedStatus: record.moderationStatus || undefined,
    });
  }

  return { format, rows: parsed, skippedExampleRows };
}
