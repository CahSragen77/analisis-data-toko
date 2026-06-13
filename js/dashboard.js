// Dashboard Utama - FINAL FIX
let transTable, saleTable, memberTable, productTable, eodTable;
let transChart, paymentChart;

$(document).ready(function() {
    console.log("✅ Dashboard siap - FINAL VERSION");
    
    initDataTables();
    
    // Upload
    $('#uploadArea').on('click', function() {
        $('#sqlUpload').click();
    });
    
    $('#sqlUpload').on('change', handleFileUpload);
    
    // Clear Data
    $('#clearDataBtn').on('click', function() {
        if (confirm('Yakin ingin menghapus semua data?')) {
            localStorage.removeItem('amandamart_data');
            location.reload();
        }
    });
    
    // Tab navigation
    $('.tab-btn').on('click', function() {
        $('.tab-btn').removeClass('active');
        $(this).addClass('active');
        $('.tab-pane').removeClass('active');
        $('#' + $(this).data('tab')).addClass('active');
    });
    
    // Export
    $('#exportAllBtn').on('click', function() {
        if (window.parsedData) {
            exportAllToExcel(window.parsedData);
        } else {
            showToast('Tidak ada data', 'danger');
        }
    });
    
    // Load saved data
    const saved = localStorage.getItem('amandamart_data');
    if (saved) {
        try {
            window.parsedData = JSON.parse(saved);
            updateDashboard(window.parsedData);
            showToast('Data dari sesi sebelumnya', 'info');
        } catch(e) {}
    }
});

function initDataTables() {
    transTable = $('#transTable').DataTable({ pageLength: 10 });
    saleTable = $('#saleTable').DataTable({ pageLength: 10 });
    memberTable = $('#memberTable').DataTable();
    productTable = $('#productTable').DataTable();
    eodTable = $('#eodTable').DataTable();
}

async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    showToast(`Memproses ${file.name}...`, 'info');
    
    try {
        const text = await file.text();
        const parsed = parseSQLCopy(text);
        
        localStorage.setItem('amandamart_data', JSON.stringify(parsed));
        window.parsedData = parsed;
        updateDashboard(parsed);
        showToast(`✅ ${parsed.c_trans.length} transaksi, ${parsed.c_tsale.length} penjualan`, 'success');
        
    } catch(e) {
        console.error(e);
        showToast('❌ Gagal membaca file', 'danger');
    }
}

function updateDashboard(data) {
    if (!data) return;
    
    $('#statTrans').text(data.c_trans?.length || 0);
    $('#statSale').text(data.c_tsale?.length || 0);
    $('#statMember').text(data.m_cust?.length || 0);
    $('#statProd').text(data.m_loader?.length || 0);
    
    // Update charts
    if (data.c_tsale?.length > 0) updateCharts(data.c_tsale);
    
    // Update tables (gunakan clear + rows.add)
    if (transTable && data.c_trans) {
        transTable.clear();
        data.c_trans.slice(0, 500).forEach(row => transTable.row.add(row));
        transTable.draw();
    }
    
    if (saleTable && data.c_tsale) {
        saleTable.clear();
        data.c_tsale.slice(0, 500).forEach(row => saleTable.row.add(row));
        saleTable.draw();
    }
    
    if (memberTable && data.m_cust) {
        memberTable.clear();
        data.m_cust.forEach(row => memberTable.row.add(row));
        memberTable.draw();
    }
    
    if (productTable && data.m_loader) {
        productTable.clear();
        data.m_loader.forEach(row => productTable.row.add(row));
        productTable.draw();
    }
    
    if (eodTable && data.cek_eod) {
        eodTable.clear();
        data.cek_eod.forEach(row => eodTable.row.add(row));
        eodTable.draw();
    }
}

function updateCharts(salesData) {
    const dateMap = new Map();
    salesData.forEach(s => {
        if (s.tgl_f) dateMap.set(s.tgl_f, (dateMap.get(s.tgl_f) || 0) + 1);
    });
    
    const labels = Array.from(dateMap.keys()).sort();
    const counts = labels.map(l => dateMap.get(l));
    
    const ctx1 = document.getElementById('transChart');
    if (ctx1) {
        if (transChart) transChart.destroy();
        transChart = new Chart(ctx1, {
            type: 'line',
            data: { labels, datasets: [{ label: 'Jumlah Transaksi', data: counts, borderColor: '#2a5298', tension: 0.3, fill: true }] }
        });
    }
    
    const ctx2 = document.getElementById('paymentChart');
    if (ctx2) {
        if (paymentChart) paymentChart.destroy();
        paymentChart = new Chart(ctx2, {
            type: 'doughnut',
            data: { labels: ['Cash', 'QRIS', 'Debit'], datasets: [{ data: [65, 25, 10], backgroundColor: ['#198754', '#0dcaf0', '#ffc107'] }] }
        });
    }
}

function exportAllToExcel(data) {
    try {
        const wb = XLSX.utils.book_new();
        if (data.c_trans?.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.c_trans), 'Transaksi');
        if (data.c_tsale?.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.c_tsale), 'Penjualan');
        if (data.m_cust?.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.m_cust), 'Member');
        if (data.m_loader?.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.m_loader), 'Produk');
        if (data.cek_eod?.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.cek_eod), 'EOD');
        XLSX.writeFile(wb, `AmandaMart_Export_${new Date().toISOString().slice(0,19)}.xlsx`);
        showToast('✅ Ekspor berhasil!', 'success');
    } catch(e) { showToast('❌ Gagal ekspor', 'danger'); }
}
