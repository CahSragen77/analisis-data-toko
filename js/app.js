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

    // Sinkronisasi konfigurasi kolom menggunakan format data objek asli Anda
    transTable = $('#transTable').DataTable({ ...tableOptions, columns: getTransColumns(), pageLength: 15 });
    saleTable = $('#saleTable').DataTable({ ...tableOptions, columns: getSaleColumns() });
    memberTable = $('#memberTable').DataTable({ ...tableOptions, columns: getMemberColumns() });
    productTable = $('#productTable').DataTable({ ...tableOptions, columns: getProductColumns() });
    eodTable = $('#eodTable').DataTable({ ...tableOptions, columns: getEodColumns() });
}

function setupEventListeners() {
    const $input = $('#sqlUpload');
    const $dropzone = $('#dropzoneArea');

    // Jika user klik tombol pilih file manual
    $input.on('change', function(e) {
        handleFileSelection(e.target.files[0]);
    });

    // Efek visual saat file diseret di atas browser
    $dropzone.on('dragover dragenter', function(e) {
        e.preventDefault();
        e.stopPropagation();
        $dropzone.addClass('dragover');
    });

    $dropzone.on('dragleave drop', function(e) {
        e.preventDefault();
        e.stopPropagation();
        $dropzone.removeClass('dragover');
    });

    // Jika file dilepas (dropped) di area kotak
    $dropzone.on('drop', function(e) {
        const files = e.originalEvent.dataTransfer.files;
        if (files.length > 0) {
            $input[0].files = files; 
            handleFileSelection(files[0]);
        }
    });

    $('#exportAllBtn').on('click', exportAllToExcel);
} 

