// ============================================
// ملف الإعدادات والمتغيرات العامة
// ============================================

// تم تحديث الرابط الخاص بك هنا 👇
const API_URL = 'https://script.google.com/macros/s/AKfycbwOE8nlJQo6duaDZTmYZW_aQazrwJsDzpV8Ciw8A6hubeNkqd5lrUYGuEbGAnNtueV83w/exec';

// إعدادات الجلسة
const SESSION_TIMEOUT = 20 * 60 * 1000; // 20 دقيقة بالميلي ثانية
const SESSION_CHECK_INTERVAL = 1 * 60 * 1000; // فحص كل دقيقة

// إعدادات التطبيق
const APP_NAME = 'نظام إدارة حجوزات الاستراحات';
const APP_VERSION = '1.0.0';
const CURRENCY = 'ر.س';

// الألوان
const COLORS = {
    primary: '#2c3e50',
    secondary: '#3498db',
    success: '#27ae60',
    danger: '#e74c3c',
    warning: '#f39c12',
    light: '#ecf0f1',
    dark: '#2c3e50'
};

// حالات الحجوزات
const BOOKING_STATUSES = {
    PENDING: 'معلق',
    COMPLETED: 'مكتمل',
    PARTIAL: 'جزئي'
};

// تصنيفات المصروفات
const EXPENSE_CATEGORIES = [
    'صيانة',
    'تنظيف',
    'كهرباء',
    'ماء',
    'غاز',
    'إيجار',
    'رواتب',
    'أخرى'
];

// الأدوار
const USER_ROLES = {
    ADMIN: 'مدير',
    EMPLOYEE: 'موظف'
};

// ============================================
// دوال مساعدة عامة
// ============================================

/**
 * تنسيق الأرقام بفواصل الآلاف
 */
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', { // تغيير إلى en-US
        style: 'currency',
        currency: 'SAR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    }).format(amount).replace('SAR', 'ر.س'); // استبدال الرمز يدوياً للحفاظ على العربية
}

/**
 * تنسيق التاريخ
 */
function formatDate(date) {
    if (!date) return '';
    
    if (typeof date === 'string') {
        date = new Date(date);
    }
    
    return date.toLocaleDateString('ar-SA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

/**
 * تنسيق التاريخ والوقت
 */
function formatDateTime(date) {
    if (!date) return '';
    
    if (typeof date === 'string') {
        date = new Date(date);
    }
    
    return date.toLocaleDateString('ar-SA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * تحويل التاريخ إلى صيغة ISO
 */
function dateToISO(date) {
    if (!date) return '';
    
    if (typeof date === 'string') {
        date = new Date(date);
    }
    
    return date.toISOString().split('T')[0];
}

/**
 * حساب الفرق بين تاريخين بالأيام
 */
function getDaysDifference(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffTime = Math.abs(d2 - d1);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
}

/**
 * التحقق من صحة رقم الهاتف
 */
function isValidPhone(phone) {
    const phoneRegex = /^[\d\s\-\+\(\)]{10,}$/;
    return phoneRegex.test(phone);
}

/**
 * التحقق من صحة البريد الإلكتروني
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * إنشاء معرف فريد
 */
function generateId() {
    return 'ID_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * نسخ النص إلى الحافظة
 */
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('تم النسخ بنجاح', 'success');
    }).catch(() => {
        showToast('فشل النسخ', 'error');
    });
}

/**
 * عرض رسالة Toast
 */
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        ${message}
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

/**
 * تأخير التنفيذ
 */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * حفظ البيانات في localStorage
 */
function saveToLocalStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
        return true;
    } catch (error) {
        console.error('خطأ في حفظ البيانات:', error);
        return false;
    }
}

/**
 * استرجاع البيانات من localStorage
 */
function getFromLocalStorage(key) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error('خطأ في استرجاع البيانات:', error);
        return null;
    }
}

/**
 * حذف البيانات من localStorage
 */
function removeFromLocalStorage(key) {
    try {
        localStorage.removeItem(key);
        return true;
    } catch (error) {
        console.error('خطأ في حذف البيانات:', error);
        return false;
    }
}

/**
 * تنسيق رقم الهاتف
 */
function formatPhoneNumber(phone) {
    if (!phone) return '';
    
    // إزالة جميع الأحرف غير الرقمية
    const cleaned = phone.replace(/\D/g, '');
    
    // إضافة رمز الدولة إذا لم يكن موجوداً
    if (cleaned.length === 9) {
        return '+966' + cleaned;
    } else if (cleaned.length === 10) {
        return '+966' + cleaned.substring(1);
    }
    
    return '+966' + cleaned;
}

/**
 * إنشاء رابط واتساب
 */
function createWhatsAppLink(phone, message) {
    const formattedPhone = formatPhoneNumber(phone).replace(/\D/g, '');
    const encodedMessage = encodeURIComponent(message);
    return `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
}

/**
 * حساب النسبة المئوية
 */
function calculatePercentage(value, total) {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
}

/**
 * تحويل البيانات إلى CSV
 */
function convertToCSV(data) {
    if (!data || data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csv = [headers.join(',')];
    
    data.forEach(row => {
        const values = headers.map(header => {
            const value = row[header];
            if (typeof value === 'string' && value.includes(',')) {
                return `"${value}"`;
            }
            return value;
        });
        csv.push(values.join(','));
    });
    
    return csv.join('\n');
}

/**
 * تحميل ملف CSV
 */
function downloadCSV(data, filename) {
    const csv = convertToCSV(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * التحقق من الاتصال بالإنترنت
 */
function isOnline() {
    return navigator.onLine;
}

/**
 * إضافة أسلوب CSS ديناميكي
 */
function addStyle(css) {
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
}

/**
 * إضافة رسائل Toast CSS
 */
addStyle(`
    .toast-notification {
        position: fixed;
        bottom: 20px;
        left: 20px;
        background: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        display: flex;
        align-items: center;
        gap: 10px;
        opacity: 0;
        transform: translateX(400px);
        transition: all 0.3s ease;
        z-index: 9999;
        max-width: 300px;
    }

    .toast-notification.show {
        opacity: 1;
        transform: translateX(0);
    }

    .toast-notification.toast-success {
        border-right: 4px solid #27ae60;
        color: #27ae60;
    }

    .toast-notification.toast-error {
        border-right: 4px solid #e74c3c;
        color: #e74c3c;
    }

    .toast-notification.toast-info {
        border-right: 4px solid #3498db;
        color: #3498db;
    }

    .toast-notification i {
        font-size: 18px;
    }

    @media (max-width: 480px) {
        .toast-notification {
            left: 10px;
            right: 10px;
            max-width: none;
        }
    }
`);

// ============================================
// معالجات الأخطاء العامة
// ============================================

window.addEventListener('error', (event) => {
    console.error('خطأ عام:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('خطأ في Promise:', event.reason);
});
