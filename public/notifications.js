if (!document.querySelector('link[href="notifications.css"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'notifications.css';
    document.head.appendChild(link);
}

/**
 * Core Client Function: ensureNotificationContainer
 * Standardizes layout handling and logical rendering parameters natively.
 */
/**
 * Core Client Function: ensureNotificationContainer
 * Standardizes layout handling and networking requests natively.
 */
function ensureNotificationContainer() {
    let container = document.getElementById('custom-notification-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'custom-notification-container';
        container.className = 'custom-notification-container';
        document.body.appendChild(container);
    }
    return container;
}

/**
 * Core Client Function: showCustomNotification
 * Standardizes layout handling and logical rendering parameters natively.
 */
/**
 * Core Client Function: showCustomNotification
 * Standardizes layout handling and networking requests natively.
 */
function showCustomNotification(title, message, type = 'success', linkUrl = null, duration = 5000) {
    const container = ensureNotificationContainer();

    const notif = document.createElement('div');
    notif.className = `custom-notification type-${type}`;

    notif.innerHTML = `
        <button class="custom-notification-close">&times;</button>
        <h4 class="custom-notification-title">${title}</h4>
        <p class="custom-notification-message">${message}</p>
    `;

    if (linkUrl) {
        notif.addEventListener('click', (e) => {
            if (!e.target.classList.contains('custom-notification-close')) {
                window.location.href = linkUrl;
            }
        });
    }

    const closeBtn = notif.querySelector('.custom-notification-close');
    closeBtn.addEventListener('click', () => {
        closeNotification(notif);
    });

    container.appendChild(notif);

    requestAnimationFrame(() => {
        notif.classList.add('show');
    });

    if (duration > 0) {
        setTimeout(() => {
            closeNotification(notif);
        }, duration);
    }
}

/**
 * Core Client Function: closeNotification
 * Standardizes layout handling and logical rendering parameters natively.
 */
/**
 * Core Client Function: closeNotification
 * Standardizes layout handling and networking requests natively.
 */
function closeNotification(notifElement) {
    notifElement.classList.remove('show');
    setTimeout(() => {
        if (notifElement.parentElement) {
            notifElement.parentElement.removeChild(notifElement);
        }
    }, 300);
}

document.addEventListener('keydown', async (e) => {
    if (e.key.toLowerCase() !== 'x')
      return;

    const activeEl = document.activeElement;
    if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable)) {
        return;
    }

    try {
        const res = await fetch('/api/random-price-drop', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!res.ok) {
            console.error('Failed to drop random price');
            return;
        }

        const data = await res.json();
        const { product, dropPercentage } = data;

        showCustomNotification(
            `🔥 HUGE FLASH SALE!`,
            `The price of <strong>${product.title || 'a product'}</strong> just dropped by ${dropPercentage}%!<br>Click here to view it before it sells out!`,
            'sale',
            `/product.html?id=${product.id}`,
            8000
        );

        if (window.location.pathname.includes('/product.html') && window.location.search.includes(`id=${product.id}`)) {
            if (typeof loadProductDetail === 'function') {
                loadProductDetail();
            }
        }

    } catch (err) {
        console.error('Error triggering price drop:', err);
    }
});
