// ============================================
// ملف JavaScript لصفحة لوحة التحكم - نسخة مصححة
// ============================================

let currentBookingId = null;
let bookingsData = [];
let expensesData = [];
let usersData = [];
let calendar; 

// متغيرات لحفظ حالة الرسوم البيانية (الحل لمشكلة الكونسول)
let revenueChartInstance = null;
let bookingsChartInstance = null;

/**
 * تهيئة لوحة التحكم
 */
document.addEventListener('DOMContentLoaded', () => {
    if (!protectPage()) return;
    loadDashboardData();
    setupEventListeners();
});

/**
 * تحميل البيانات
 */
async function loadDashboardData() {
    try {
        await loadStatistics();
        await loadBookings();
        initCalendar(); 
        await loadExpenses();
        await loadUsers();
        await loadSettings();
    } catch (error) {
        console.error('خطأ في تحميل البيانات:', error);
    }
}

/**
 * تحميل الإحصائيات والرسم
 */
async function loadStatistics() {
    const response = await apiCall('getStatistics');
    
    if (response && response.success) {
        const stats = response.data;
        
        // تحديث الكروت
        if(document.getElementById('totalRevenue')) document.getElementById('totalRevenue').textContent = formatCurrency(stats.totalRevenue);
        if(document.getElementById('totalExpenses')) document.getElementById('totalExpenses').textContent = formatCurrency(stats.totalExpenses);
        if(document.getElementById('netProfit')) document.getElementById('netProfit').textContent = formatCurrency(stats.netProfit);
        if(document.getElementById('totalBookings')) document.getElementById('totalBookings').textContent = stats.totalBookings;
        if(document.getElementById('thisMonthBookings')) document.getElementById('thisMonthBookings').textContent = stats.thisMonthBookings;
        if(document.getElementById('pendingAmount')) document.getElementById('pendingAmount').textContent = formatCurrency(stats.pendingAmount);
        
        // رسم الرسوم البيانية (المصححة)
        drawRevenueChart();
        drawBookingsChart();
        
        displayUpcomingBookings();
    }
}

// ... (دوال loadBookings, loadExpenses, loadUsers, loadSettings كما هي) ...
async function loadBookings() {
    const response = await apiCall('getBookings');
    if (response && response.success) {
        bookingsData = response.data;
        displayBookingsTable();
        displayRevenueTable();
        displayPendingTable();
        if (calendar) {
            calendar.removeAllEvents();
            calendar.addEventSource(getCalendarEvents());
        }
    }
}

async function loadExpenses() {
    const response = await apiCall('getExpenses');
    if (response && response.success) {
        expensesData = response.data;
        displayExpensesTable();
    }
}

async function loadUsers() {
    const response = await apiCall('getUsers');
    if (response && response.success) {
        usersData = response.data;
        displayUsersTable();
    }
}

async function loadSettings() {
    const response = await apiCall('getSettings');
    if (response && response.success) {
        const settings = response.data;
        if (document.getElementById('facilityName')) document.getElementById('facilityName').value = settings.facilityName || '';
        if (document.getElementById('currency')) document.getElementById('currency').value = settings.currency || 'ر.س';
        if (document.getElementById('defaultPhone')) document.getElementById('defaultPhone').value = settings.defaultPhone || '';
        if (document.getElementById('whatsappTemplate')) document.getElementById('whatsappTemplate').value = settings.whatsappTemplate || '';
    }
}

// ============================================
// دوال الرسم البياني المصححة (Charts Fix)
// ============================================

function drawRevenueChart() {
    const ctx = document.getElementById('revenueChart');
    if (!ctx) return;
    
    // التعديل: تدمير المخطط القديم إذا وجد
    if (revenueChartInstance) {
        revenueChartInstance.destroy();
    }
    
    // تجهيز البيانات
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
    
    // إنشاء مخطط جديد وحفظه في المتغير
    revenueChartInstance = new Chart(ctx, {
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
                legend: { display: true, labels: { font: { family: "'Tajawal', sans-serif" } } }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) { return formatCurrency(value); },
                        font: { family: 'Segoe UI, sans-serif' }
                    }
                },
                x: { ticks: { font: { family: "'Tajawal', sans-serif" } } }
            }
        }
    });
}