function handleFileSelection(file) {
    if (!file) return;

    // Cek ekstensi file
    const fileExtension = file.name.split('.').pop().toLowerCase();
    if (fileExtension !== 'sql' && fileExtension !== 'txt') {
        showToast("⚠️ Format ditolak! Pastikan file berformat .sql atau .txt dump.", "danger");
        return;
    }

    // Tampilkan informasi file ke UI
    $('#loadedFileName').text(file.name);
    $('#loadedFileSize').text((file.size / 1024).toFixed(2) + ' KB');
    $('#filePreviewZone').removeClass('d-none'); 

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

        // Normalisasi Data Keuangan & Angka
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
            obj.price1 = parseFloat(obj.price1) || 0; 
            obj.m_price = parseFloat(obj.m_price) || 0; 
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

function calculateFinancialInsights(data) {
    let totalGmv = 0;
    data.c_trans.forEach(t => { totalGmv += (t.total || 0); });

    let productCostMap = {};
    data.m_loader.forEach(p => { productCostMap[p.plu] = p.m_price || 0; });

    let totalEstimatedProfit = 0;
    data.c_trans.forEach(t => {
        let costPrice = productCostMap[t.plu] || 0;
        let itemProfit = (t.price - costPrice) * t.qty;
        totalEstimatedProfit += itemProfit;
    });

    let memberInvoices = data.c_tsale.filter(s => s.member && s.member !== '-' && s.member.trim() !== '').length;
    let totalInvoices = data.c_tsale.length;
    let memberRatio = totalInvoices > 0 ? Math.round((memberInvoices / totalInvoices) * 100) : 0;

    let activeMembers = data.m_cust.filter(m => m.f_aktif == '1' || m.f_aktif == 'Ya' || m.f_aktif == 't').length;

    $('#statGmv').text(formatRupiah(totalGmv));
    $('#statProfit').text(formatRupiah(totalEstimatedProfit));
    $('#statMemberRatio').text(memberRatio + '%');
    $('#statActiveMember').text(activeMembers);
}

function updateUI(data) {
    $('#statTrans').text(data.c_trans.length);
    $('#statSale').text(data.c_tsale.length);
    $('#statProd').text(data.m_loader.length);
    
    // Sinkronisasi data real-time dengan DataTables objek
    transTable.clear().rows.add(data.c_trans).draw();
    saleTable.clear().rows.add(data.c_tsale).draw();
    memberTable.clear().rows.add(data.m_cust).draw();
    productTable.clear().rows.add(data.m_loader).draw();
    eodTable.clear().rows.add(data.cek_eod).draw();
    
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
    
    // 1. SHEET LEDGER DETAIL (Kolom Harga Hemat / Potongan Diskon)
    const transSheet = data.c_trans.map(t => {
        let hargaMentah = parseFloat(t.price) || 0;
        let kuantitas = parseFloat(t.qty) || 0;
        let persenDiskon = parseFloat(t.disc) || 0;
        
        let hargaHemat = (hargaMentah * kuantitas) * (persenDiskon / 100);

        return { 
            'No Urut': t.no_urut, 
            'PLU': t.plu, 
            'Deskripsi': t.descp, 
            'Kategori': t.kategori, 
            'Harga Satuan': hargaMentah, 
            'Qty': kuantitas, 
            'Diskon%': persenDiskon,
            'Harga Hemat (Diskon)': hargaHemat, 
            'Kasir': t.kd_kasir, 
            'No Bill': t.no_bill, 
            'Tanggal': t.tgl_trs, 
            'Store': t.kd_store, 
            'Total Netto': t.total 
        };
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(transSheet), "Ledger_Detail");
    
    // 2. SHEET JURNAL SALES HEADER (Pemisahan Metode Pembayaran & Total Hemat)
    const saleSheet = data.c_tsale.map(s => {
        let tipeCard = (s.j_card || s.card || '').toUpperCase().trim();
        
        let nilaiDebit = 0;
        let nilaiQris = 0;
        let nilaiKredit = 0;
        let nilaiCardAsli = parseFloat(s.cash) === 0 || s.card ? (parseFloat(s.jum) - parseFloat(s.cash)) : 0; 
        
        if(s.card && !isNaN(parseFloat(s.card))) {
            nilaiCardAsli = parseFloat(s.card);
        }

        if (tipeCard.includes('DEBIT') || tipeCard.includes('BCA') || tipeCard.includes('MANDIRI') || tipeCard.includes('BRI')) {
            nilaiDebit = nilaiCardAsli;
        } else if (tipeCard.includes('QRIS') || tipeCard.includes('GOPAY') || tipeCard.includes('OVO') || tipeCard.includes('DANA') || tipeCard.includes('LINKAJA')) {
            nilaiQris = nilaiCardAsli;
        } else if (tipeCard.includes('KREDIT') || tipeCard.includes('CREDIT') || tipeCard.includes('CC')) {
            nilaiKredit = nilaiCardAsli;
        } else if (tipeCard !== '-' && tipeCard !== '') {
            nilaiDebit = nilaiCardAsli;
        }

        return { 
            'No Faktur': s.no_fak, 
            'Tanggal': s.tgl_f, 
            'Total Gross': s.jum, 
            'Total Hemat (Diskon Faktur)': parseFloat(s.disc) || 0, 
            'Pembayaran Tunai': parseFloat(s.cash) || 0, 
            'Pembayaran Debit': nilaiDebit, 
            'Pembayaran QRIS': nilaiQris, 
            'Pembayaran Kredit': nilaiKredit, 
            'Nama Kartu/Media': s.j_card || s.card || '-',
            'Kembali': parseFloat(s.kembali) || 0, 
            'Member ID': s.member || '-', 
            'Store': s.kd_store 
        };
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(saleSheet), "Jurnal_Sales_Header");
    
    // 3. SHEET CRM CUSTOMER
    const memberSheet = data.m_cust.map(m => ({ 'ID': m.kode_member, 'Nama': m.nama_member, 'Kartu': m.no_kartu, 'Telepon': m.telpon, 'Poin': m.point, 'Status': m.f_aktif }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(memberSheet), "CRM_Customer");
    
    // 4. SHEET INVENTORY MASTER
    const prodSheet = data.m_loader.map(p => ({ 'PLU': p.plu, 'Nama Item': p.descp, 'Kategori': p.kategori, 'Harga Jual': p.price1, 'Harga Beli': p.m_price, 'PPN': p.ppn }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(prodSheet), "Inventory_Master");

    // Tulis file ke komputer user
    XLSX.writeFile(wb, `AmandaMart_ERP_Financials_${new Date().toISOString().slice(0,10)}.xlsx`);
    showToast("Excel Berhasil Diekspor dengan Rincian Baru!", "success");
} // <-- SEKARANG SUDAH BERSIH DAN AMAN

function showToast(msg, type = 'success') {
    const toast = $('#toastMsg');
    $('#toastText').text(msg);
    toast.css('background', type === 'success' ? '#059669' : '#1e293b');
    toast.fadeIn(150);
    setTimeout(() => toast.fadeOut(600), 3500);
}

// Menghubungkan susunan kolom DataTables
function getTransColumns() {
    return [
        { data: "no_urut", defaultContent: "-" }, { data: "plu", defaultContent: "-" }, { data: "descp", defaultContent: "-" }, { data: "kategori", defaultContent: "-" },
        { data: "price", render: function(d){ return formatRupiah(d); } }, { data: "qty", defaultContent: "0" }, { data: "disc", defaultContent: "0" }, { data: "kd_kasir", defaultContent: "-" },
        { data: "no_bill", defaultContent: "-" }, { data: "tgl_trs", defaultContent: "-" }, { data: "kd_store", defaultContent: "-" }, { data: "total", render: function(d){ return formatRupiah(d); } }
    ];
}
function getSaleColumns() {
    return [
        { data: "no_fak", defaultContent: "-" }, { data: "tgl_f", defaultContent: "-" }, { data: "jum", render: function(d){ return formatRupiah(d); } }, { data: "disc", defaultContent: "0" },
        { data: "cash", render: function(d){ return formatRupiah(d); } }, { data: "card", defaultContent: "-" }, { data: "kembali", render: function(d){ return formatRupiah(d); } }, { data: "member", defaultContent: "-" }, { data: "kd_store", defaultContent: "-" }
    ];
}
function getMemberColumns() {
    return [
        { data: "kode_member", defaultContent: "-" }, { data: "nama_member", defaultContent: "-" }, { data: "no_kartu", defaultContent: "-" },
        { data: "alamat", defaultContent: "-" }, { data: "telpon", defaultContent: "-" }, { data: "point", defaultContent: "0" }, { data: "f_aktif", render: function(d){ return d == '1' || d == 't' ? '🟢 Active' : '⚪ Suspended'; } }
    ];
}
function getProductColumns() {
    return [
        { data: "plu", defaultContent: "-" }, { data: "descp", defaultContent: "-" }, { data: "kategori", defaultContent: "-" },
        { data: "price1", render: function(d){ return formatRupiah(d); } }, { data: "m_price", render: function(d){ return formatRupiah(d); } }, { data: "ppn", render: function(d){ return d == 1 ? "PPN" : "Non-PPN"; } }
    ];
}
function getEodColumns() {
    return [
        { data: "kd_ksr", defaultContent: "-" }, { data: "date_ksr", defaultContent: "-" }, { data: "ip_kasir", defaultContent: "-" }, { data: "pakai", render: function(d){ return d == 2 ? "❌ Closed (EOD)" : "🟢 Open Ledger"; } }
    ];
}
