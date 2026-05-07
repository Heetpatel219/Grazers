document.addEventListener('DOMContentLoaded', () => {
    loadCartPage();

    const today = new Date().toISOString().slice(0, 10);
    document.getElementById('reserveDate').setAttribute('min', today);

    document.getElementById('reserveModalCancel').addEventListener('click', closeReserveModal);
    document.getElementById('reserveModalSubmit').addEventListener('click', submitStoreReservation);
    document.getElementById('reserveDate').addEventListener('change', window.updateReserveTimes);
});

let cartItems = [];
let currentReservingStoreId = null;
let currentReservingStoreName = null;

/**
 * Core Client Function: loadCartPage
 * Standardizes layout handling and logical rendering parameters natively.
 */
/**
 * Core Client Function: loadCartPage
 * Standardizes layout handling and networking requests natively.
 */
async function loadCartPage() {
    const container = document.getElementById('cartContent');
    try {
        const checkAuthRes = await fetch('/api/check-auth');
        if (!checkAuthRes.ok) {
            window.location.href = '/signin.html';
            return;
        }

        const res = await fetch('/api/cart');
        if (!res.ok) throw new Error('Failed to fetch cart');

        cartItems = await res.json();
        renderCart();
    } catch (err) {
        console.error(err);
        container.innerHTML = '<div class="empty-cart">Unable to load cart. Please try again later.</div>';
    }
}

/**
 * Core Client Function: renderCart
 * Standardizes layout handling and logical rendering parameters natively.
 */
/**
 * Core Client Function: renderCart
 * Standardizes layout handling and networking requests natively.
 */
function renderCart() {
    const container = document.getElementById('cartContent');
    if (!cartItems || cartItems.length === 0) {
        container.innerHTML = `
      <div class="empty-cart">
        <h2>Your cart is empty</h2>
        <p>Looks like you haven't added anything for try-on yet.</p>
        <p><br/><a href="index.html">← Continue Shopping</a></p>
      </div>
    `;
        return;
    }

    const storeGroups = {};
    cartItems.forEach(item => {
        const sId = item.store_id || 'unknown';
        if (!storeGroups[sId]) {
            storeGroups[sId] = {
                store_id: sId,
                store_name: item.store_name || 'Unknown Store',
                items: []
            };
        }
        storeGroups[sId].items.push(item);
    });

    container.innerHTML = '';

    for (const sId in storeGroups) {
        const group = storeGroups[sId];
        const groupEl = document.createElement('div');
        groupEl.className = 'store-group';

        let itemsHtml = '';
        group.items.forEach(item => {
            const imgSrc = item.images || 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 200 200%22><rect fill=%22%23eee%22 width=%22200%22 height=%22200%22/></svg>';
            itemsHtml += `
        <div class="cart-item">
          <img class="cart-item-img" src="${imgSrc}" alt="${item.title}">
          <div class="cart-item-details">
            <h4 class="cart-item-title">${item.title}</h4>
            <p class="cart-item-price">$${item.price.toFixed(2)}</p>
            <button class="remove-btn" onclick="removeFromCart(${item.id})">Remove</button>
          </div>
        </div>
      `;
        });

        groupEl.innerHTML = `
      <div class="store-header">
        <h3 class="store-name">${group.store_name}</h3>
      </div>
      <div class="cart-items">
        ${itemsHtml}
      </div>
      <div class="store-actions">
        <button class="btn-reserve-bundle" onclick="openReserveModal('${group.store_id}', '${group.store_name}')">
          Reserve ${group.items.length} item${group.items.length !== 1 ? 's' : ''} for try-on
        </button>
      </div>
    `;
        container.appendChild(groupEl);
    }
}

/**
 * Core Client Function: removeFromCart
 * Standardizes layout handling and logical rendering parameters natively.
 */
/**
 * Core Client Function: removeFromCart
 * Standardizes layout handling and networking requests natively.
 */
