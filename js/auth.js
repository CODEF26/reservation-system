// ============================================
// ملف إدارة المصادقة والجلسات
// ============================================

let sessionCheckInterval = null;
let lastActivityTime = Date.now();

/**
 * تهيئة نظام المصادقة
 */
function initAuth() {
    // التحقق من وجود جلسة نشطة
    const sessionData = getSessionData();
    
    if (!sessionData) {
        // إذا لم توجد جلسة، أعد التوجيه إلى صفحة التسجيل
        redirectToLogin('انتهت جلسة الدخول، الرجاء تسجيل الدخول مرة أخرى');
        return false;
    }
    
    // تحديث بيانات المستخدم
    updateUserDisplay(sessionData.user);
    
    // بدء مراقبة الجلسة
    startSessionMonitoring();
    
    // تتبع النشاط
    trackActivity();
    
    return true;
}

/**
 * الحصول على بيانات الجلسة
 */
function getSessionData() {
    // محاولة الحصول من localStorage أولاً
    let sessionData = getFromLocalStorage('sessionData');
    
    // إذا لم توجد، حاول sessionStorage
    if (!sessionData) {
        sessionData = JSON.parse(sessionStorage.getItem('sessionData') || 'null');
    }
    
    // التحقق من صحة الجلسة
    if (sessionData && isSessionValid(sessionData)) {
        return sessionData;
    }
    
    // حذف الجلسة غير الصحيحة
    clearSession();
    return null;
}

/**
 * التحقق من صحة الجلسة
 */
function isSessionValid(sessionData) {
    if (!sessionData || !sessionData.user || !sessionData.token) {
        return false;
    }
    
    const loginTime = sessionData.loginTime || 0;
    const currentTime = Date.now();
    const elapsed = currentTime - loginTime;
    
    // التحقق من انتهاء الجلسة
    if (elapsed > SESSION_TIMEOUT) {
        return false;
    }
    
    return true;
}

/**
 * تحديث عرض بيانات المستخدم
 */
function updateUserDisplay(user) {
    const userFullNameEl = document.getElementById('userFullName');
    const userRoleEl = document.getElementById('userRole');
    
    if (userFullNameEl) {
        userFullNameEl.textContent = user.fullName || user.username;
    }
    
    if (userRoleEl) {
        userRoleEl.textContent = user.role || 'موظف';
    }
}

/**
 * بدء مراقبة الجلسة
 */
function startSessionMonitoring() {
    // إيقاف أي مراقبة سابقة
    if (sessionCheckInterval) {
        clearInterval(sessionCheckInterval);
    }
    
    // فحص الجلسة كل دقيقة
    sessionCheckInterval = setInterval(() => {
        const sessionData = getSessionData();
        
        if (!sessionData) {
            clearInterval(sessionCheckInterval);
            redirectToLogin('انتهت جلسة الدخول، الرجاء تسجيل الدخول مرة أخرى');
        }
    }, SESSION_CHECK_INTERVAL);
}

/**
 * تتبع نشاط المستخدم
 */
function trackActivity() {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    
    events.forEach(event => {
        document.addEventListener(event, () => {
            lastActivityTime = Date.now();
            updateSessionActivity();
        }, true);
    });
}

/**
 * تحديث وقت آخر نشاط في الجلسة
 */
function updateSessionActivity() {
    const sessionData = getSessionData();
    
    if (sessionData) {
        sessionData.lastActivityTime = lastActivityTime;
        
        if (sessionData.rememberMe) {
            saveToLocalStorage('sessionData', sessionData);
        } else {
            sessionStorage.setItem('sessionData', JSON.stringify(sessionData));
        }
    }
}

/**
 * حذف الجلسة
 */
function clearSession() {
    removeFromLocalStorage('sessionData');
    sessionStorage.removeItem('sessionData');
    
    if (sessionCheckInterval) {
        clearInterval(sessionCheckInterval);
    }
}

/**
 * تسجيل الخروج
 */
function logout() {
    // تأكيد من المستخدم
    Swal.fire({
        title: 'تسجيل الخروج',
        text: 'هل أنت متأكد من رغبتك في تسجيل الخروج؟',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'نعم، تسجيل الخروج',
        cancelButtonText: 'إلغاء',
        confirmButtonColor: '#e74c3c',
        cancelButtonColor: '#95a5a6'
    }).then((result) => {
        if (result.isConfirmed) {
            clearSession();
            window.location.href = 'login.html';
        }
    });
}

