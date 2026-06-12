// Fungsi global formatting
function formatRupiah(val) {
    if (val === undefined || val === null) return 'Rp 0';
    let num = parseFloat(val);
    if (isNaN(num)) return String(val);
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
}

function showToast(msg, type = 'success') {
    const toast = document.getElementById('toastMsg');
    if (!toast) return;
    toast.style.background = type === 'danger' ? '#dc3545' : '#28a745';
    toast.innerHTML = `<i class="icon-check"></i> ${msg}`;
    toast.style.display = 'block';
    setTimeout(() => toast.style.display = 'none', 3000);
}

function clearAllData() {
    localStorage.removeItem('amandamart_data');
    showToast('Data berhasil dibersihkan! Halaman akan direset.');
    setTimeout(() => location.reload(), 1000);
}
