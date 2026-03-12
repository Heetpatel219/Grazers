// Custom Notification System

// Inject CSS if not already present
if (!document.querySelector('link[href="notifications.css"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'notifications.css';
    document.head.appendChild(link);
}

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
 * Show a custom notification
 * @param {string} title - The notification title
 * @param {string} message - The notification message content
 * @param {string} type - 'success', 'error', 'info', or 'sale'
 * @param {string} linkUrl - Optional URL to navigate to when clicked
 * @param {number} duration - Time in ms before auto-hiding (0 for infinite)
 */
function showCustomNotification(title, message, type = 'success', linkUrl = null, duration = 5000) {
    const container = ensureNotificationContainer();

    const notif = document.createElement('div');
    notif.className = `custom-notification type-${type}`;

    // Build HTML content
    notif.innerHTML = `
        <button class="custom-notification-close">&times;</button>
        <h4 class="custom-notification-title">${title}</h4>
        <p class="custom-notification-message">${message}</p>
    `;

    // Click handler for navigation
    if (linkUrl) {
        notif.addEventListener('click', (e) => {
            // Ignore if they clicked the close button
            if (!e.target.classList.contains('custom-notification-close')) {
                window.location.href = linkUrl;
            }
        });
    }

    // Close button handler
    const closeBtn = notif.querySelector('.custom-notification-close');
    closeBtn.addEventListener('click', () => {
        closeNotification(notif);
    });

    // Add to container
    container.appendChild(notif);

    // Trigger animation
    requestAnimationFrame(() => {
        notif.classList.add('show');
    });

    // Auto remove
    if (duration > 0) {
        setTimeout(() => {
            closeNotification(notif);
        }, duration);
    }
}

function closeNotification(notifElement) {
    notifElement.classList.remove('show');
    // Wait for transition to finish before removing from DOM
    setTimeout(() => {
        if (notifElement.parentElement) {
            notifElement.parentElement.removeChild(notifElement);
        }
    }, 300); // 300ms matches the CSS transition
}

// Global 'x' key listener for random price drop
document.addEventListener('keydown', async (e) => {
    // Only trigger if 'x' is pressed
    if (e.key.toLowerCase() !== 'x') return;

    // Don't trigger if user is typing in an input or textarea
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
            8000 // Show for 8 seconds
        );

        // If we are currently on the product page for this specific product, refresh standard content to reflect new price
        if (window.location.pathname.includes('/product.html') && window.location.search.includes(`id=${product.id}`)) {
            // We could manually update or reload
            if (typeof loadProductDetail === 'function') {
                loadProductDetail();
            }
        }

    } catch (err) {
        console.error('Error triggering price drop:', err);
    }
});

// Override window.alert for a smoother look across the app
// (Optional, but helps with places we missed)
/*
const originalAlert = window.alert;
window.alert = function(msg) {
    showCustomNotification('Alert', msg, 'info');
};
*/
