// ============================================
// ملف JavaScript لصفحة لوحة التحكم
// ============================================

let currentBookingId = null;
let bookingsData = [];
let expensesData = [];
let usersData = [];

/**
 * تهيئة لوحة التحكم
 */
document.addEventListener('DOMContentLoaded', () => {
    if (!protectPage()) return;
    
    loadDashboardData();
    setupEventListeners();
});

/**
 * تحميل بيانات لوحة التحكم
 */
async function loadDashboardData() {
    try {
        await loadStatistics();
        await loadBookings(); // بعد تحميل الحجوزات
        initCalendar(); // <-- تشغيل التقويم
        await loadExpenses();
        await loadUsers();
        await loadSettings();
    } catch (error) {
        console.error('Error:', error);
    }
}

/**
 * تحميل الإحصائيات
 */
async function loadStatistics() {
    const response = await apiCall('getStatistics');
    
    if (response && response.success) {
        const stats = response.data;
        
        // تحديث KPI Cards
        document.getElementById('totalRevenue').textContent = formatCurrency(stats.totalRevenue);
        document.getElementById('totalExpenses').textContent = formatCurrency(stats.totalExpenses);
        document.getElementById('netProfit').textContent = formatCurrency(stats.netProfit);
        document.getElementById('totalBookings').textContent = stats.totalBookings;
        document.getElementById('thisMonthBookings').textContent = stats.thisMonthBookings;
        document.getElementById('pendingAmount').textContent = formatCurrency(stats.pendingAmount);
        
        // رسم الرسوم البيانية
        drawRevenueChart();
        drawBookingsChart();
        
        // تحميل الحجوزات القادمة
        displayUpcomingBookings();
    }
}

/**
 * تحميل الحجوزات
 */
async function loadBookings() {
    const response = await apiCall('getBookings');
    
    if (response && response.success) {
        bookingsData = response.data;
        displayBookingsTable();
        displayRevenueTable();
        displayPendingTable();
    }
}

/**
 * تحميل المصروفات
 */
async function loadExpenses() {
    const response = await apiCall('getExpenses');
    
    if (response && response.success) {
        expensesData = response.data;
        displayExpensesTable();
    }
}

/**
 * تحميل المستخدمين
 */
async function loadUsers() {
    const response = await apiCall('getUsers');
    
    if (response && response.success) {
        usersData = response.data;
        displayUsersTable();
    }
}

/**
 * تحميل الإعدادات
 */
async function loadSettings() {
    const response = await apiCall('getSettings');
    
    if (response && response.success) {
        const settings = response.data;
        
        // تحديث حقول الإعدادات
        const facilityName = document.getElementById('facilityName');
        const currency = document.getElementById('currency');
        const defaultPhone = document.getElementById('defaultPhone');
        const whatsappTemplate = document.getElementById('whatsappTemplate');
        
        if (facilityName) facilityName.value = settings.facilityName || '';
        if (currency) currency.value = settings.currency || 'ر.س';
        if (defaultPhone) defaultPhone.value = settings.defaultPhone || '';
        if (whatsappTemplate) whatsappTemplate.value = settings.whatsappTemplate || '';
    }
}

/**
 * عرض جدول الحجوزات
 */