/**
 * إعادة التوجيه إلى صفحة التسجيل
 */
function redirectToLogin(message = '') {
    clearSession();
    
    if (message) {
        localStorage.setItem('loginMessage', message);
    }
    
    window.location.href = 'login.html';
}

/**
 * الحصول على معرف الجلسة
 */
function getSessionToken() {
    const sessionData = getSessionData();
    return sessionData ? sessionData.token : null;
}

/**
 * الحصول على بيانات المستخدم الحالي
 */
function getCurrentUser() {
    const sessionData = getSessionData();
    return sessionData ? sessionData.user : null;
}

/**
 * التحقق من أن المستخدم الحالي هو مدير
 */
function isAdmin() {
    const user = getCurrentUser();
    return user && user.role === 'مدير';
}

/**
 * إرسال طلب API مع التحقق من الجلسة
 */
async function apiCall(action, params = {}) {
    // التحقق من الجلسة
    const sessionData = getSessionData();
    if (!sessionData) {
        redirectToLogin('انتهت جلسة الدخول');
        return null;
    }
    
    // إضافة معرف الجلسة إلى الطلب
    const requestParams = {
        action: action,
        token: sessionData.token,
        ...params
    };
    
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams(requestParams)
        });
        
        const data = await response.json();
        
        // التحقق من صحة الجلسة من الخادم
        if (!data.success && data.message && data.message.includes('جلسة')) {
            redirectToLogin('انتهت جلسة الدخول');
            return null;
        }
        
        return data;
    } catch (error) {
        console.error('خطأ في الاتصال:', error);
        showToast('حدث خطأ في الاتصال بالخادم', 'error');
        return null;
    }
}

/**
 * تحديث معرف الجلسة (تجديد الجلسة)
 */
function refreshSession() {
    const sessionData = getSessionData();
    
    if (sessionData) {
        sessionData.loginTime = Date.now();
        sessionData.lastActivityTime = Date.now();
        
        if (sessionData.rememberMe) {
            saveToLocalStorage('sessionData', sessionData);
        } else {
            sessionStorage.setItem('sessionData', JSON.stringify(sessionData));
        }
    }
}

/**
 * عرض تحذير انتهاء الجلسة
 */
function showSessionWarning() {
    const sessionData = getSessionData();
    
    if (!sessionData) return;
    
    const loginTime = sessionData.loginTime || 0;
    const currentTime = Date.now();
    const elapsed = currentTime - loginTime;
    const remaining = SESSION_TIMEOUT - elapsed;
    
    // عرض تحذير عندما يتبقى 2 دقيقة
    if (remaining > 0 && remaining < 2 * 60 * 1000) {
        const minutes = Math.ceil(remaining / 60 / 1000);
        
        Swal.fire({
            title: 'تحذير',
            text: `ستنتهي جلسة الدخول خلال ${minutes} دقيقة. هل تريد تمديد الجلسة؟`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'نعم، تمديد الجلسة',
            cancelButtonText: 'تسجيل الخروج',
            confirmButtonColor: '#3498db',
            cancelButtonColor: '#e74c3c'
        }).then((result) => {
            if (result.isConfirmed) {
                refreshSession();
            } else {
                logout();
            }
        });
    }
}

/**
 * حماية الصفحات
 */
function protectPage() {
    if (!initAuth()) {
        return false;
    }
    
    return true;
}

// ============================================
// تهيئة المصادقة عند تحميل الصفحة
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // إذا كنا في صفحة التسجيل، لا تتحقق من الجلسة
    if (window.location.pathname.includes('login.html') || window.location.pathname === '/') {
        // عرض أي رسالة تسجيل دخول مخزنة
        const loginMessage = localStorage.getItem('loginMessage');
        if (loginMessage) {
            showToast(loginMessage, 'info');
            localStorage.removeItem('loginMessage');
        }
        return;
    }
    
    // للصفحات الأخرى، تحقق من الجلسة
    if (!protectPage()) {
        // سيتم إعادة التوجيه تلقائياً
        return;
    }
});

// فحص الجلسة كل 30 ثانية
setInterval(() => {
    if (!window.location.pathname.includes('login.html')) {
        showSessionWarning();
    }
}, 30 * 1000);
