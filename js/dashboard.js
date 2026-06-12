// Dashboard Utama - Full Version (FIXED - No Recursion Error)
let transTable, saleTable, memberTable, productTable, eodTable;
let transChart, paymentChart;

$(document).ready(function() {
    console.log("✅ Dashboard siap - versi fixed");
    initDataTables();
    
    // Event Upload
    $('#uploadArea').on('click', function() {
        $('#sqlUpload').click();
    });
    
    $('#sqlUpload').on('change', handleFileUpload);
    
    // Event Clear Data
    $('#clearDataBtn').on('click', function() {
        if (confirm('Yakin ingin menghapus semua data? Halaman akan direset.')) {
            clearAllData();
        }
    });
    
    // Tab navigation
    $('.tab-btn').on('click', function() {
        $('.tab-btn').removeClass('active');
        $(this).addClass('active');
        $('.tab-pane').removeClass('active');
        $('#' + $(this).data('tab')).addClass('active');
    });
    
    // Event Export All (FIXED - ditempatkan di dalam ready)
    $('#exportAllBtn').on('click', function() {
        if (window.parsedData) {
            exportAllToExcel(window.parsedData);
        } else {
            showToast('Tidak ada data untuk diekspor', 'danger');
        }
    });
    
    // Cek data dari localStorage
    const savedData = localStorage.getItem('amandamart_data');
    if (savedData) {
        try {
            const parsed = JSON.parse(savedData);
            updateDashboard(parsed);
            showToast('Data dari sesi sebelumnya dimuat', 'info');
        } catch(e) {
            console.error("Error load saved data:", e);
        }
    }
});

function initDataTables() {
    transTable = $('#transTable').DataTable({
        columns: getTransCols(),
        pageLength: 10,
        language: { search: "Cari:", lengthMenu: "Tampilkan _MENU_ data", info: "Menampilkan _START_ - _END_ dari _TOTAL_ data" }
    });
    saleTable = $('#saleTable').DataTable({
        columns: getSaleCols(),
        pageLength: 10
    });
    memberTable = $('#memberTable').DataTable({ columns: getMemberCols() });
    productTable = $('#productTable').DataTable({ columns: getProductCols() });
    eodTable = $('#eodTable').DataTable({ columns: getEodCols() });
}

async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    showToast(`Memproses ${file.name} ...`, 'info');
    
    try {
        const text = await file.text();
        const parsed = parseSQLCopy(text);
        
        // Simpan ke localStorage
        localStorage.setItem('amandamart_data', JSON.stringify(parsed));
        
        updateDashboard(parsed);
        showToast(`✅ Berhasil! ${parsed.c_trans.length} transaksi, ${parsed.c_tsale.length} penjualan`, 'success');
        
        // Simpan ke window untuk akses global
        window.parsedData = parsed;
        
    } catch (error) {
        console.error("Upload error:", error);
        showToast('❌ Gagal membaca file SQL. Periksa format file.', 'danger');
    }
}

function updateDashboard(data) {
    // Update stat cards
    $('#statTrans').text(data.c_trans.length || 0);
    $('#statSale').text(data.c_tsale.length || 0);
    $('#statMember').text(data.m_cust.length || 0);
    $('#statProd').text(data.m_loader.length || 0);
    
    // Update charts
    if (data.c_tsale && data.c_tsale.length > 0) {
        updateCharts(data.c_tsale);
    }
    
    // Update tables (dengan pengecekan data kosong)
    if (transTable && data.c_trans) {
        transTable.clear();
        transTable.rows.add(data.c_trans);
        transTable.draw();
    }
    
    if (saleTable && data.c_tsale) {
        saleTable.clear();
        saleTable.rows.add(data.c_tsale);
        saleTable.draw();
    }
    
    if (memberTable && data.m_cust) {
        memberTable.clear();
        memberTable.rows.add(data.m_cust);
        memberTable.draw();
    }
    
    if (productTable && data.m_loader) {
        productTable.clear();
        productTable.rows.add(data.m_loader);
        productTable.draw();
    }
    
    if (eodTable && data.cek_eod) {
        eodTable.clear();
        eodTable.rows.add(data.cek_eod);
        eodTable.draw();
    }
}

