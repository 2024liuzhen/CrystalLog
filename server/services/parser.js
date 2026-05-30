// Crystal screening kit Excel parser
// Handles 12 different Molecular Dimensions kit formats

// ---------- Helper: normalize row ----------
function normalizeRow(row) {
  return Array.from(row || []).map(c => (c != null && String(c).trim() !== '') ? String(c).trim() : '');
}

// ---------- Helper: check if row is empty ----------
function isEmptyRow(row) {
  return row.every(c => c === '');
}

// ---------- Helper: check if row is a note/annotation (all text, no numbers or well IDs) ----------
function isNoteRow(row) {
  const text = row.join(' ');
  const hasWellId = /\b([A-H][1-9]\d?|\d+[-\s]\d+)\b/i.test(text);
  const hasNumbers = /\d/.test(text);
  if (hasWellId) return false;
  if (row.length > 0) {
    const numCount = row.filter(c => /^\d+(\.\d+)?$/.test(c)).length;
    if (numCount >= 2) return false;
  }
  // Long all-text rows are probably notes
  return text.length > 20 && !hasNumbers;
}

// ---------- Header detection ----------
const HEADER_KEYWORDS = ['tube', 'well', 'salt', 'buffer', 'precipitant', 'precip', 'additive', 'screen id', 'conc', 'unit', 'ph'];

function countHeaderKeywords(row) {
  const text = row.join(' ').toLowerCase();
  let count = 0;
  for (const kw of HEADER_KEYWORDS) {
    if (text.includes(kw)) count++;
  }
  return count;
}

function looksLikeDataRow(row) {
  const text = row.filter(c => c !== '').join(' ');
  return /\d/.test(text) && text.length > 2;
}

function findHeaderRow(data, maxScan = 30) {
  for (let i = 0; i < Math.min(data.length, maxScan); i++) {
    const row = normalizeRow(data[i]);
    const kwCount = countHeaderKeywords(row);

    if (kwCount >= 3) {
      // Verify next row looks like data
      for (let j = i + 1; j < Math.min(i + 4, data.length); j++) {
        const nextRow = normalizeRow(data[j]);
        if (isEmptyRow(nextRow)) continue;
        if (isNoteRow(nextRow)) continue;
        if (looksLikeDataRow(nextRow)) return i;
      }
    }
  }
  return -1;
}

