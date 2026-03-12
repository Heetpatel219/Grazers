document.addEventListener('DOMContentLoaded', () => {
    loadCartPage();

    const today = new Date().toISOString().slice(0, 10);
    document.getElementById('reserveDate').setAttribute('min', today);

    document.getElementById('reserveModalCancel').addEventListener('click', closeReserveModal);
    document.getElementById('reserveModalSubmit').addEventListener('click', submitStoreReservation);
});

let cartItems = [];
let currentReservingStoreId = null;
let currentReservingStoreName = null;

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

    // Group items by store
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

async function removeFromCart(productId) {
    try {
        const res = await fetch(`/api/cart/${productId}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to remove');

        // Optimistically update
        cartItems = cartItems.filter(p => p.id !== productId);
        renderCart();
        showCustomNotification('Removed', 'Item removed from cart', 'success');
    } catch (err) {
        console.error(err);
        showCustomNotification('Error', 'Could not remove item', 'error');
    }
}

function openReserveModal(storeId, storeName) {
    currentReservingStoreId = storeId;
    currentReservingStoreName = storeName;
    document.getElementById('reserveDate').value = '';
    document.getElementById('reserveModalTitle').textContent = `Reserve at ${storeName}`;
    document.getElementById('reserveModal').classList.add('open');
}

function closeReserveModal() {
    document.getElementById('reserveModal').classList.remove('open');
    currentReservingStoreId = null;
    currentReservingStoreName = null;
}

async function submitStoreReservation() {
    const dateEl = document.getElementById('reserveDate');
    const timeEl = document.getElementById('reserveTime');
    const preferredDate = dateEl.value;
    const preferredTime = timeEl.value;

    if (!preferredDate) {
        showCustomNotification('Missing Date', 'Please choose a date to visit the store.', 'error');
        return;
    }

    // Get items for this store by converting both values to strings
    const itemsToReserve = cartItems.filter(item => String(item.store_id) === String(currentReservingStoreId)).map(p => ({
        productId: p.id,
        productTitle: p.title,
        quantity: 1,
        priceAtReservation: p.price,
        image: p.images
    }));

    if (itemsToReserve.length === 0) return;

    try {
        // Send the bundle to the new reservation endpoint
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

        // Success! Remove reserved items from cart locally
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
