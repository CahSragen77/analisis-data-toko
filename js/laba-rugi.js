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
