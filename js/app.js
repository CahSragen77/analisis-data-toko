/**
 * AmandaMart ERP - Core Financial Application Engine
 * Pure Client-Side Implementation for PostgreSQL Dump Analyzer
 */

let transTable, saleTable, memberTable, productTable, eodTable;

$(document).ready(function() {
    initDataTables();
    setupEventListeners();
});

function initDataTables() {
    const tableOptions = {
        data: [],
        pageLength: 10,
        deferRender: true,
        language: {
            search: "_INPUT_",
            searchPlaceholder: "Search Ledger Content...",
            lengthMenu: "_MENU_ data per halaman",
            info: "Menampilkan _START_ sampai _END_ dari _TOTAL_ entry",
            paginate: { next: "<i class='bi bi-chevron-right'></i>", previous: "<i class='bi bi-chevron-left'></i>" }
        }
    };

    transTable = $('#transTable').DataTable({ ...tableOptions, columns: getTransColumns(), pageLength: 15 });
    saleTable = $('#saleTable').DataTable({ ...tableOptions, columns: getSaleColumns() });
    memberTable = $('#memberTable').DataTable({ ...tableOptions, columns: getMemberColumns() });
    productTable = $('#productTable').DataTable({ ...tableOptions, columns: getProductColumns() });
    eodTable = $('#eodTable').DataTable({ ...tableOptions, columns: getEodColumns() });
}

function setupEventListeners() {
    $('#sqlUpload').on('change', handleFileUpload);
    $('#exportAllBtn').on('click', exportAllToExcel);
}

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    showToast(`Membaca Storage Dump: ${file.name} ...`, 'info');

    reader.onload = function(e) {
        setTimeout(() => {
            const parsed = parseSQLCopy(e.target.result);
            calculateFinancialInsights(parsed);
            updateUI(parsed);
            showToast(`🚀 Data ERP Terkompilasi!`, 'success');
            $('#exportAllBtn').prop('disabled', false);
        }, 50);
    };
    reader.readAsText(file, 'UTF-8');
}

