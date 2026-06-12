let profitChart;

$(document).ready(function() {
    $('#sqlUpload').on('change', handleFileUpload);
    $('#uploadArea').click(() => $('#sqlUpload').click());
    $('#applyFilter').click(applyFilter);
    $('#clearDataBtn').click(() => clearAllData());
    $('#exportExcel').click(exportToExcel);
});

async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    const text = await file.text();
    const parsed = parseSQLCopy(text);
    window.rawData = parsed;
    processAndRender();
    showToast(`✅ Loaded: ${parsed.c_trans.length} transaksi`);
}

function processAndRender() {
    if (!window.rawData) return;
    const start = $('#startDate').val();
    const end = $('#endDate').val();
    const result = calculateProfitLoss(window.rawData.c_trans, start, end);
    renderProfitReport(result);
}

function calculateProfitLoss(trans, start, end) {
    let filtered = trans;
    if (start) filtered = filtered.filter(t => t.tgl_trs >= start);
    if (end) filtered = filtered.filter(t => t.tgl_trs <= end);
    
    let totalRevenue = 0, totalHpp = 0;
    filtered.forEach(t => {
        totalRevenue += (t.price || 0) * (t.qty || 0);
        totalHpp += (t.avg_cost || 0) * (t.qty || 0);
    });
    const profit = totalRevenue - totalHpp;
    const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;
    return { totalRevenue, totalHpp, profit, margin, totalTrans: filtered.length };
}

function renderProfitReport(result) {
    $('#totalRevenue').text(formatRupiah(result.totalRevenue));
    $('#totalHpp').text(formatRupiah(result.totalHpp));
    $('#totalProfit').text(formatRupiah(result.profit));
    $('#totalMargin').text(result.margin.toFixed(2) + '%');
    $('#totalTransaksi').text(result.totalTrans);
    
    if (profitChart) profitChart.destroy();
    profitChart = new Chart(document.getElementById('profitChart'), {
        type: 'bar', data: { labels: ['Pendapatan', 'HPP', 'Laba'], datasets: [{ data: [result.totalRevenue, result.totalHpp, result.profit], backgroundColor: ['#2a5298', '#dc3545', '#28a745'] }] }
    });
}

function applyFilter() { processAndRender(); showToast('Filter diterapkan'); }
function exportToExcel() { alert('Ekspor Excel siap diimplementasikan'); }

// Laporan Laba Rugi - Full Version
let profitChart;
let currentProfitData = null;

$(document).ready(function() {
    console.log("Laba/Rugi siap!");
    
    // Event Upload - FIXED
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
    
    // Event Filter
    $('#applyFilter').on('click', function() {
        if (window.rawData) {
            processAndRender();
            showToast('Filter diterapkan', 'success');
        } else {
            showToast('Upload file SQL terlebih dahulu', 'danger');
        }
    });
    
    // Event Export Excel
    $('#exportExcel').on('click', function() {
        if (currentProfitData && window.rawData) {
            exportProfitToExcel(currentProfitData, window.rawData.c_trans);
        } else {
            showToast('Tidak ada data untuk diekspor', 'danger');
        }
    });
    
    // Cek localStorage
    const savedData = localStorage.getItem('amandamart_data');
    if (savedData) {
        try {
            const parsed = JSON.parse(savedData);
            window.rawData = { c_trans: parsed.c_trans };
            processAndRender();
            showToast('Data dari sesi sebelumnya dimuat', 'info');
        } catch(e) {}
    }
});

async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    showToast(`Memproses ${file.name} ...`, 'info');
    
    try {
        const text = await file.text();
        const parsed = parseSQLCopy(text);
        window.rawData = { c_trans: parsed.c_trans };
        
        // Simpan ke localStorage
        localStorage.setItem('amandamart_data', JSON.stringify({ c_trans: parsed.c_trans }));
        
        processAndRender();
        showToast(`✅ Berhasil! ${parsed.c_trans.length} transaksi dimuat`, 'success');
        
    } catch (error) {
        console.error(error);
        showToast('❌ Gagal membaca file SQL', 'danger');
    }
}

function processAndRender() {
    if (!window.rawData || !window.rawData.c_trans) return;
    
    const start = $('#startDate').val();
    const end = $('#endDate').val();
    const result = calculateProfitLoss(window.rawData.c_trans, start, end);
    currentProfitData = result;
    renderProfitReport(result);
}

