let transTable, saleTable, memberTable, productTable, eodTable;
let transChart, paymentChart;

$(document).ready(function() {
    initDataTables();
    $('#sqlUpload').on('change', handleFileUpload);
    $('#uploadArea').click(() => $('#sqlUpload').click());
    $('#clearDataBtn').click(() => clearAllData());
    $('.tab-btn').click(function() {
        $('.tab-btn').removeClass('active');
        $(this).addClass('active');
        $('.tab-pane').removeClass('active');
        $('#' + $(this).data('tab')).addClass('active');
    });
});

function initDataTables() {
    transTable = $('#transTable').DataTable({ columns: getTransCols(), pageLength: 10 });
    saleTable = $('#saleTable').DataTable({ columns: getSaleCols(), pageLength: 10 });
    memberTable = $('#memberTable').DataTable({ columns: getMemberCols() });
    productTable = $('#productTable').DataTable({ columns: getProductCols() });
    eodTable = $('#eodTable').DataTable({ columns: getEodCols() });
}

async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    const text = await file.text();
    const parsed = parseSQLCopy(text);
    updateDashboard(parsed);
    showToast(`✅ Loaded: ${parsed.c_trans.length} transaksi, ${parsed.c_tsale.length} penjualan`);
    window.parsedData = parsed;
}

function updateDashboard(data) {
    $('#statTrans').text(data.c_trans.length);
    $('#statSale').text(data.c_tsale.length);
    $('#statMember').text(data.m_cust.length);
    $('#statProd').text(data.m_loader.length);
    
    // Update charts
    const dailyCount = groupByDate(data.c_tsale);
    if (transChart) transChart.destroy();
    transChart = new Chart(document.getElementById('transChart'), {
        type: 'line', data: { labels: Object.keys(dailyCount), datasets: [{ label: 'Transaksi', data: Object.values(dailyCount), borderColor: '#2a5298' }] }
    });
    
    // Update tables
    transTable.clear().rows.add(data.c_trans).draw();
    saleTable.clear().rows.add(data.c_tsale).draw();
    memberTable.clear().rows.add(data.m_cust).draw();
    productTable.clear().rows.add(data.m_loader).draw();
    eodTable.clear().rows.add(data.cek_eod).draw();
}

function groupByDate(sales) {
    const map = {};
    sales.forEach(s => { const d = s.tgl_f; map[d] = (map[d] || 0) + 1; });
    return map;
}

function getTransCols() { return [{ data: "no_urut" },{ data: "plu" },{ data: "descp" },{ data: "price", render: (d)=>formatRupiah(d) },{ data: "qty" },{ data: "tgl_trs" },{ data: "kd_store" }]; }
function getSaleCols() { return [{ data: "no_fak" },{ data: "tgl_f" },{ data: "jum", render: (d)=>formatRupiah(d) },{ data: "cash", render: (d)=>formatRupiah(d) },{ data: "member" }]; }
function getMemberCols() { return [{ data: "kode_member" },{ data: "nama_member" },{ data: "no_kartu" },{ data: "point" }]; }
function getProductCols() { return [{ data: "plu" },{ data: "descp" },{ data: "price1", render: (d)=>formatRupiah(d) }]; }
function getEodCols() { return [{ data: "kd_ksr" },{ data: "date_ksr" },{ data: "ip_kasir" }]; }