function parseSQLCopy(sqlText) {
    const result = { c_trans: [], c_tsale: [], m_cust: [], m_loader: [], cek_eod: [] };
    const lines = sqlText.split(/\r?\n/);
    
    let currentTable = null;
    let columns = [];
    let inCopy = false;
    let copyDataLines = [];

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        if (!line) continue;

        let copyMatch = line.match(/^COPY public\.(\w+)\s*\((.*?)\)\s+FROM stdin;/i);
        if (copyMatch) {
            currentTable = copyMatch[1].toLowerCase();
            columns = copyMatch[2].split(',').map(c => c.trim().replace(/"/g, ''));
            inCopy = true;
            copyDataLines = [];
            continue;
        }

        if (inCopy) {
            let trimmed = line.trim();
            if (trimmed === '\\ .' || trimmed === '\\.') {
                if (result[currentTable]) {
                    result[currentTable].push(...parseCopyDataRows(copyDataLines, columns, currentTable));
                }
                inCopy = false;
                currentTable = null;
                continue;
            }
            if (line.startsWith('--')) continue;
            copyDataLines.push(line);
        }
    }
    return result;
}

function parseCopyDataRows(rows, columns, tableName) {
    const dataRows = [];
    for (let row of rows) {
        let values = [];
        let current = '';
        let inEscape = false;

        for (let ch of row) {
            if (ch === '\\' && !inEscape) { inEscape = true; current += ch; continue; }
            if (ch === '\t' && !inEscape) {
                values.push(cleanNullValue(current));
                current = '';
                continue;
            }
            current += ch;
            inEscape = false;
        }
        values.push(cleanNullValue(current));

        if (values.length !== columns.length) continue;
        
        let obj = {};
        columns.forEach((col, idx) => { obj[col] = values[idx]; });

        // Financial Data Data Normalization
        if (['c_trans', 'm_trans', 'trans'].includes(tableName)) {
            obj.price = parseFloat(obj.price) || 0;
            obj.qty = parseFloat(obj.qty) || 0;
            obj.total = obj.price * obj.qty;
            obj.disc = parseFloat(obj.disc) || 0;
        }
        if (tableName === 'c_tsale') {
            obj.jum = parseFloat(obj.jum) || 0;
            obj.cash = parseFloat(obj.cash) || 0;
            obj.card = parseFloat(obj.card) || 0;
            obj.kembali = parseFloat(obj.kembali) || 0;
        }
        if (tableName === 'm_cust') obj.point = parseInt(obj.point) || 0;
        if (tableName === 'm_loader') {
            obj.price1 = parseFloat(obj.price1) || 0; // Harga Jual
            obj.m_price = parseFloat(obj.m_price) || 0; // Harga Beli
        }
        dataRows.push(obj);
    }
    return dataRows;
}

function cleanNullValue(val) {
    if (!val || val === '\\N' || val === 'NULL') return null;
    if (val.startsWith('\\') && val.length > 1) return val.substring(1);
    return val;
}

/**
 * Pro Financial Analyzer Algorithm
 * Menghitung GMV, Estimasi Margin Keuntungan, dan Retensi CRM
 */
function calculateFinancialInsights(data) {
    // 1. GMV & Transaksi
    let totalGmv = 0;
    data.c_trans.forEach(t => { totalGmv += (t.total || 0); });

    // 2. Margin & Profit Analyzer Map
    let productCostMap = {};
    data.m_loader.forEach(p => { productCostMap[p.plu] = p.m_price || 0; });

    let totalEstimatedProfit = 0;
    data.c_trans.forEach(t => {
        let costPrice = productCostMap[t.plu] || 0;
        let itemProfit = (t.price - costPrice) * t.qty;
        totalEstimatedProfit += itemProfit;
    });

    // 3. CRM Ratio
    let memberInvoices = data.c_tsale.filter(s => s.member && s.member !== '-' && s.member.trim() !== '').length;
    let totalInvoices = data.c_tsale.length;
    let memberRatio = totalInvoices > 0 ? Math.round((memberInvoices / totalInvoices) * 100) : 0;

    let activeMembers = data.m_cust.filter(m => m.f_aktif == '1' || m.f_aktif == 'Ya' || m.f_aktif == 't').length;

    // Render Metrics to Dashboard UI
    $('#statGmv').text(formatRupiah(totalGmv));
    $('#statProfit').text(formatRupiah(totalEstimatedProfit));
    $('#statMemberRatio').text(memberRatio + '%');
    $('#statActiveMember').text(activeMembers);
}

function updateUI(data) {
    $('#statTrans').text(data.c_trans.length);
    $('#statSale').text(data.c_tsale.length);
    $('#statProd').text(data.m_loader.length);
    
    // Refresh DataTables Elements
    transTable.clear().rows.add(data.c_trans.map(t => [
        t.no_urut, t.plu, t.descp || '-', t.kategori, formatRupiah(t.price), t.qty, t.disc, t.kd_kasir, t.no_bill, t.tgl_trs, t.kd_store, formatRupiah(t.total)
    ])).draw();
    
    saleTable.clear().rows.add(data.c_tsale.map(s => [
        s.no_fak, s.tgl_f, formatRupiah(s.jum), s.disc, formatRupiah(s.cash), s.j_card || s.card || '-', formatRupiah(s.kembali), s.member || '-', s.kd_store
    ])).draw();
    
    memberTable.clear().rows.add(data.m_cust.map(m => [
        m.kode_member, m.nama_member, m.no_kartu, (m.alamat || '').substring(0, 50), m.telpon, m.point, m.f_aktif == '1' ? '🟢 Active' : '⚪ Suspended'
    ])).draw();
    
    productTable.clear().rows.add(data.m_loader.map(p => [
        p.plu, p.descp, p.kategori, formatRupiah(p.price1), formatRupiah(p.m_price), p.ppn == 1 ? "PPN" : "Non-PPN"
    ])).draw();
    
    eodTable.clear().rows.add(data.cek_eod.map(e => [
        e.kd_ksr, e.date_ksr, e.ip_kasir, e.pakai == 2 ? "❌ Closed (EOD)" : "🟢 Open Ledger"
    ])).draw();
    
    window.parsedDataGlobal = data;
}

function formatRupiah(val) {
    if (val === undefined || val === null) return 'Rp 0';
    let num = parseFloat(val);
    if (isNaN(num)) return val;
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
}

function exportAllToExcel() {
    if (!window.parsedDataGlobal) return;
    const data = window.parsedDataGlobal;
    const wb = XLSX.utils.book_new();
    
    const transSheet = data.c_trans.map(t => ({ 'No Urut': t.no_urut, 'PLU': t.plu, 'Deskripsi': t.descp, 'Kategori': t.kategori, 'Harga': t.price, 'Qty': t.qty, 'Diskon%': t.disc, 'Kasir': t.kd_kasir, 'No Bill': t.no_bill, 'Tanggal': t.tgl_trs, 'Store': t.kd_store, 'Total': t.total }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(transSheet), "Ledger_Detail");
    
    const saleSheet = data.c_tsale.map(s => ({ 'No Faktur': s.no_fak, 'Tgl': s.tgl_f, 'Gross': s.jum, 'Diskon': s.disc, 'Cash': s.cash, 'NonCash': s.j_card || s.card, 'Kembali': s.kembali, 'MemberID': s.member, 'Store': s.kd_store }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(saleSheet), "Jurnal_Sales_Header");
    
    const memberSheet = data.m_cust.map(m => ({ 'ID': m.kode_member, 'Nama': m.nama_member, 'Kartu': m.no_kartu, 'Telepon': m.telpon, 'Poin': m.point, 'Status': m.f_aktif }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(memberSheet), "CRM_Customer");
    
    const prodSheet = data.m_loader.map(p => ({ 'PLU': p.plu, 'Nama Item': p.descp, 'Kategori': p.kategori, 'Harga Jual': p.price1, 'Harga Beli': p.m_price, 'PPN': p.ppn }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(prodSheet), "Inventory_Master");

    XLSX.writeFile(wb, `AmandaMart_ERP_Financials_${new Date().toISOString().slice(0,10)}.xlsx`);
    showToast("Excel Exported Successfully!", "success");
}

function showToast(msg, type = 'success') {
    const toast = $('#toastMsg');
    $('#toastText').text(msg);
    toast.css('background', type === 'success' ? '#059669' : '#1e293b');
    toast.fadeIn(150);
    setTimeout(() => toast.fadeOut(600), 3500);
}
