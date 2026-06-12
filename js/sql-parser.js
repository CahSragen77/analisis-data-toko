function parseSQLCopy(sqlText) {
    const result = { c_trans: [], c_tsale: [], m_cust: [], m_loader: [], cek_eod: [] };
    const lines = sqlText.split(/\r?\n/);
    let currentTable = null, columns = [], inCopy = false, copyDataLines = [];

    for (let line of lines) {
        let copyMatch = line.match(/^COPY public\.(\w+)\s*\((.*?)\)\s+FROM stdin;/i);
        if (copyMatch) {
            currentTable = copyMatch[1].toLowerCase();
            columns = copyMatch[2].split(',').map(c => c.trim().replace(/"/g, ''));
            inCopy = true;
            copyDataLines = [];
            continue;
        }
        if (inCopy) {
            if (line.trim() === '\\ .' || line.trim() === '\\.') {
                const parsedRows = parseCopyDataRows(copyDataLines, columns, currentTable);
                if (result[currentTable]) result[currentTable].push(...parsedRows);
                inCopy = false;
                continue;
            }
            if (line.startsWith('--') || line.trim() === '') continue;
            copyDataLines.push(line);
        }
    }
    return result;
}

function parseCopyDataRows(rows, columns, tableName) {
    const dataRows = [];
    for (let row of rows) {
        if (row.trim() === '') continue;
        let values = [], current = '', inEscape = false;
        for (let ch of row) {
            if (ch === '\\' && !inEscape) { inEscape = true; current += ch; continue; }
            if (ch === '\t' && !inEscape) { values.push(cleanNullValue(current)); current = ''; continue; }
            current += ch; inEscape = false;
        }
        values.push(cleanNullValue(current));
        if (values.length !== columns.length) continue;
        let obj = {};
        columns.forEach((col, idx) => { obj[col] = values[idx]; });
        if (tableName === 'c_trans') {
            obj.price = parseFloat(obj.price) || 0;
            obj.qty = parseFloat(obj.qty) || 0;
            obj.avg_cost = parseFloat(obj.avg_cost) || 0;
        }
        if (tableName === 'c_tsale') obj.jum = parseFloat(obj.jum) || 0;
        dataRows.push(obj);
    }
    return dataRows;
}

function cleanNullValue(val) {
    if (!val || val === '\\N' || val === 'NULL') return null;
    if (val.startsWith('\\') && val.length > 1) return val.substring(1);
    return val;
}