function updateCharts(salesData) {
    // Group by date
    const dateMap = new Map();
    salesData.forEach(s => {
        const tgl = s.tgl_f;
        if (!tgl) return;
        dateMap.set(tgl, (dateMap.get(tgl) || 0) + 1);
    });
    
    const labels = Array.from(dateMap.keys()).sort();
    const counts = labels.map(l => dateMap.get(l));
    
    // Chart Transaksi (Line Chart)
    const ctx1 = document.getElementById('transChart');
    if (ctx1) {
        if (transChart) transChart.destroy();
        transChart = new Chart(ctx1, {
            type: 'line',
            data: { 
                labels: labels, 
                datasets: [{ 
                    label: 'Jumlah Transaksi', 
                    data: counts, 
                    borderColor: '#2a5298', 
                    tension: 0.3, 
                    fill: true, 
                    backgroundColor: 'rgba(42,82,152,0.05)' 
                }] 
            },
            options: { responsive: true, maintainAspectRatio: true }
        });
    }
    
    // Payment method chart (doughnut) - Demo data
    const ctx2 = document.getElementById('paymentChart');
    if (ctx2) {
        if (paymentChart) paymentChart.destroy();
        paymentChart = new Chart(ctx2, {
            type: 'doughnut',
            data: { 
                labels: ['Cash', 'QRIS', 'Debit'], 
                datasets: [{ 
                    data: [65, 25, 10], 
                    backgroundColor: ['#198754', '#0dcaf0', '#ffc107'] 
                }] 
            },
            options: { responsive: true }
        });
    }
}

// ======================= EXPORT TO EXCEL =======================
function exportAllToExcel(data) {
    try {
        const wb = XLSX.utils.book_new();
        
        if (data.c_trans && data.c_trans.length > 0) {
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.c_trans), 'Transaksi');
        }
        if (data.c_tsale && data.c_tsale.length > 0) {
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.c_tsale), 'Penjualan');
        }
        if (data.m_cust && data.m_cust.length > 0) {
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.m_cust), 'Member');
        }
        if (data.m_loader && data.m_loader.length > 0) {
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.m_loader), 'Produk');
        }
        if (data.cek_eod && data.cek_eod.length > 0) {
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.cek_eod), 'EOD');
        }
        
        XLSX.writeFile(wb, `AmandaMart_Data_${new Date().toISOString().slice(0,19)}.xlsx`);
        showToast('✅ Ekspor semua data berhasil!', 'success');
    } catch(e) {
        console.error("Export error:", e);
        showToast('❌ Gagal mengekspor data', 'danger');
    }
}

// ======================= COLUMN DEFINITIONS =======================
function getTransCols() {
    return [
        { data: "no_urut" }, 
        { data: "plu" }, 
        { data: "descp" },
        { data: "price", render: (d) => formatRupiah(d) },
        { data: "qty" }, 
        { data: "tgl_trs" }, 
        { data: "kd_store" }
    ];
}

function getSaleCols() {
    return [
        { data: "no_fak" }, 
        { data: "tgl_f" },
        { data: "jum", render: (d) => formatRupiah(d) },
        { data: "cash", render: (d) => formatRupiah(d) },
        { data: "member" }
    ];
}

function getMemberCols() {
    return [
        { data: "kode_member" }, 
        { data: "nama_member" }, 
        { data: "no_kartu" }, 
        { data: "point" }
    ];
}

function getProductCols() {
    return [
        { data: "plu" }, 
        { data: "descp" }, 
        { data: "price1", render: (d) => formatRupiah(d) }
    ];
}

function getEodCols() {
    return [
        { data: "kd_ksr" }, 
        { data: "date_ksr" }, 
        { data: "ip_kasir" }
    ];
}