function drawBookingsChart() {
    const ctx = document.getElementById('bookingsChart');
    if (!ctx) return;
    
    // التعديل: تدمير المخطط القديم إذا وجد
    if (bookingsChartInstance) {
        bookingsChartInstance.destroy();
    }
    
    const completed = bookingsData.filter(b => b.paymentStatus === 'مكتمل').length;
    const pending = bookingsData.filter(b => b.paymentStatus !== 'مكتمل').length;
    
    // إنشاء مخطط جديد وحفظه
    bookingsChartInstance = new Chart(ctx, {
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
                legend: { display: true, labels: { font: { family: "'Tajawal', sans-serif" } } }
            }
        }
    });
}

// ============================================
// دوال التقويم
// ============================================

function getCalendarEvents() {
    return bookingsData.map(booking => ({
        title: `${booking.customerName} (${formatCurrency(booking.remaining)})`,
        start: dateToISO(booking.date),
        backgroundColor: booking.paymentStatus === 'مكتمل' ? '#27ae60' : 
                        booking.paymentStatus === 'معلق' ? '#e74c3c' : '#f39c12',
        borderColor: 'transparent',
        extendedProps: { bookingId: booking.id }
    }));
}

function initCalendar() {
    const calendarEl = document.getElementById('calendar');
    if (!calendarEl) return;

    // التأكد من عدم إعادة تهيئة التقويم إذا كان موجوداً
    if (calendar) return;

    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        direction: 'rtl',
        locale: 'ar-sa',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,listMonth'
        },
        height: 550,
        events: getCalendarEvents(),
        dateClick: function(info) { handleDateClick(info.dateStr); },
        eventClick: function(info) { editBooking(info.event.extendedProps.bookingId); }
    });

    calendar.render();
}

function handleDateClick(dateStr) {
    const bookingsOnDay = bookingsData.filter(b => dateToISO(b.date) === dateStr);
    if (bookingsOnDay.length > 0) {
        Swal.fire({
            title: `حجوزات يوم ${dateStr}`,
            text: `يوجد ${bookingsOnDay.length} حجز. ماذا تريد أن تفعل؟`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'إضافة حجز جديد',
            cancelButtonText: 'إلغاء',
            confirmButtonColor: '#3498db'
        }).then((result) => {
            if (result.isConfirmed) showAddBookingForm(dateStr);
        });
    } else {
        showAddBookingForm(dateStr);
    }
}

// ============================================
// دوال الجداول والعرض (UI)
// ============================================

function displayBookingsTable() {
    const container = document.getElementById('bookingsTable');
    if (!bookingsData.length) { container.innerHTML = '<p class="empty-state">لا توجد حجوزات</p>'; return; }
    
    let html = `<table class="table table-hover"><thead><tr><th>التاريخ</th><th>اسم العميل</th><th>الجوال</th><th>المبلغ</th><th>المتبقي</th><th>الحالة</th><th>الإجراءات</th></tr></thead><tbody>`;
    bookingsData.forEach(booking => {
        html += `<tr>
            <td class="num-en">${formatDate(booking.date)}</td>
            <td>${booking.customerName}</td>
            <td class="num-en">${booking.phone}</td>
            <td class="num-en">${formatCurrency(booking.totalAmount)}</td>
            <td class="num-en">${formatCurrency(booking.remaining)}</td>
            <td>${getStatusBadge(booking.paymentStatus)}</td>
            <td>
                <button class="btn-action edit" onclick="editBooking(${booking.id})"><i class="fas fa-edit"></i></button>
                <button class="btn-action delete" onclick="deleteBooking(${booking.id})"><i class="fas fa-trash"></i></button>
                <button class="btn-action complete" onclick="recordPayment(${booking.id})"><i class="fas fa-money-bill"></i></button>
            </td>
        </tr>`;
    });
    html += '</tbody></table>';
    container.innerHTML = html;
}