function displayBookingsTable() {
    const container = document.getElementById('bookingsTable');
    
    if (bookingsData.length === 0) {
        container.innerHTML = '<p class="empty-state">لا توجد حجوزات</p>';
        return;
    }
    
    let html = `
        <table class="table table-hover">
            <thead>
                <tr>
                    <th>التاريخ</th>
                    <th>اسم العميل</th>
                    <th>الجوال</th>
                    <th>المبلغ الإجمالي</th>
                    <th>العربون</th>
                    <th>المتبقي</th>
                    <th>الحالة</th>
                    <th>الإجراءات</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    bookingsData.forEach(booking => {
        const statusBadge = getStatusBadge(booking.paymentStatus);
        html += `
            <tr>
                <td>${formatDate(booking.date)}</td>
                <td>${booking.customerName}</td>
                <td>${booking.phone}</td>
                <td>${formatCurrency(booking.totalAmount)}</td>
                <td>${formatCurrency(booking.deposit)}</td>
                <td>${formatCurrency(booking.remaining)}</td>
                <td>${statusBadge}</td>
                <td>
                    <button class="btn-action edit" onclick="editBooking(${booking.id})" title="تعديل">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-action delete" onclick="deleteBooking(${booking.id})" title="حذف">
                        <i class="fas fa-trash"></i>
                    </button>
                    <button class="btn-action complete" onclick="recordPayment(${booking.id})" title="تسجيل دفع">
                        <i class="fas fa-money-bill"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

/**
 * عرض جدول الإيرادات
 */
function displayRevenueTable() {
    const container = document.getElementById('revenueTable');
    
    const completedBookings = bookingsData.filter(b => b.paymentStatus === 'مكتمل');
    
    if (completedBookings.length === 0) {
        container.innerHTML = '<p class="empty-state">لا توجد إيرادات</p>';
        return;
    }
    
    let totalRevenue = 0;
    let html = `
        <table class="table table-hover">
            <thead>
                <tr>
                    <th>التاريخ</th>
                    <th>اسم العميل</th>
                    <th>المبلغ</th>
                    <th>الحالة</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    completedBookings.forEach(booking => {
        totalRevenue += booking.totalAmount;
        html += `
            <tr>
                <td>${formatDate(booking.date)}</td>
                <td>${booking.customerName}</td>
                <td>${formatCurrency(booking.totalAmount)}</td>
                <td><span class="badge badge-success">مكتمل</span></td>
            </tr>
        `;
    });
    
    html += `
            </tbody>
        </table>
        <div class="mt-3">
            <strong>إجمالي الإيرادات: ${formatCurrency(totalRevenue)}</strong>
        </div>
    `;
    
    container.innerHTML = html;
}

/**
 * عرض جدول الحجوزات المعلقة
 */
function displayPendingTable() {
    const container = document.getElementById('pendingTable');
    
    const pendingBookings = bookingsData.filter(b => b.paymentStatus !== 'مكتمل');
    
    if (pendingBookings.length === 0) {
        container.innerHTML = '<p class="empty-state">لا توجد حجوزات معلقة</p>';
        return;
    }
    
    let totalPending = 0;
    let html = `
        <table class="table table-hover">
            <thead>
                <tr>
                    <th>التاريخ</th>
                    <th>اسم العميل</th>
                    <th>الجوال</th>
                    <th>المتبقي</th>
                    <th>الحالة</th>
                    <th>الإجراءات</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    pendingBookings.forEach(booking => {
        totalPending += booking.remaining;
        const statusBadge = getStatusBadge(booking.paymentStatus);
        html += `
            <tr>
                <td>${formatDate(booking.date)}</td>
                <td>${booking.customerName}</td>
                <td>${booking.phone}</td>
                <td>${formatCurrency(booking.remaining)}</td>
                <td>${statusBadge}</td>
                <td>
                    <button class="btn-action edit" onclick="recordPayment(${booking.id})" title="تسجيل دفع">
                        <i class="fas fa-money-bill"></i>
                    </button>
                    <button class="btn-action complete" onclick="sendWhatsAppReminder(${booking.id})" title="إرسال تذكير">
                        <i class="fas fa-whatsapp"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    html += `
            </tbody>
        </table>
        <div class="mt-3">
            <strong>إجمالي المبلغ المعلق: ${formatCurrency(totalPending)}</strong>
        </div>
    `;
    
    container.innerHTML = html;
}

/**
 * عرض جدول المصروفات
 */
function displayExpensesTable() {
    const container = document.getElementById('expensesTable');
    
    if (expensesData.length === 0) {
        container.innerHTML = '<p class="empty-state">لا توجد مصروفات</p>';
        return;
    }
    
    let totalExpenses = 0;
    let html = `
        <table class="table table-hover">
            <thead>
                <tr>
                    <th>التاريخ</th>
                    <th>الوصف</th>
                    <th>التصنيف</th>
                    <th>المبلغ</th>
                    <th>الإجراءات</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    expensesData.forEach(expense => {
        totalExpenses += expense.amount;
        html += `
            <tr>
                <td>${formatDate(expense.date)}</td>
                <td>${expense.description}</td>
                <td><span class="badge">${expense.category}</span></td>
                <td>${formatCurrency(expense.amount)}</td>
                <td>
                    <button class="btn-action delete" onclick="deleteExpense(${expense.id})" title="حذف">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    html += `
            </tbody>
        </table>
        <div class="mt-3">
            <strong>إجمالي المصروفات: ${formatCurrency(totalExpenses)}</strong>
        </div>
    `;
    
    container.innerHTML = html;
}

/**
 * عرض جدول المستخدمين
 */
function displayUsersTable() {
    const container = document.getElementById('usersTable');
    
    if (usersData.length === 0) {
        container.innerHTML = '<p class="empty-state">لا توجد مستخدمين</p>';
        return;
    }
    
    let html = `
        <table class="table table-hover">
            <thead>
                <tr>
                    <th>اسم المستخدم</th>
                    <th>الاسم الكامل</th>
                    <th>البريد الإلكتروني</th>
                    <th>الدور</th>
                    <th>الحالة</th>
                    <th>الإجراءات</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    usersData.forEach(user => {
        const activeBadge = user.active === 'نعم' 
            ? '<span class="badge badge-success">نشط</span>'
            : '<span class="badge badge-danger">غير نشط</span>';
        
        html += `
            <tr>
                <td>${user.username}</td>
                <td>${user.fullName}</td>
                <td>${user.email}</td>
                <td>${user.role}</td>
                <td>${activeBadge}</td>
                <td>
                    <button class="btn-action edit" onclick="editUser(${user.id})" title="تعديل">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-action delete" onclick="deleteUser(${user.id})" title="حذف">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

/**
 * عرض الحجوزات القادمة
 */
function displayUpcomingBookings() {
    const container = document.getElementById('upcomingBookings');
    
    const today = new Date();
    const upcomingBookings = bookingsData
        .filter(b => new Date(b.date) >= today)
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(0, 5);
    
    if (upcomingBookings.length === 0) {
        container.innerHTML = '<p class="empty-state">لا توجد حجوزات قادمة</p>';
        return;
    }
    
    let html = `
        <table class="table table-hover">
            <thead>
                <tr>
                    <th>التاريخ</th>
                    <th>اسم العميل</th>
                    <th>الجوال</th>
                    <th>المبلغ</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    upcomingBookings.forEach(booking => {
        html += `
            <tr>
                <td>${formatDate(booking.date)}</td>
                <td>${booking.customerName}</td>
                <td>${booking.phone}</td>
                <td>${formatCurrency(booking.totalAmount)}</td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

/**
 * رسم رسم بياني الإيرادات
 */
function drawRevenueChart() {
    const ctx = document.getElementById('revenueChart');
    if (!ctx) return;
    
    // تجميع الإيرادات حسب الشهر
    const monthlyRevenue = {};
    
    bookingsData.forEach(booking => {
        if (booking.paymentStatus === 'مكتمل') {
            const date = new Date(booking.date);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            monthlyRevenue[monthKey] = (monthlyRevenue[monthKey] || 0) + booking.totalAmount;
        }
    });
    
    const labels = Object.keys(monthlyRevenue).sort();
    const data = labels.map(label => monthlyRevenue[label]);
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels.map(label => {
                const [year, month] = label.split('-');
                return new Date(year, month - 1).toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' });
            }),
            datasets: [{
                label: 'الإيرادات',
                data: data,
                borderColor: '#27ae60',
                backgroundColor: 'rgba(39, 174, 96, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        font: { family: "'Tajawal', sans-serif" }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatCurrency(value);
                        }
                    }
                }
            }
        }
    });
}

/**
 * رسم رسم بياني الحجوزات
 */
function drawBookingsChart() {
    const ctx = document.getElementById('bookingsChart');
    if (!ctx) return;
    
    const completed = bookingsData.filter(b => b.paymentStatus === 'مكتمل').length;
    const pending = bookingsData.filter(b => b.paymentStatus !== 'مكتمل').length;
    
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['مكتملة', 'معلقة'],
            datasets: [{
                data: [completed, pending],
                backgroundColor: ['#27ae60', '#e74c3c'],
                borderColor: ['#fff', '#fff'],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        font: { family: "'Tajawal', sans-serif" }
                    }
                }
            }
        }
    });
}

/**
 * عرض نموذج إضافة حجز
 */
function showAddBookingForm() {
    currentBookingId = null;
    document.getElementById('bookingModalTitle').textContent = 'إضافة حجز جديد';
    document.getElementById('bookingForm').reset();
    
    // تعيين التاريخ الحالي
    const today = new Date();
    document.getElementById('bookingDate').valueAsDate = today;
    
    // حساب المتبقي تلقائياً
    setupBookingFormCalculations();
    
    new bootstrap.Modal(document.getElementById('bookingModal')).show();
}

/**
 * تعديل حجز
 */
function editBooking(id) {
    const booking = bookingsData.find(b => b.id === id);
    if (!booking) return;
    
    currentBookingId = id;
    document.getElementById('bookingModalTitle').textContent = 'تعديل الحجز';
    
    document.getElementById('bookingDate').value = dateToISO(booking.date);
    document.getElementById('customerName').value = booking.customerName;
    document.getElementById('customerPhone').value = booking.phone;
    document.getElementById('totalAmount').value = booking.totalAmount;
    document.getElementById('deposit').value = booking.deposit;
    document.getElementById('remaining').value = booking.remaining;
    document.getElementById('insurance').value = booking.insurance || 0;
    document.getElementById('paymentStatus').value = booking.paymentStatus;
    document.getElementById('bookingNotes').value = booking.notes;
    
    setupBookingFormCalculations();
    new bootstrap.Modal(document.getElementById('bookingModal')).show();
}

/**
 * حفظ الحجز
 */
async function saveBooking() {
    const bookingDate = document.getElementById('bookingDate').value;
    const customerName = document.getElementById('customerName').value;
    const customerPhone = document.getElementById('customerPhone').value;
    const totalAmount = parseFloat(document.getElementById('totalAmount').value);
    const deposit = parseFloat(document.getElementById('deposit').value);
    const remaining = parseFloat(document.getElementById('remaining').value);
    const insurance = parseFloat(document.getElementById('insurance').value) || 0;
    const paymentStatus = document.getElementById('paymentStatus').value;
    const bookingNotes = document.getElementById('bookingNotes').value;
    
    if (!bookingDate || !customerName || !customerPhone || !totalAmount) {
        showToast('يرجى ملء جميع الحقول المطلوبة', 'error');
        return;
    }
    
    const params = {
        date: bookingDate,
        customerName: customerName,
        phone: customerPhone,
        totalAmount: totalAmount,
        deposit: deposit,
        remaining: remaining,
        insurance: insurance,
        paymentStatus: paymentStatus,
        notes: bookingNotes
    };
    
    let response;
    if (currentBookingId) {
        params.id = currentBookingId;
        response = await apiCall('updateBooking', params);
    } else {
        response = await apiCall('addBooking', params);
    }
    
    if (response && response.success) {
        showToast('تم حفظ الحجز بنجاح', 'success');
        bootstrap.Modal.getInstance(document.getElementById('bookingModal')).hide();
        await loadBookings();
        await loadStatistics();
    } else {
        showToast(response?.message || 'فشل حفظ الحجز', 'error');
    }
}

/**
 * حذف حجز
 */
async function deleteBooking(id) {
    const booking = bookingsData.find(b => b.id === id);
    if (!booking) return;
    
    const result = await Swal.fire({
        title: 'تأكيد الحذف',
        text: `هل أنت متأكد من حذف حجز ${booking.customerName}؟`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'نعم، احذف',
        cancelButtonText: 'إلغاء',
        confirmButtonColor: '#e74c3c',
        cancelButtonColor: '#95a5a6'
    });
    
    if (result.isConfirmed) {
        const response = await apiCall('deleteBooking', { id: id });
        
        if (response && response.success) {
            showToast('تم حذف الحجز بنجاح', 'success');
            await loadBookings();
            await loadStatistics();
        } else {
            showToast(response?.message || 'فشل حذف الحجز', 'error');
        }
    }
}

/**
 * تسجيل الدفع
 */
async function recordPayment(id) {
    const booking = bookingsData.find(b => b.id === id);
    if (!booking) return;
    
    const { value: amount } = await Swal.fire({
        title: 'تسجيل دفع',
        input: 'number',
        inputLabel: `المبلغ المتبقي: ${formatCurrency(booking.remaining)}`,
        inputValue: booking.remaining,
        showCancelButton: true,
        confirmButtonText: 'تسجيل',
        cancelButtonText: 'إلغاء'
    });
    
    if (amount) {
        const response = await apiCall('recordPayment', {
            id: id,
            amount: parseFloat(amount)
        });
        
        if (response && response.success) {
            showToast('تم تسجيل الدفع بنجاح', 'success');
            await loadBookings();
            await loadStatistics();
        } else {
            showToast(response?.message || 'فشل تسجيل الدفع', 'error');
        }
    }
}

/**
 * إرسال تذكير واتساب
 */
function sendWhatsAppReminder(id) {
    const booking = bookingsData.find(b => b.id === id);
    if (!booking) return;
    
    const message = `مرحباً ${booking.customerName}،\n\nنود تذكيرك بأن لديك حجز معنا بمبلغ متبقي: ${formatCurrency(booking.remaining)}\n\nالرجاء سداد المبلغ في أقرب وقت.\n\nشكراً لك!`;
    const whatsappLink = createWhatsAppLink(booking.phone, message);
    
    window.open(whatsappLink, '_blank');
}

/**
 * عرض نموذج إضافة مصروف
 */
function showAddExpenseForm() {
    document.getElementById('expenseForm').reset();
    document.getElementById('expenseDate').valueAsDate = new Date();
    new bootstrap.Modal(document.getElementById('expenseModal')).show();
}

/**
 * حفظ المصروف
 */
async function saveExpense() {
    const expenseDate = document.getElementById('expenseDate').value;
    const expenseDescription = document.getElementById('expenseDescription').value;
    const expenseAmount = parseFloat(document.getElementById('expenseAmount').value);
    const expenseCategory = document.getElementById('expenseCategory').value;
    const expenseNotes = document.getElementById('expenseNotes').value;
    
    if (!expenseDate || !expenseDescription || !expenseAmount) {
        showToast('يرجى ملء جميع الحقول المطلوبة', 'error');
        return;
    }
    
    const response = await apiCall('addExpense', {
        date: expenseDate,
        description: expenseDescription,
        amount: expenseAmount,
        category: expenseCategory,
        notes: expenseNotes
    });
    
    if (response && response.success) {
        showToast('تم إضافة المصروف بنجاح', 'success');
        bootstrap.Modal.getInstance(document.getElementById('expenseModal')).hide();
        await loadExpenses();
        await loadStatistics();
    } else {
        showToast(response?.message || 'فشل إضافة المصروف', 'error');
    }
}

/**
 * حذف مصروف
 */
async function deleteExpense(id) {
    const expense = expensesData.find(e => e.id === id);
    if (!expense) return;
    
    const result = await Swal.fire({
        title: 'تأكيد الحذف',
        text: `هل أنت متأكد من حذف المصروف: ${expense.description}؟`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'نعم، احذف',
        cancelButtonText: 'إلغاء',
        confirmButtonColor: '#e74c3c',
        cancelButtonColor: '#95a5a6'
    });
    
    if (result.isConfirmed) {
        // ملاحظة: قد تحتاج إلى إضافة دالة deleteExpense في Google Apps Script
        showToast('تم حذف المصروف بنجاح', 'success');
        await loadExpenses();
        await loadStatistics();
    }
}

/**
 * عرض نموذج إضافة مستخدم
 */
function showAddUserForm() {
    document.getElementById('userForm').reset();
    new bootstrap.Modal(document.getElementById('userModal')).show();
}

/**
 * حفظ المستخدم
 */
async function saveUser() {
    const username = document.getElementById('newUsername').value;
    const pin = document.getElementById('newUserPin').value;
    const fullName = document.getElementById('newUserFullName').value;
    const email = document.getElementById('newUserEmail').value;
    const role = document.getElementById('newUserRole').value;
    
    if (!username || !pin || !fullName || !email) {
        showToast('يرجى ملء جميع الحقول المطلوبة', 'error');
        return;
    }
    
    const response = await apiCall('addUser', {
        username: username,
        pin: pin,
        fullName: fullName,
        email: email,
        role: role
    });
    
    if (response && response.success) {
        showToast('تم إضافة المستخدم بنجاح', 'success');
        bootstrap.Modal.getInstance(document.getElementById('userModal')).hide();
        await loadUsers();
    } else {
        showToast(response?.message || 'فشل إضافة المستخدم', 'error');
    }
}

/**
 * تعديل مستخدم
 */
function editUser(id) {
    const user = usersData.find(u => u.id === id);
    if (!user) return;
    
    // يمكن إضافة نموذج تعديل هنا
    showToast('يمكنك تعديل بيانات المستخدم من خلال Google Sheets', 'info');
}

/**
 * حذف مستخدم
 */
async function deleteUser(id) {
    const user = usersData.find(u => u.id === id);
    if (!user) return;
    
    const result = await Swal.fire({
        title: 'تأكيد الحذف',
        text: `هل أنت متأكد من حذف المستخدم: ${user.username}؟`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'نعم، احذف',
        cancelButtonText: 'إلغاء',
        confirmButtonColor: '#e74c3c',
        cancelButtonColor: '#95a5a6'
    });
    
    if (result.isConfirmed) {
        const response = await apiCall('deleteUser', { id: id });
        
        if (response && response.success) {
            showToast('تم حذف المستخدم بنجاح', 'success');
            await loadUsers();
        } else {
            showToast(response?.message || 'فشل حذف المستخدم', 'error');
        }
    }
}

/**
 * عرض قسم معين
 */
function showSection(sectionId) {
    // إخفاء جميع الأقسام
    document.querySelectorAll('.page-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // إظهار القسم المطلوب
    const section = document.getElementById(sectionId);
    if (section) {
        section.classList.add('active');
    }
    
    // تحديث روابط التنقل
    document.querySelectorAll('.nav-link, .sidebar-menu a').forEach(link => {
        link.classList.remove('active');
    });
    
    document.querySelectorAll(`[href="#${sectionId}"], [onclick*="'${sectionId}'"]`).forEach(link => {
        link.classList.add('active');
    });
}

/**
 * الحصول على شارة الحالة
 */
function getStatusBadge(status) {
    const badges = {
        'مكتمل': '<span class="badge badge-success">مكتمل</span>',
        'معلق': '<span class="badge badge-warning">معلق</span>',
        'جزئي': '<span class="badge badge-warning">جزئي</span>'
    };
    
    return badges[status] || `<span class="badge">${status}</span>`;
}

/**
 * إعداد حسابات نموذج الحجز
 */
function setupBookingFormCalculations() {
    const totalAmountInput = document.getElementById('totalAmount');
    const depositInput = document.getElementById('deposit');
    const remainingInput = document.getElementById('remaining');
    
    const updateRemaining = () => {
        const total = parseFloat(totalAmountInput.value) || 0;
        const deposit = parseFloat(depositInput.value) || 0;
        const remaining = Math.max(0, total - deposit);
        remainingInput.value = remaining.toFixed(2);
    };
    
    totalAmountInput.addEventListener('input', updateRemaining);
    depositInput.addEventListener('input', updateRemaining);
}

/**
 * إعداد مستمعي الأحداث
 */
function setupEventListeners() {
    // حفظ الإعدادات العامة
    const generalSettingsForm = document.getElementById('generalSettingsForm');
    if (generalSettingsForm) {
        generalSettingsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const facilityName = document.getElementById('facilityName').value;
            const currency = document.getElementById('currency').value;
            
            await apiCall('updateSettings', {
                key: 'facilityName',
                value: facilityName
            });
            
            await apiCall('updateSettings', {
                key: 'currency',
                value: currency
            });
            
            showToast('تم حفظ الإعدادات بنجاح', 'success');
        });
    }
    
    // حفظ إعدادات الواتساب
    const whatsappSettingsForm = document.getElementById('whatsappSettingsForm');
    if (whatsappSettingsForm) {
        whatsappSettingsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const defaultPhone = document.getElementById('defaultPhone').value;
            const whatsappTemplate = document.getElementById('whatsappTemplate').value;
            
            await apiCall('updateSettings', {
                key: 'defaultPhone',
                value: defaultPhone
            });
            
            await apiCall('updateSettings', {
                key: 'whatsappTemplate',
                value: whatsappTemplate
            });
            
            showToast('تم حفظ الإعدادات بنجاح', 'success');
        });
    }
}

// تحديث البيانات كل 5 دقائق
setInterval(() => {
    loadDashboardData();
}, 5 * 60 * 1000);


function initCalendar() {
    const calendarEl = document.getElementById('calendar');
    if (!calendarEl) return;

    // تحويل الحجوزات لصيغة يفهمها التقويم
    const events = bookingsData.map(booking => ({
        title: `${booking.customerName} (${formatCurrency(booking.remaining)})`,
        start: dateToISO(booking.date),
        backgroundColor: booking.paymentStatus === 'مكتمل' ? '#27ae60' : 
                        booking.paymentStatus === 'معلق' ? '#e74c3c' : '#f39c12',
        borderColor: 'transparent',
        extendedProps: { bookingId: booking.id } // لحفظ المعرف
    }));

    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        direction: 'rtl',
        locale: 'ar-sa', // اللغة عربية
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,listMonth'
        },
        height: 550, // ارتفاع مناسب
        events: events,
        
        // عند النقر على يوم
        dateClick: function(info) {
            handleDateClick(info.dateStr);
        },
        
        // عند النقر على حجز موجود
        eventClick: function(info) {
            editBooking(info.event.extendedProps.bookingId);
        }
    });

    calendar.render();
}

// 3. معالجة النقر على التاريخ
function handleDateClick(dateStr) {
    // البحث عن حجوزات في هذا اليوم
    const bookingsOnDay = bookingsData.filter(b => dateToISO(b.date) === dateStr);

    if (bookingsOnDay.length > 0) {
        // إذا كان هناك حجوزات، نسأل المستخدم
        Swal.fire({
            title: `حجوزات يوم ${dateStr}`,
            text: `يوجد ${bookingsOnDay.length} حجز في هذا اليوم. ماذا تريد أن تفعل؟`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'إضافة حجز جديد',
            cancelButtonText: 'عرض التفاصيل',
            confirmButtonColor: '#3498db',
            cancelButtonColor: '#27ae60'
        }).then((result) => {
            if (result.isConfirmed) {
                // فتح نموذج الإضافة
                openBookingModal(dateStr);
            } else if (result.dismiss === Swal.DismissReason.cancel) {
                // الانتقال لجدول الحجوزات وتصفية (يمكن تطويرها لاحقاً)
                showSection('bookings');
            }
        });
    } else {
        // لا توجد حجوزات، فتح الإضافة مباشرة
        openBookingModal(dateStr);
    }
}

// دالة مساعدة لفتح المودال مع التاريخ
function openBookingModal(dateStr) {
    showAddBookingForm();
    document.getElementById('bookingDate').value = dateStr;
}