function calculateProfitLoss(trans, start, end) {
    let filtered = trans;
    if (start) filtered = filtered.filter(t => t.tgl_trs && t.tgl_trs >= start);
    if (end) filtered = filtered.filter(t => t.tgl_trs && t.tgl_trs <= end);
    
    let totalRevenue = 0, totalHpp = 0;
    const productMap = new Map();
    const dailyProfit = new Map();
    
    filtered.forEach(t => {
        const revenue = (t.price || 0) * (t.qty || 0);
        const hpp = (t.avg_cost || 0) * (t.qty || 0);
        const laba = revenue - hpp;
        totalRevenue += revenue;
        totalHpp += hpp;
        
        // Per produk
        const key = t.plu;
        if (!productMap.has(key)) {
            productMap.set(key, { plu: t.plu, descp: t.descp || '-', qty: 0, revenue: 0, hpp: 0 });
        }
        const prod = productMap.get(key);
        prod.qty += (t.qty || 0);
        prod.revenue += revenue;
        prod.hpp += hpp;
        
        // Per hari
        const tgl = t.tgl_trs ? t.tgl_trs.split(' ')[0] : null;
        if (tgl) dailyProfit.set(tgl, (dailyProfit.get(tgl) || 0) + laba);
    });
    
    const profit = totalRevenue - totalHpp;
    const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;
    const avgPerTrans = filtered.length > 0 ? totalRevenue / filtered.length : 0;
    
    // Hitung laba per produk
    const productList = [];
    for (let prod of productMap.values()) {
        const laba = prod.revenue - prod.hpp;
        const prodMargin = prod.revenue > 0 ? (laba / prod.revenue) * 100 : 0;
        productList.push({ ...prod, laba, margin: prodMargin });
    }
    
    // Top 5 omzet & laba
    const topOmzet = [...productList].sort((a,b) => b.revenue - a.revenue).slice(0,5);
    const topProfit = [...productList].sort((a,b) => b.laba - a.laba).slice(0,5);
    
    // Grafik
    const sortedDates = Array.from(dailyProfit.keys()).sort();
    const profitData = sortedDates.map(d => dailyProfit.get(d));
    
    return { totalRevenue, totalHpp, profit, margin, totalTrans: filtered.length, avgPerTrans, topOmzet, topProfit, productDetail: productList, chartLabels: sortedDates, chartData: profitData };
}

function renderProfitReport(result) {
    $('#totalRevenue').text(formatRupiah(result.totalRevenue));
    $('#totalHpp').text(formatRupiah(result.totalHpp));
    $('#totalProfit').text(formatRupiah(result.profit));
    $('#totalMargin').text(result.margin.toFixed(2) + '%');
    $('#totalTransaksi').text(result.totalTrans);
    $('#avgPerTrans').text(formatRupiah(result.avgPerTrans));
    $('#avgMargin').text(result.margin.toFixed(2) + '%');
    
    // Top Omzet
    let omzetHtml = '';
    result.topOmzet.forEach(p => {
        const kontribusi = result.totalRevenue > 0 ? (p.revenue / result.totalRevenue) * 100 : 0;
        omzetHtml += `<tr><td>${p.descp}</td><td>${Math.round(p.qty)}</td><td>${formatRupiah(p.revenue)}</td><td>${kontribusi.toFixed(1)}%</td></tr>`;
    });
    if (omzetHtml === '') omzetHtml = '<tr><td colspan="4" class="text-center">-</td></tr>';
    $('#topOmzetTable tbody').html(omzetHtml);
    
    // Top Profit
    let profitHtml = '';
    result.topProfit.forEach(p => {
        profitHtml += `<tr><td>${p.descp}</td><td>${Math.round(p.qty)}</td><td>${formatRupiah(p.laba)}</td><td>${p.margin.toFixed(1)}%</td></tr>`;
    });
    if (profitHtml === '') profitHtml = '<tr><td colspan="4" class="text-center">-</td></tr>';
    $('#topProfitTable tbody').html(profitHtml);
    
    // Detail produk
    let detailHtml = '';
    result.productDetail.forEach(p => {
        detailHtml += `<tr><td>${p.plu}</td><td>${p.descp}</td><td>${Math.round(p.qty)}</td><td>${formatRupiah(p.revenue)}</td><td>${formatRupiah(p.hpp)}</td><td>${formatRupiah(p.laba)}</td><td>${p.margin.toFixed(1)}%</td></tr>`;
    });
    if (detailHtml === '') detailHtml = '<tr><td colspan="7" class="text-center">Tidak ada data dalam periode ini</td></tr>';
    $('#detailProductTable tbody').html(detailHtml);
    
    // Chart
    if (profitChart) profitChart.destroy();
    const ctx = document.getElementById('profitChart').getContext('2d');
    profitChart = new Chart(ctx, {
        type: 'bar',
        data: { labels: result.chartLabels, datasets: [{ label: 'Laba Kotor (Rp)', data: result.chartData, backgroundColor: '#28a745', borderRadius: 6 }] },
        options: { responsive: true, maintainAspectRatio: true, plugins: { tooltip: { callbacks: { label: (ctx) => formatRupiah(ctx.raw) } } } }
    });
}

function exportProfitToExcel(profitData, transData) {
    const wb = XLSX.utils.book_new();
    
    // Sheet Ringkasan
    const summary = [['LAPORAN LABA/RUGI'], ['Total Pendapatan', profitData.totalRevenue], ['Total HPP', profitData.totalHpp], ['Laba Kotor', profitData.profit], ['Margin (%)', profitData.margin.toFixed(2)], ['Jumlah Transaksi', profitData.totalTrans]];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), 'Ringkasan');
    
    // Top Omzet
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(profitData.topOmzet), 'Top5_Omzet');
    
    // Top Laba
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(profitData.topProfit), 'Top5_Laba');
    
    // Detail Produk
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(profitData.productDetail), 'Detail_Produk');
    
    XLSX.writeFile(wb, `LabaRugi_AmandaMart_${new Date().toISOString().slice(0,19)}.xlsx`);
    showToast('✅ Ekspor laporan berhasil!', 'success');
}