function displayRevenueTable() {
    const container = document.getElementById('revenueTable');
    const completed = bookingsData.filter(b => b.paymentStatus === 'مكتمل');
    if (!completed.length) { container.innerHTML = '<p class="empty-state">لا توجد إيرادات</p>'; return; }
    
    let total = 0;
    let html = `<table class="table table-hover"><thead><tr><th>التاريخ</th><th>اسم العميل</th><th>المبلغ</th><th>الحالة</th></tr></thead><tbody>`;
    completed.forEach(b => {
        total += b.totalAmount;
        html += `<tr><td class="num-en">${formatDate(b.date)}</td><td>${b.customerName}</td><td class="num-en">${formatCurrency(b.totalAmount)}</td><td><span class="badge badge-success">مكتمل</span></td></tr>`;
    });
    html += `</tbody></table><div class="mt-3"><strong>إجمالي الإيرادات: <span class="num-en">${formatCurrency(total)}</span></strong></div>`;
    container.innerHTML = html;
}

function displayPendingTable() {
    const container = document.getElementById('pendingTable');
    const pending = bookingsData.filter(b => b.paymentStatus !== 'مكتمل');
    if (!pending.length) { container.innerHTML = '<p class="empty-state">لا توجد حجوزات معلقة</p>'; return; }
    
    let total = 0;
    let html = `<table class="table table-hover"><thead><tr><th>التاريخ</th><th>اسم العميل</th><th>المتبقي</th><th>الإجراءات</th></tr></thead><tbody>`;
    pending.forEach(b => {
        total += b.remaining;
        html += `<tr><td class="num-en">${formatDate(b.date)}</td><td>${b.customerName}</td><td class="num-en">${formatCurrency(b.remaining)}</td>
        <td>
            <button class="btn-action edit" onclick="recordPayment(${b.id})"><i class="fas fa-money-bill"></i></button>
            <button class="btn-action complete" onclick="sendWhatsAppReminder(${b.id})"><i class="fas fa-whatsapp"></i></button>
        </td></tr>`;
    });
    html += `</tbody></table><div class="mt-3"><strong>إجمالي المعلق: <span class="num-en">${formatCurrency(total)}</span></strong></div>`;
    container.innerHTML = html;
}

function displayExpensesTable() {
    const container = document.getElementById('expensesTable');
    if (!expensesData.length) { container.innerHTML = '<p class="empty-state">لا توجد مصروفات</p>'; return; }
    
    let total = 0;
    let html = `<table class="table table-hover"><thead><tr><th>التاريخ</th><th>الوصف</th><th>المبلغ</th><th>الإجراءات</th></tr></thead><tbody>`;
    expensesData.forEach(e => {
        total += e.amount;
        html += `<tr><td class="num-en">${formatDate(e.date)}</td><td>${e.description}</td><td class="num-en">${formatCurrency(e.amount)}</td>
        <td><button class="btn-action delete" onclick="deleteExpense(${e.id})"><i class="fas fa-trash"></i></button></td></tr>`;
    });
    html += `</tbody></table><div class="mt-3"><strong>إجمالي المصروفات: <span class="num-en">${formatCurrency(total)}</span></strong></div>`;
    container.innerHTML = html;
}

function displayUsersTable() {
    const container = document.getElementById('usersTable');
    if (!usersData.length) { container.innerHTML = '<p class="empty-state">لا توجد مستخدمين</p>'; return; }
    
    let html = `<table class="table table-hover"><thead><tr><th>الاسم</th><th>الدور</th><th>الإجراءات</th></tr></thead><tbody>`;
    usersData.forEach(u => {
        html += `<tr><td>${u.username}</td><td>${u.role}</td>
        <td>
            <button class="btn-action edit" onclick="editUser(${u.id})"><i class="fas fa-edit"></i></button>
            <button class="btn-action delete" onclick="deleteUser(${u.id})"><i class="fas fa-trash"></i></button>
        </td></tr>`;
    });
    html += '</tbody></table>';
    container.innerHTML = html;
}

