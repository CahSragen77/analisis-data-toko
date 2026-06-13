<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes">
    <title>AmandaMart | Dashboard Utama</title>
    <link rel="stylesheet" href="css/style.css">
    <!-- CSS DataTables (Bootstrap 5) -->
    <link rel="stylesheet" type="text/css" href="https://cdn.datatables.net/1.13.6/css/jquery.dataTables.min.css">
    <!-- Chart.js -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
    <!-- SheetJS -->
    <script src="https://cdn.sheetjs.com/xlsx-0.20.2/package/dist/xlsx.full.min.js"></script>
    <!-- jQuery (harus sebelum DataTables) -->
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <!-- DataTables JS -->
    <script src="https://cdn.datatables.net/1.13.6/js/jquery.dataTables.min.js"></script>
</head>
<body>
    <div class="app-container">
        <!-- SIDEBAR -->
        <aside class="sidebar">
            <div class="logo">
                <i class="icon-database"></i>
                <span>Amanda<span class="highlight">Mart</span></span>
            </div>
            <nav class="nav-menu">
                <a href="index.html" class="nav-item active">
                    <i class="icon-dashboard"></i>
                    <span>Dashboard</span>
                </a>
                <a href="laba-rugi.html" class="nav-item">
                    <i class="icon-chart"></i>
                    <span>Laba / Rugi</span>
                </a>
            </nav>
            <div class="sidebar-footer">
                <button id="clearDataBtn" class="btn-clear">
                    <i class="icon-trash"></i> Clear Data
                </button>
            </div>
        </aside>

        <!-- MAIN CONTENT -->
        <main class="main-content">
            <header class="top-bar">
                <h1><i class="icon-dashboard"></i> Dashboard Utama</h1>
                <div style="display: flex; gap: 12px;">
                    <div class="upload-area" id="uploadArea">
                        <i class="icon-upload"></i> Upload SQL Dump
                        <input type="file" id="sqlUpload" accept=".sql,.txt" hidden>
                    </div>
                    <button id="exportAllBtn" class="btn-excel-header" style="background:#1F7B4D; color:white; border:none; padding:12px 24px; border-radius:40px; cursor:pointer;">
                        <i class="icon-excel"></i> Ekspor Semua ke Excel
                    </button>
                </div>
            </header>

            <!-- Stat Cards -->
            <div class="stats-grid">
                <div class="stat-card"><h3>Transaksi</h3><p id="statTrans">0</p></div>
                <div class="stat-card"><h3>Penjualan</h3><p id="statSale">0</p></div>
                <div class="stat-card"><h3>Member</h3><p id="statMember">0</p></div>
                <div class="stat-card"><h3>Produk</h3><p id="statProd">0</p></div>
            </div>

            <!-- Grafik -->
            <div class="charts-row">
                <div class="chart-card">
                    <h3>Jumlah Transaksi per Hari</h3>
                    <canvas id="transChart"></canvas>
                </div>
                <div class="chart-card">
                    <h3>Metode Pembayaran</h3>
                    <canvas id="paymentChart"></canvas>
                </div>
            </div>

            <!-- Tab Menu -->
            <div class="tabs">
                <button class="tab-btn active" data-tab="trans">📋 Detail Transaksi</button>
                <button class="tab-btn" data-tab="sale">💰 Penjualan Header</button>
                <button class="tab-btn" data-tab="member">👥 Member</button>
                <button class="tab-btn" data-tab="product">📦 Master Produk</button>
                <button class="tab-btn" data-tab="eod">⏱️ Log EOD</button>
            </div>
            <div class="tab-content">
                <div class="tab-pane active" id="trans"><table id="transTable" class="data-table"><thead><tr><th>No</th><th>PLU</th><th>Deskripsi</th><th>Harga</th><th>Qty</th><th>Tanggal</th><th>Store</th></tr></thead><tbody></tbody></table></div>
                <div class="tab-pane" id="sale"><table id="saleTable" class="data-table"><thead><tr><th>No Faktur</th><th>Tanggal</th><th>Total</th><th>Cash</th><th>Member</th></tr></thead><tbody></tbody></table></div>
                <div class="tab-pane" id="member"><table id="memberTable" class="data-table"><thead><tr><th>Kode</th><th>Nama</th><th>No Kartu</th><th>Poin</th></tr></thead><tbody></tbody></table></div>
                <div class="tab-pane" id="product"><table id="productTable" class="data-table"><thead><tr><th>PLU</th><th>Deskripsi</th><th>Kategori</th><th>Harga</th></tr></thead><tbody></tbody></table></div>
                <div class="tab-pane" id="eod"><table id="eodTable" class="data-table"><thead><tr><th>Kasir</th><th>Tanggal</th><th>IP</th><th>Status</th></tr></thead><tbody></tbody></table></div>
            </div>
        </main>
    </div>

    <div id="toastMsg" class="toast-msg" style="display:none"></div>

    <script src="js/utils.js"></script>
    <script src="js/sql-parser.js"></script>
    <script src="js/dashboard.js"></script>
</body>
</html>