async function removeFromCart(productId) {
    try {
        const res = await fetch(`/api/cart/${productId}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to remove');

        cartItems = cartItems.filter(p => p.id !== productId);
        renderCart();
        showCustomNotification('Removed', 'Item removed from cart', 'success');
    } catch (err) {
        console.error(err);
        showCustomNotification('Error', 'Could not remove item', 'error');
    }
}

/**
 * Core Client Function: openReserveModal
 * Standardizes layout handling and logical rendering parameters natively.
 */
/**
 * Core Client Function: openReserveModal
 * Standardizes layout handling and networking requests natively.
 */
async function openReserveModal(storeId, storeName) {
    currentReservingStoreId = storeId;
    currentReservingStoreName = storeName;
    document.getElementById('reserveDate').value = '';
    document.getElementById('reserveModalTitle').textContent = `Reserve at ${storeName}`;
    document.getElementById('reserveModal').classList.add('open');    try { const res = await fetch(`/api/shops/${storeId}`); window.currentStoreHours = (await res.json()).hours; document.getElementById('reserveTime').innerHTML = '<option value="">Select a date first</option>'; } catch(e){} } window.updateReserveTimes = function() { const dateVal = document.getElementById('reserveDate').value; const timeSelect = document.getElementById('reserveTime'); timeSelect.innerHTML = ''; if (!dateVal || !window.currentStoreHours) return; const date = new Date(dateVal + 'T00:00:00'); const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']; let dayHours = window.currentStoreHours[days[date.getDay()]]; if (!dayHours || dayHours.toLowerCase().includes('closed')) { timeSelect.innerHTML = '<option value="">Store Closed</option>'; return; } const times = window.generateTimesFromRange(dayHours); times.forEach(t => { const opt = document.createElement('option'); opt.value = t; opt.textContent = t; timeSelect.appendChild(opt); }); }; window.generateTimesFromRange = function(rangeStr) { const parts = rangeStr.split('-'); if (parts.length !== 2) return []; let start = window.parseTime(parts[0].trim()); let end = window.parseTime(parts[1].trim()); let times = []; for (let h = start; h <= end; h += 1) { let ampm = h >= 12 && h < 24 ? 'PM' : 'AM'; let mth = window.Math || Math; let displayH = mth.floor(h) % 12; if (displayH === 0) displayH = 12; let pMins = (mth.abs(h % 1) >= 0.5) ? ':30' : ':00'; times.push(`${displayH}${pMins} ${ampm}`); } return times; }; window.parseTime = function(timeStr) { const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i); if (!match) return 0; let h = parseInt(match[1], 10); const m = parseInt(match[2], 10); const ampm = match[3].toUpperCase(); if (ampm === 'PM' && h !== 12) h += 12; if (ampm === 'AM' && h === 12) h = 0; return h + (m / 60); }; window.currentStoreHours = null; if (false) {
}

/**
 * Core Client Function: closeReserveModal
 * Standardizes layout handling and logical rendering parameters natively.
 */
/**
 * Core Client Function: closeReserveModal
 * Standardizes layout handling and networking requests natively.
 */
function closeReserveModal() {
    document.getElementById('reserveModal').classList.remove('open');
    currentReservingStoreId = null;
    currentReservingStoreName = null;
}

/**
 * Core Client Function: submitStoreReservation
 * Standardizes layout handling and logical rendering parameters natively.
 */
/**
 * Core Client Function: submitStoreReservation
 * Standardizes layout handling and networking requests natively.
 */
async function submitStoreReservation() {
    const dateEl = document.getElementById('reserveDate');
    const timeEl = document.getElementById('reserveTime');
    const preferredDate = dateEl.value;
    const preferredTime = timeEl.value;

    if (!preferredDate) {
        showCustomNotification('Missing Date', 'Please choose a date to visit the store.', 'error');
        return;
    }

    const itemsToReserve = cartItems.filter(item => String(item.store_id) === String(currentReservingStoreId)).map(p => ({
        productId: p.id,
        productTitle: p.title,
        quantity: 1,
        priceAtReservation: p.price,
        image: p.images
    }));

    if (itemsToReserve.length === 0) return;

    try {
        const payload = {
            store_id: currentReservingStoreId,
            store_name: currentReservingStoreName,
            items: itemsToReserve,
            preferredDate,
            preferredTime
        };

        closeReserveModal();

        const res = await fetch('/api/reservations/bundle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) {
            showCustomNotification('Reservation Error', data.error || 'Could not reserve items.', 'error');
            return;
        }

        const reservedIds = itemsToReserve.map(i => i.productId);
        for (const rid of reservedIds) {
            await fetch(`/api/cart/${rid}`, { method: 'DELETE' });
        }

        cartItems = cartItems.filter(p => p.store_id !== currentReservingStoreId);
        renderCart();

        showCustomNotification('Success!', 'Your items have been reserved for try-on!', 'success');
    } catch (err) {
        console.error('Bundle reserve error:', err);
        showCustomNotification('Error', 'Failed to submit reservation.', 'error');
    }
}