function displayUpcomingBookings() {
    const container = document.getElementById('upcomingBookings');
    const today = new Date();
    const upcoming = bookingsData.filter(b => new Date(b.date) >= today).sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, 5);
    
    if (!upcoming.length) { container.innerHTML = '<p class="empty-state">لا توجد حجوزات قادمة</p>'; return; }
    
    let html = `<table class="table table-hover"><thead><tr><th>التاريخ</th><th>العميل</th><th>المبلغ</th></tr></thead><tbody>`;
    upcoming.forEach(b => {
        html += `<tr><td class="num-en">${formatDate(b.date)}</td><td>${b.customerName}</td><td class="num-en">${formatCurrency(b.totalAmount)}</td></tr>`;
    });
    html += '</tbody></table>';
    container.innerHTML = html;
}

// ============================================
// إدارة النماذج والعمليات (Forms & Actions)
// ============================================

function showAddBookingForm(dateStr = null) {
    currentBookingId = null;
    document.getElementById('bookingModalTitle').textContent = 'إضافة حجز جديد';
    document.getElementById('bookingForm').reset();
    if (dateStr) document.getElementById('bookingDate').value = dateStr;
    else document.getElementById('bookingDate').valueAsDate = new Date();
    setupBookingFormCalculations();
    new bootstrap.Modal(document.getElementById('bookingModal')).show();
}

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

async function saveBooking() {
    const params = {
        date: document.getElementById('bookingDate').value,
        customerName: document.getElementById('customerName').value,
        phone: document.getElementById('customerPhone').value,
        totalAmount: parseFloat(document.getElementById('totalAmount').value),
        deposit: parseFloat(document.getElementById('deposit').value),
        remaining: parseFloat(document.getElementById('remaining').value),
        insurance: parseFloat(document.getElementById('insurance').value) || 0,
        paymentStatus: document.getElementById('paymentStatus').value,
        notes: document.getElementById('bookingNotes').value
    };
    
    if (!params.date || !params.customerName || !params.phone || isNaN(params.totalAmount)) {
        showToast('يرجى ملء الحقول المطلوبة', 'error'); return;
    }

    let response;
    if (currentBookingId) {
        params.id = currentBookingId;
        response = await apiCall('updateBooking', params);
    } else {
        response = await apiCall('addBooking', params);
    }

    if (response && response.success) {
        showToast('تم الحفظ بنجاح', 'success');
        bootstrap.Modal.getInstance(document.getElementById('bookingModal')).hide();
        await loadBookings();
        await loadStatistics();
    } else {
        showToast('فشل الحفظ', 'error');
    }
}

async function deleteBooking(id) {
    const result = await Swal.fire({ title: 'تأكيد الحذف؟', icon: 'warning', showCancelButton: true, confirmButtonText: 'نعم', cancelButtonText: 'لا' });
    if (result.isConfirmed) {
        await apiCall('deleteBooking', { id: id });
        showToast('تم الحذف', 'success');
        await loadBookings();
        await loadStatistics();
    }
}

async function recordPayment(id) {
    const booking = bookingsData.find(b => b.id === id);
    const { value: amount } = await Swal.fire({ title: 'تسجيل دفعة', input: 'number', inputValue: booking.remaining, showCancelButton: true });
    if (amount) {
        await apiCall('recordPayment', { id: id, amount: parseFloat(amount) });
        showToast('تم التسجيل', 'success');
        await loadBookings();
        await loadStatistics();
    }
}

function sendWhatsAppReminder(id) {
    const booking = bookingsData.find(b => b.id === id);
    const msg = `مرحباً ${booking.customerName}، نود تذكيرك بالمبلغ المتبقي: ${formatCurrency(booking.remaining)}`;
    window.open(createWhatsAppLink(booking.phone, msg), '_blank');
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
    
    // إذا انتقلنا إلى الحجوزات، نقوم بتحديث التقويم ليعرض بشكل صحيح
    if (sectionId === 'bookings' && calendar) {
        setTimeout(() => {
            calendar.updateSize();
        }, 100);
    }
}

/**
 * الحصول على شارة الحالة
 */
function getStatusBadge(status) {
    const badges = {
        'مكتمل': '<span class="badge badge-success">مكتمل</span>',
        'معلق': '<span class="badge badge-danger">معلق</span>',
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