// ---------- Column classification ----------
function classifyColumn(headerText) {
  const h = headerText.toLowerCase().trim();
  if (!h) return { type: 'ignore' };

  // well identifier (check before other patterns since "well" is unique)
  if (/^(tube|well)(\s*(#|no\.?))?$/i.test(headerText.trim())) {
    return { type: 'well_id' };
  }
  if (/^screen\s*id$/i.test(h)) return { type: 'well_id' };

  // pH column
  if (/^ph$/i.test(h)) return { type: 'ph' };

  // Concentration columns
  if (/^conc\.?\d*$/i.test(h)) return { type: 'concentration', index: extractIndex(h) };

  // Unit columns
  if (/^unit(s?)\d*$/i.test(h)) return { type: 'unit', index: extractIndex(h) };

  // Salt columns — match "Salt", "Salt1", "Salt 1", "Salt2" etc.
  if (/^salt\s*\d*$/i.test(h)) return { type: 'salt', index: extractIndex(h) };

  // Buffer columns
  if (/^buffer\s*\d*$/i.test(h)) return { type: 'buffer', index: extractIndex(h) };

  // Precipitant columns (handle "precipitant", "precip", "precipitant1", "precip1", etc.)
  if (/^precip(it(ant)?)?\s*\d*$/i.test(h)) return { type: 'precipitant', index: extractIndex(h) };

  // Additive columns
  if (/^additive/i.test(h)) return { type: 'additive', index: extractIndex(h) };

  return { type: 'ignore' };
}

function extractIndex(text) {
  const m = text.match(/(\d+)$/);
  return m ? parseInt(m[1]) : 1;
}

// ---------- Build component groups ----------
function buildComponentGroups(schema) {
  const groups = { salts: [], buffers: [], precipitants: [], additives: [] };

  for (let ci = 0; ci < schema.length; ci++) {
    const col = schema[ci];
    const typeMap = { salt: 'salts', buffer: 'buffers', precipitant: 'precipitants', additive: 'additives' };
    const key = typeMap[col.type];
    if (!key) continue;

    const group = {
      nameCol: ci,
      concCol: -1,
      unitCol: -1,
      phCol: -1,
      componentType: col.type,
      componentIndex: col.index || 1
    };

    // Look LEFT for concentration and unit (Pattern 1: [Conc, Unit, Name])
    // Check 2 positions to the left
    if (ci >= 2 && schema[ci - 2].type === 'concentration' && schema[ci - 1].type === 'unit') {
      group.concCol = ci - 2;
      group.unitCol = ci - 1;
    } else if (ci >= 2 && schema[ci - 2].type === 'concentration' && schema[ci - 1].type === 'ignore' && !schema[ci - 1]._raw) {
      // Header has empty/Nan unit column (e.g. JCSG-plus format) — treat as unit
      group.concCol = ci - 2;
      group.unitCol = ci - 1;
    } else if (ci >= 1 && schema[ci - 1].type === 'unit') {
      group.unitCol = ci - 1;
      if (ci >= 2 && schema[ci - 2].type === 'concentration') group.concCol = ci - 2;
    } else if (ci >= 1 && schema[ci - 1].type === 'concentration') {
      group.concCol = ci - 1;
    }

    // If nothing on left, check RIGHT (Pattern 2: [Name, Conc, Unit])
    if (group.concCol === -1 && ci + 1 < schema.length && schema[ci + 1].type === 'concentration') {
      group.concCol = ci + 1;
      if (ci + 2 < schema.length && schema[ci + 2].type === 'unit') group.unitCol = ci + 2;
      if (ci + 2 < schema.length && schema[ci + 2].type === 'ignore' && !schema[ci + 2]._raw) group.unitCol = ci + 2;
    }

    // For buffers, look for adjacent pH column (to the right)
    if (col.type === 'buffer') {
      for (let offset = 1; offset <= 2; offset++) {
        if (ci + offset < schema.length && schema[ci + offset].type === 'ph') {
          group.phCol = ci + offset;
          break;
        }
      }
    }

    groups[key].push(group);
  }

  return groups;
}

// ---------- Extract component from row ----------
function extractComponent(row, group) {
  const name = (group.nameCol >= 0 && group.nameCol < row.length) ? row[group.nameCol] : '';
  if (!name || name === '-' || /^none$/i.test(name)) return null;

  const conc = group.concCol >= 0 && group.concCol < row.length ? row[group.concCol] : '';
  const unit = group.unitCol >= 0 && group.unitCol < row.length ? row[group.unitCol] : '';
  const ph = group.phCol >= 0 && group.phCol < row.length ? row[group.phCol] : '';

  const parts = [];
  if (conc) parts.push(conc);
  if (unit) {
    // Normalize unit display
    const u = unit.replace(/%\s*w\/v/i, '% w/v').replace(/%\s*v\/v/i, '% v/v');
    parts.push(u);
  }
  parts.push(name);

  if (ph) {
    const phNum = parseFloat(ph);
    if (!isNaN(phNum) && phNum > 0 && phNum < 14) {
      parts.push(`pH ${phNum}`);
    } else if (ph) {
      parts.push(ph);
    }
  }

  return parts.join(' ');
}

// ---------- Well ID extraction and conversion ----------
function extractWellId(row, wellStrategy) {
  const { primaryCol, secondaryCol } = wellStrategy;
  if (primaryCol >= 0 && primaryCol < row.length) {
    const val = row[primaryCol];
    if (val) return val;
  }
  if (secondaryCol >= 0 && secondaryCol < row.length) {
    const val = row[secondaryCol];
    if (val) return val;
  }
  return null;
}

function convertToStandardWell(wellId) {
  const trimmed = String(wellId).trim().toUpperCase();

  // Already a well format like A1-H12
  if (/^[A-H][1-9]\d?$/.test(trimmed)) return trimmed;

  // Tube # format: "X-Y" or "X Y"
  const tubeMatch = trimmed.match(/^(\d+)[-\s](\d+)$/);
  if (tubeMatch) {
    const box = parseInt(tubeMatch[1]);
    const num = parseInt(tubeMatch[2]);
    // box 1 = rows A-D (positions 1-48), box 2 = rows E-H (positions 1-48)
    // Each box: 12 columns per row, 4 rows = 48 positions
    let globalIndex = (box - 1) * 48 + num;
    const rIndex = Math.floor((globalIndex - 1) / 12);
    const cIndex = (globalIndex - 1) % 12 + 1;
    if (rIndex >= 0 && rIndex < 8) {
      return String.fromCharCode(65 + rIndex) + cIndex;
    }
  }

  return null;
}

function determineWellIdStrategy(schema) {
  const wellCols = [];
  schema.forEach((col, idx) => {
    if (col.type === 'well_id') {
      wellCols.push(idx);
    }
  });

  return {
    primaryCol: wellCols.length > 0 ? wellCols[0] : -1,
    secondaryCol: wellCols.length > 1 ? wellCols[1] : -1,
  };
}

// ---------- Kit name hint from filename ----------
export function kitNameFromFilename(filename) {
  if (!filename) return 'Unknown Kit';
  return filename
    .replace(/\.[^/.]+$/, '')
    .replace(/-screen-conditions/i, '')
    .replace(/-?\(MD\d+.*?\)/g, '')
    .replace(/The-|HT-96|FX-96/g, '')
    .replace(/-pre-filled-plate/g, '')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ---------- Detect Ligand-Friendly dual-block format ----------
function detectDualBlock(schema) {
  // Look for duplicate well_id columns spaced ~12 columns apart
  const wellCols = [];
  schema.forEach((col, idx) => {
    if (col.type === 'well_id') wellCols.push(idx);
  });
  if (wellCols.length >= 2 && wellCols[1] - wellCols[0] > 8) {
    const mid = Math.floor((wellCols[0] + wellCols[1]) / 2);
    return { block1: [0, mid], block2: [mid, schema.length], isDual: true };
  }
  return { isDual: false };
}

// ---------- Main parsing function ----------
export function processSheetData(rawData, filename) {
  const allRows = rawData.map(r => normalizeRow(r));

  // Detect dual-block (Ligand-Friendly)
  // We need to find the header first, then classify columns, then check for dual block
  const headerIdx = findHeaderRow(allRows);
  if (headerIdx === -1) return { error: '未找到表头 — 请确保文件包含 Tube/Well, Salt, Buffer, Precipitant 等列' };

  const headerRow = allRows[headerIdx];
  const schema = headerRow.map((cell, idx) => {
    const c = classifyColumn(cell);
    c._raw = cell;
    c._idx = idx;
    return c;
  });

  const dual = detectDualBlock(schema);

  if (dual.isDual) {
    // Parse as two separate kits
    const results = [];
    const blockDefs = [
      { name: 'Block 1', start: dual.block1[0], end: dual.block1[1], suffix: 'HT-96' },
      { name: 'Block 2', start: dual.block2[0], end: dual.block2[1], suffix: 'FX-96' },
    ];

    for (const block of blockDefs) {
      const blockSchema = schema.slice(block.start, block.end).map((col, i) => ({ ...col, _idx: i }));
      const blockData = allRows.map(row => {
        const sliced = row.slice(block.start, block.end);
        // Pad if needed
        while (sliced.length < blockSchema.length) sliced.push('');
        return sliced;
      });

      const blockHeaderIdx = findHeaderRow(blockData, 5);
      if (blockHeaderIdx === -1) continue;

      const result = parseSingleKit(blockData, blockHeaderIdx);
      if (result.error) continue;

      const baseName = kitNameFromFilename(filename);
      result.kitName = `${baseName} ${block.suffix}`;
      results.push(result);
    }

    if (results.length === 0) return { error: '无法解析该文件的任何数据区块' };
    return { conditions: results[0].conditions, count: results[0].count, kitName: results[0].kitName, multiKit: results };
  }

  // Single kit
  const result = parseSingleKit(allRows, headerIdx);
  if (result.error) return result;
  result.kitName = kitNameFromFilename(filename);
  return result;
}

function parseSingleKit(normalizedRows, headerIdx) {
  const headerRow = normalizedRows[headerIdx];
  const schema = headerRow.map((cell, idx) => {
    const c = classifyColumn(cell);
    c._raw = cell;
    c._idx = idx;
    return c;
  });

  const groups = buildComponentGroups(schema);
  const wellStrategy = determineWellIdStrategy(schema);

  if (groups.salts.length === 0 && groups.buffers.length === 0 && groups.precipitants.length === 0 && groups.additives.length === 0) {
    return { error: '未能识别 Salt/Buffer/Precipitant 列 — 文件格式可能不兼容' };
  }

  const conditions = {};
  let lastWellId = null;
  let lastStandardWell = null;

  for (let i = headerIdx + 1; i < normalizedRows.length; i++) {
    const row = normalizedRows[i];
    if (isEmptyRow(row)) continue;
    if (isNoteRow(row)) continue;

    let wellId = extractWellId(row, wellStrategy);
    let standardWell = null;

    if (wellId) {
      standardWell = convertToStandardWell(wellId);
      if (standardWell) {
        lastWellId = wellId;
        lastStandardWell = standardWell;
      }
    } else {
      // Inherit well from previous row (multi-row condition like ProPlex)
      standardWell = lastStandardWell;
    }

    if (!standardWell) continue;

    // Build labelled condition components
    const labelledComponents = [];

    const extractLabeled = (items, typeName) => {
      const extracted = [];
      items.forEach(g => {
        const comp = extractComponent(row, g);
        if (comp) extracted.push(comp);
      });
      if (extracted.length === 0) return;
      if (extracted.length === 1) {
        labelledComponents.push(`[${typeName}] ${extracted[0]}`);
      } else {
        extracted.forEach((c, i) => {
          labelledComponents.push(`[${typeName}${i + 1}] ${c}`);
        });
      }
    };

    extractLabeled(groups.salts, 'Salt');
    extractLabeled(groups.buffers, 'Buffer');
    extractLabeled(groups.precipitants, 'Precipitant');
    extractLabeled(groups.additives, 'Additive');

    const condStr = labelledComponents.join('; ');
    if (!condStr) continue;

    // Multi-row merge: append to existing condition for same well
    if (conditions[standardWell]) {
      const existing = conditions[standardWell];
      // Only append if not duplicate
      if (!existing.includes(condStr)) {
        conditions[standardWell] = existing + '; ' + condStr;
      }
    } else {
      conditions[standardWell] = condStr;
    }
  }

  // Deduplicate parts within each well
  for (const well in conditions) {
    const parts = conditions[well].split('; ').map(s => s.trim()).filter(Boolean);
    conditions[well] = [...new Set(parts)].join('; ');
  }

  const count = Object.keys(conditions).length;
  if (count === 0) return { error: '未解析到任何条件数据' };

  // Sort conditions by well
  const sorted = {};
  const keys = Object.keys(conditions).sort((a, b) => {
    const rA = a.charCodeAt(0), rB = b.charCodeAt(0);
    if (rA !== rB) return rA - rB;
    return parseInt(a.slice(1)) - parseInt(b.slice(1));
  });
  keys.forEach(k => { sorted[k] = conditions[k]; });

  return { conditions: sorted, count };
}
