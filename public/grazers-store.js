// grazers-store.js — Pure client-side API layer (no server/MongoDB required)
// Intercepts all fetch('/api/...') and other backend calls, serving data from
// window.GRAZERS_PRODUCTS, window.GRAZERS_SHOPS, and localStorage.

(function () {
  'use strict';

  // ─── Storage helpers ──────────────────────────────────────────────────────

  function ls(key, fallback) {
    try { const v = localStorage.getItem(key); return v === null ? fallback : JSON.parse(v); }
    catch (e) { return fallback; }
  }
  function lsSet(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }

  // ─── Demo users ───────────────────────────────────────────────────────────

  const DEMO_USERS = [
    {
      _id: 'u_customer',
      email: 'customer@example.com',
      password: 'password',
      name: 'Demo Customer',
      isOwner: false,
      loyaltyPoints: 350,
      createdAt: '2024-01-15T00:00:00Z'
    },
    {
      _id: 'u_owner',
      email: 'owner@example.com',
      password: 'password',
      name: 'Demo Owner',
      isOwner: true,
      loyaltyPoints: 0,
      createdAt: '2024-01-10T00:00:00Z'
    }
  ];

  // Initialise user registry from localStorage (includes signed-up accounts)
  function getUsers() {
    const stored = ls('grazers_users', []);
    // Merge demo users in (by email – stored takes priority so edits persist)
    const map = {};
    DEMO_USERS.forEach(u => { map[u.email] = { ...u }; });
    stored.forEach(u => { map[u.email] = { ...u }; });
    return Object.values(map);
  }
  function saveUsers(users) {
    // Only persist non-demo users (or overridden demos) to localStorage
    lsSet('grazers_users', users);
  }

  // ─── Session (current logged-in user) ─────────────────────────────────────

  function getSession() { return ls('grazers_session', null); }
  function setSession(user) {
    if (!user) { localStorage.removeItem('grazers_session'); return; }
    lsSet('grazers_session', { _id: user._id, email: user.email, name: user.name, isOwner: user.isOwner, loyaltyPoints: user.loyaltyPoints, createdAt: user.createdAt });
  }

  // ─── Per-user data helpers ─────────────────────────────────────────────────

  function getUserKey(userId, suffix) { return 'grazers_' + userId + '_' + suffix; }

  function getFavoriteIds(userId) { return ls(getUserKey(userId, 'favorites'), []); }
  function setFavoriteIds(userId, ids) { lsSet(getUserKey(userId, 'favorites'), ids); }

  function getCartIds(userId) { return ls(getUserKey(userId, 'cart'), []); }
  function setCartIds(userId, ids) { lsSet(getUserKey(userId, 'cart'), ids); }

  function getReservations(userId) { return ls(getUserKey(userId, 'reservations'), []); }
  function setReservations(userId, rsvs) { lsSet(getUserKey(userId, 'reservations'), rsvs); }

  // Global reservations store (owner can see all)
  function getAllReservations() { return ls('grazers_all_reservations', []); }
  function setAllReservations(rsvs) { lsSet('grazers_all_reservations', rsvs); }

  // Reviews store
  function getReviews() { return ls('grazers_reviews', []); }
  function setReviews(r) { lsSet('grazers_reviews', r); }

  // Products override (owner edits)
  function getProductOverrides() { return ls('grazers_product_overrides', {}); }
  function setProductOverride(id, data) {
    const o = getProductOverrides();
    o[String(id)] = { ...(o[String(id)] || {}), ...data };
    lsSet('grazers_product_overrides', o);
  }

  // ─── Product helpers ───────────────────────────────────────────────────────

  function getProducts() {
    const base = (window.GRAZERS_PRODUCTS || []);
    const overrides = getProductOverrides();
    return base.map(p => {
      const over = overrides[String(p.id)];
      return over ? { ...p, ...over } : p;
    });
  }

  function getShops() {
    const shops = (window.GRAZERS_SHOPS || []);
    const products = getProducts();
    return shops.map(shop => {
      const count = products.filter(p => p.store_id === shop.store_id).length;
      return { ...shop, productCount: count };
    });
  }

  // ─── Response builder ──────────────────────────────────────────────────────

  function jsonResponse(data, status) {
    const body = JSON.stringify(data);
    return new Response(body, {
      status: status || 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // ─── Loyalty rewards catalogue ─────────────────────────────────────────────

  const REWARDS = [
    { id: 'r1', name: '5% Off Next Purchase', points: 100 },
    { id: 'r2', name: 'Free Shipping', points: 200 },
    { id: 'r3', name: '10% Off Next Purchase', points: 300 },
    { id: 'r4', name: '$20 Store Credit', points: 500 },
    { id: 'r5', name: 'Exclusive Member Badge', points: 1000 }
  ];

  // ─── Analytics helpers ─────────────────────────────────────────────────────

  function buildAnalytics(storeName) {
    const allRsvs = getAllReservations();
    const storeRsvs = allRsvs.filter(r => (r.store_name || '').toLowerCase() === storeName.toLowerCase());
    const products = getProducts().filter(p => (p.store_name || '').toLowerCase() === storeName.toLowerCase());
    const reviews = getReviews().filter(r => (r.storeName || '').toLowerCase() === storeName.toLowerCase());

    const today = new Date(); today.setHours(0, 0, 0, 0);

    const confirmedRsvs = storeRsvs.filter(r => r.status === 'confirmed');
    const todayConfirmed = confirmedRsvs.filter(r => {
      const d = new Date(r.confirmedAt || r.createdAt || 0);
      return d >= today;
    });

    const grossRevenueToday = todayConfirmed.reduce((s, r) => {
      const items = r.items || [];
      return s + items.reduce((a, i) => a + (i.priceAtReservation || 0) * (i.quantity || 1), 0);
    }, 0);

    const totalInventory = products.reduce((s, p) => s + (p.quantity || 0), 0);
    const inventoryByCategory = {};
    products.forEach(p => {
      const cat = p.category || 'other';
      inventoryByCategory[cat] = (inventoryByCategory[cat] || 0) + (p.quantity || 0);
    });

    const activeReservations = storeRsvs.filter(r => r.status === 'pending').length;
    const todayExpected = storeRsvs.filter(r => {
      if (!r.preferredDate) return false;
      const d = new Date(r.preferredDate + 'T00:00:00');
      const t = new Date(); t.setHours(0, 0, 0, 0);
      return d.getTime() === t.getTime();
    }).length;

    // Top products by reservation count
    const productResCounts = {};
    storeRsvs.forEach(r => {
      (r.items || []).forEach(i => {
        productResCounts[i.productTitle] = (productResCounts[i.productTitle] || 0) + (i.quantity || 1);
      });
    });
    const topProducts = Object.entries(productResCounts)
      .map(([title, reservedQty]) => ({ title, reservedQty }))
      .sort((a, b) => b.reservedQty - a.reservedQty)
      .slice(0, 5);

    const latestReviews = reviews.slice(-5).reverse().map(r => ({
      ...r, _id: r.id, userName: r.userName || 'Customer'
    }));

    return {
      grossRevenueToday,
      reservationCount: storeRsvs.length,
      totalInventory,
      inventoryByCategory,
      activeReservations,
      confirmedToday: todayConfirmed.length,
      expectedFootTrafficToday: todayExpected,
      topProducts,
      latestReviews
    };
  }

  function buildRevenueChart(storeName, period) {
    const allRsvs = getAllReservations();
    const confirmedRsvs = allRsvs.filter(
      r => (r.store_name || '').toLowerCase() === storeName.toLowerCase() && r.status === 'confirmed'
    );

    const now = new Date();
    let buckets = [];
    if (period === 'week') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
        buckets.push({ label: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }), date: d, revenue: 0 });
      }
      confirmedRsvs.forEach(r => {
        const d = new Date(r.confirmedAt || r.createdAt || 0); d.setHours(0, 0, 0, 0);
        const b = buckets.find(bk => bk.date.getTime() === d.getTime());
        if (b) {
          b.revenue += (r.items || []).reduce((s, i) => s + (i.priceAtReservation || 0) * (i.quantity || 1), 0);
        }
      });
    } else if (period === 'month') {
      for (let i = 3; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        buckets.push({ label: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }), month: d.getMonth(), year: d.getFullYear(), revenue: 0 });
      }
      confirmedRsvs.forEach(r => {
        const d = new Date(r.confirmedAt || r.createdAt || 0);
        const b = buckets.find(bk => bk.month === d.getMonth() && bk.year === d.getFullYear());
        if (b) b.revenue += (r.items || []).reduce((s, i) => s + (i.priceAtReservation || 0) * (i.quantity || 1), 0);
      });
    } else {
      for (let i = 2; i >= 0; i--) {
        const yr = now.getFullYear() - i;
        buckets.push({ label: String(yr), year: yr, revenue: 0 });
      }
      confirmedRsvs.forEach(r => {
        const d = new Date(r.confirmedAt || r.createdAt || 0);
        const b = buckets.find(bk => bk.year === d.getFullYear());
        if (b) b.revenue += (r.items || []).reduce((s, i) => s + (i.priceAtReservation || 0) * (i.quantity || 1), 0);
      });
    }

    return { data: buckets.map(b => ({ label: b.label, revenue: b.revenue })) };
  }

  // ─── Main request router ───────────────────────────────────────────────────

  async function handleRequest(url, options) {
    const method = (options && options.method ? options.method : 'GET').toUpperCase();
    const body = options && options.body ? JSON.parse(options.body) : null;

    // Parse URL + query params
    let pathname = url;
    let search = '';
    try {
      const parsed = new URL(url, window.location.origin);
      pathname = parsed.pathname;
      search = parsed.search;
    } catch (e) {
      const qi = url.indexOf('?');
      if (qi !== -1) { pathname = url.slice(0, qi); search = url.slice(qi); }
    }
    const params = new URLSearchParams(search);
    const session = getSession();

    // ── POST /signin ──────────────────────────────────────────────────────────
    if (pathname === '/signin' && method === 'POST') {
      const { email, password } = body || {};
      const users = getUsers();
      const user = users.find(u => u.email === email && u.password === password);
      if (!user) return jsonResponse({ message: 'Invalid email or password' }, 401);
      setSession(user);
      return jsonResponse({ message: 'Signed in successfully', isOwner: user.isOwner, userName: user.name });
    }

    // ── POST /signup ───────────────────────────────────────────────────────────
    if (pathname === '/signup' && method === 'POST') {
      const { name, email, password, isOwner, phone, address } = body || {};
      if (!name || !email || !password) return jsonResponse({ message: 'Name, email, and password are required' }, 400);
      const users = getUsers();
      if (users.find(u => u.email === email)) return jsonResponse({ message: 'Email already registered' }, 400);
      const newUser = {
        _id: 'u_' + Date.now(),
        name, email, password,
        isOwner: !!isOwner,
        phone: phone || '',
        address: address || '',
        loyaltyPoints: 0,
        createdAt: new Date().toISOString()
      };
      // Persist
      const stored = ls('grazers_users', []);
      stored.push(newUser);
      saveUsers(stored);
      return jsonResponse({ message: 'Account created! Please sign in.' });
    }

    // ── POST /logout ──────────────────────────────────────────────────────────
    if (pathname === '/logout' && method === 'POST') {
      setSession(null);
      return jsonResponse({ message: 'Logged out' });
    }

    // ── GET /api/check-auth ───────────────────────────────────────────────────
    if (pathname === '/api/check-auth' && method === 'GET') {
      if (!session) return jsonResponse({ isLoggedIn: false });
      return jsonResponse({ isLoggedIn: true, isOwner: session.isOwner, userName: session.name });
    }

    // ── GET /api/profile ──────────────────────────────────────────────────────
    if (pathname === '/api/profile' && method === 'GET') {
      if (!session) return jsonResponse({ error: 'Unauthorized' }, 401);
      const favIds = getFavoriteIds(session._id);
      const products = getProducts();
      const favProducts = favIds.map(id => products.find(p => p.id === id)).filter(Boolean);
      return jsonResponse({
        _id: session._id,
        name: session.name,
        email: session.email,
        isOwner: session.isOwner,
        loyaltyPoints: session.loyaltyPoints || 0,
        createdAt: session.createdAt,
        favoriteProducts: favProducts
      });
    }

    // ── GET /api/products ─────────────────────────────────────────────────────
    if (pathname === '/api/products' && method === 'GET') {
      let products = getProducts();
      const shop = params.get('shop');
      const q = params.get('q');
      const category = params.get('category');
      const featured = params.get('featured');

      if (shop) products = products.filter(p => p.store_id === shop || p.store_name === shop);
      if (q) {
        const lq = q.toLowerCase();
        products = products.filter(p =>
          (p.title || '').toLowerCase().includes(lq) ||
          (p.category || '').toLowerCase().includes(lq) ||
          (p.store_name || '').toLowerCase().includes(lq) ||
          (p.keywords || []).some(k => k.toLowerCase().includes(lq))
        );
      }
      if (category) products = products.filter(p => (p.category || '').toLowerCase() === category.toLowerCase());
      if (featured === 'true') products = products.filter(p => p.is_featured);

      return jsonResponse(products);
    }

    // ── GET /api/products/:id ─────────────────────────────────────────────────
    const productDetailMatch = pathname.match(/^\/api\/products\/(\d+)$/);
    if (productDetailMatch && method === 'GET') {
      const id = parseInt(productDetailMatch[1], 10);
      const products = getProducts();
      const product = products.find(p => p.id === id);
      if (!product) return jsonResponse({ error: 'Product not found' }, 404);

      const reviews = getReviews();
      const productReviews = reviews.filter(r => r.productId === id && r.type === 'product');
      const storeReviews = reviews.filter(r => r.store_id === product.store_id && r.type === 'store');

      const avgRating = (arr) => {
        if (!arr.length) return null;
        return { average: arr.reduce((s, r) => s + r.rating, 0) / arr.length, count: arr.length };
      };

      const related = products.filter(p =>
        p.id !== id && (p.store_id === product.store_id || p.category === product.category)
      ).slice(0, 6);

      const isStoreOwner = session && session.isOwner;

      return jsonResponse({
        product,
        inventoryLeft: product.quantity || 0,
        productRating: avgRating(productReviews),
        storeRating: avgRating(storeReviews),
        productReviews: productReviews.slice(-5).reverse(),
        storeReviews: storeReviews.slice(-5).reverse(),
        relatedProducts: related,
        isStoreOwner
      });
    }

    // ── PUT /api/products/:id ─────────────────────────────────────────────────
    const productPutMatch = pathname.match(/^\/api\/products\/(\d+)$/);
    if (productPutMatch && method === 'PUT') {
      if (!session || !session.isOwner) return jsonResponse({ error: 'Unauthorized' }, 401);
      const id = parseInt(productPutMatch[1], 10);
      const { price, title, description, keywords } = body || {};
      const updated = {};
      if (price !== undefined) updated.price = parseFloat(price) || 0;
      if (title !== undefined) updated.title = title;
      if (description !== undefined) updated.description = description;
      if (keywords !== undefined) updated.keywords = keywords;
      setProductOverride(id, updated);
      const products = getProducts();
      const product = products.find(p => p.id === id);
      return jsonResponse(product || {});
    }

    // ── POST /api/products/:id/reviews ────────────────────────────────────────
    const productReviewMatch = pathname.match(/^\/api\/products\/(\d+)\/reviews$/);
    if (productReviewMatch && method === 'POST') {
      if (!session) return jsonResponse({ error: 'Unauthorized' }, 401);
      const id = parseInt(productReviewMatch[1], 10);
      const { rating, comment } = body || {};
      const reviews = getReviews();
      reviews.push({
        id: 'rv_' + Date.now(),
        type: 'product',
        productId: id,
        rating: Number(rating) || 1,
        comment: comment || '',
        userName: session.name || 'Customer',
        createdAt: new Date().toISOString()
      });
      setReviews(reviews);
      return jsonResponse({ message: 'Review submitted' });
    }

    // ── GET /api/shops-from-products ──────────────────────────────────────────
    if (pathname === '/api/shops-from-products' && method === 'GET') {
      return jsonResponse(getShops());
    }

    // ── GET /api/shops/:storeId ───────────────────────────────────────────────
    const shopDetailMatch = pathname.match(/^\/api\/shops\/([^/]+)$/);
    if (shopDetailMatch && method === 'GET') {
      const storeId = decodeURIComponent(shopDetailMatch[1]);
      const shops = getShops();
      const shop = shops.find(s => s.store_id === storeId || s.name === storeId);
      if (!shop) return jsonResponse({ error: 'Shop not found' }, 404);
      return jsonResponse(shop);
    }

    // ── GET /api/favorites ────────────────────────────────────────────────────
    if (pathname === '/api/favorites' && method === 'GET') {
      if (!session) return jsonResponse({ error: 'Unauthorized' }, 401);
      return jsonResponse({ favoriteIds: getFavoriteIds(session._id) });
    }

    // ── POST /api/favorites ───────────────────────────────────────────────────
    if (pathname === '/api/favorites' && method === 'POST') {
      if (!session) return jsonResponse({ error: 'Unauthorized' }, 401);
      const { productId } = body || {};
      const ids = getFavoriteIds(session._id);
      const numId = Number(productId);
      if (!ids.includes(numId)) ids.push(numId);
      setFavoriteIds(session._id, ids);
      return jsonResponse({ favoriteIds: ids });
    }

    // ── DELETE /api/favorites/:id ─────────────────────────────────────────────
    const favDeleteMatch = pathname.match(/^\/api\/favorites\/(\d+)$/);
    if (favDeleteMatch && method === 'DELETE') {
      if (!session) return jsonResponse({ error: 'Unauthorized' }, 401);
      const numId = parseInt(favDeleteMatch[1], 10);
      let ids = getFavoriteIds(session._id);
      ids = ids.filter(id => id !== numId);
      setFavoriteIds(session._id, ids);
      return jsonResponse({ favoriteIds: ids });
    }

    // ── GET /api/cart ─────────────────────────────────────────────────────────
    if (pathname === '/api/cart' && method === 'GET') {
      if (!session) return jsonResponse({ error: 'Unauthorized' }, 401);
      const cartIds = getCartIds(session._id);
      const products = getProducts();
      const cartItems = cartIds.map(id => products.find(p => p.id === id)).filter(Boolean);
      return jsonResponse(cartItems);
    }

    // ── POST /api/cart ────────────────────────────────────────────────────────
    if (pathname === '/api/cart' && method === 'POST') {
      if (!session) return jsonResponse({ error: 'Unauthorized' }, 401);
      const { productId } = body || {};
      const numId = Number(productId);
      const ids = getCartIds(session._id);
      if (!ids.includes(numId)) ids.push(numId);
      setCartIds(session._id, ids);
      return jsonResponse({ cartIds: ids });
    }

    // ── DELETE /api/cart/:id ──────────────────────────────────────────────────
    const cartDeleteMatch = pathname.match(/^\/api\/cart\/(\d+)$/);
    if (cartDeleteMatch && method === 'DELETE') {
      if (!session) return jsonResponse({ error: 'Unauthorized' }, 401);
      const numId = parseInt(cartDeleteMatch[1], 10);
      let ids = getCartIds(session._id);
      ids = ids.filter(id => id !== numId);
      setCartIds(session._id, ids);
      return jsonResponse({ cartIds: ids });
    }

    // ── GET /api/my-reservations ──────────────────────────────────────────────
    if (pathname === '/api/my-reservations' && method === 'GET') {
      if (!session) return jsonResponse({ error: 'Unauthorized' }, 401);
      return jsonResponse(getReservations(session._id));
    }

    // ── POST /api/reservations/bundle ─────────────────────────────────────────
    if (pathname === '/api/reservations/bundle' && method === 'POST') {
      if (!session) return jsonResponse({ error: 'Unauthorized' }, 401);
      const { store_id, store_name, items, preferredDate, preferredTime } = body || {};
      const newRsv = {
        _id: 'rsv_' + Date.now(),
        userId: session._id,
        userName: session.name,
        store_id, store_name,
        items: items || [],
        productTitle: (items || []).map(i => i.productTitle).join(', '),
        preferredDate, preferredTime,
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      // Save to user's list
      const userRsvs = getReservations(session._id);
      userRsvs.push(newRsv);
      setReservations(session._id, userRsvs);

      // Save to global list
      const allRsvs = getAllReservations();
      allRsvs.push(newRsv);
      setAllReservations(allRsvs);

      // Award loyalty points (1 per $1)
      const totalSpend = (items || []).reduce((s, i) => s + (i.priceAtReservation || 0) * (i.quantity || 1), 0);
      const pointsToAdd = Math.floor(totalSpend);
      if (pointsToAdd > 0) {
        const currentSession = getSession();
        if (currentSession) {
          currentSession.loyaltyPoints = (currentSession.loyaltyPoints || 0) + pointsToAdd;
          setSession(currentSession);
        }
      }

      return jsonResponse({ message: 'Reservation submitted', reservation: newRsv });
    }

    // ── GET /api/owner/reservations ───────────────────────────────────────────
    if (pathname === '/api/owner/reservations' && method === 'GET') {
      if (!session || !session.isOwner) return jsonResponse({ error: 'Unauthorized' }, 401);
      const storeName = params.get('storeName') || '';
      const allRsvs = getAllReservations();
      const storeRsvs = storeName
        ? allRsvs.filter(r => (r.store_name || '').toLowerCase() === storeName.toLowerCase())
        : allRsvs;
      return jsonResponse(storeRsvs.slice().reverse());
    }

    // ── POST /api/owner/reservations/:id/confirm ──────────────────────────────
    const confirmMatch = pathname.match(/^\/api\/owner\/reservations\/([^/]+)\/confirm$/);
    if (confirmMatch && method === 'POST') {
      if (!session || !session.isOwner) return jsonResponse({ error: 'Unauthorized' }, 401);
      const rsvId = confirmMatch[1];
      const allRsvs = getAllReservations();
      const idx = allRsvs.findIndex(r => r._id === rsvId);
      if (idx === -1) return jsonResponse({ error: 'Reservation not found' }, 404);
      allRsvs[idx].status = 'confirmed';
      allRsvs[idx].confirmedAt = new Date().toISOString();
      setAllReservations(allRsvs);

      // Also update in the user's personal list
      const userId = allRsvs[idx].userId;
      if (userId) {
        const userRsvs = getReservations(userId);
        const uidx = userRsvs.findIndex(r => r._id === rsvId);
        if (uidx !== -1) {
          userRsvs[uidx].status = 'confirmed';
          userRsvs[uidx].confirmedAt = allRsvs[idx].confirmedAt;
          setReservations(userId, userRsvs);
        }
      }

      return jsonResponse({ message: 'Confirmed' });
    }

    // ── GET /api/owner/analytics ──────────────────────────────────────────────
    if (pathname === '/api/owner/analytics' && method === 'GET') {
      if (!session || !session.isOwner) return jsonResponse({ error: 'Unauthorized' }, 401);
      const storeName = params.get('storeName') || '';
      return jsonResponse(buildAnalytics(storeName));
    }

    // ── GET /api/owner/revenue ────────────────────────────────────────────────
    if (pathname === '/api/owner/revenue' && method === 'GET') {
      if (!session || !session.isOwner) return jsonResponse({ error: 'Unauthorized' }, 401);
      const storeName = params.get('storeName') || '';
      const period = params.get('period') || 'week';
      return jsonResponse(buildRevenueChart(storeName, period));
    }

    // ── GET /api/loyalty/rewards ──────────────────────────────────────────────
    if (pathname === '/api/loyalty/rewards' && method === 'GET') {
      return jsonResponse(REWARDS);
    }

    // ── POST /api/loyalty/redeem ──────────────────────────────────────────────
    if (pathname === '/api/loyalty/redeem' && method === 'POST') {
      if (!session) return jsonResponse({ error: 'Unauthorized' }, 401);
      const { rewardId } = body || {};
      const reward = REWARDS.find(r => r.id === rewardId);
      if (!reward) return jsonResponse({ error: 'Reward not found' }, 404);
      const currentPts = session.loyaltyPoints || 0;
      if (currentPts < reward.points) return jsonResponse({ error: 'Insufficient points' }, 400);
      const newPts = currentPts - reward.points;
      const updated = { ...session, loyaltyPoints: newPts };
      setSession(updated);
      return jsonResponse({ message: 'Redeemed!', points: newPts });
    }

    // ── POST /api/stores/:storeId/reviews ─────────────────────────────────────
    const storeReviewMatch = pathname.match(/^\/api\/stores\/([^/]+)\/reviews$/);
    if (storeReviewMatch && method === 'POST') {
      if (!session) return jsonResponse({ error: 'Unauthorized' }, 401);
      const storeId = decodeURIComponent(storeReviewMatch[1]);
      const { rating, comment, storeName } = body || {};
      const reviews = getReviews();
      reviews.push({
        id: 'rv_' + Date.now(),
        type: 'store',
        store_id: storeId,
        storeName: storeName || storeId,
        rating: Number(rating) || 1,
        comment: comment || '',
        userName: session.name || 'Customer',
        createdAt: new Date().toISOString()
      });
      setReviews(reviews);
      return jsonResponse({ message: 'Store review submitted' });
    }

    // ── POST /api/reviews/:id/reply ───────────────────────────────────────────
    const reviewReplyMatch = pathname.match(/^\/api\/reviews\/([^/]+)\/reply$/);
    if (reviewReplyMatch && method === 'POST') {
      if (!session || !session.isOwner) return jsonResponse({ error: 'Unauthorized' }, 401);
      const reviewId = decodeURIComponent(reviewReplyMatch[1]);
      const { reply } = body || {};
      const reviews = getReviews();
      const idx = reviews.findIndex(r => r.id === reviewId);
      if (idx !== -1) {
        reviews[idx].storeReply = reply;
        setReviews(reviews);
      }
      return jsonResponse({ message: 'Reply saved' });
    }

    // ── Not matched — pass through to real fetch ───────────────────────────────
    return null;
  }

  // ─── Fetch interceptor ─────────────────────────────────────────────────────

  const _realFetch = window.fetch.bind(window);

  window.fetch = async function (input, options) {
    const url = typeof input === 'string' ? input : (input && input.url ? input.url : String(input));

    // Only intercept same-origin API and auth paths
    const isApiPath = /^\/(api|signin|signup|logout)/.test(url) ||
      /^https?:\/\/[^/]*(\/api|\/signin|\/signup|\/logout)/.test(url);

    if (!isApiPath) return _realFetch(input, options);

    try {
      const response = await handleRequest(url, options);
      if (response !== null) return response;
    } catch (err) {
      console.error('[grazers-store] Handler error:', err);
    }

    // Fallback to real fetch (e.g. Vercel serverless)
    return _realFetch(input, options);
  };

  console.log('[Grazers] Client-side store loaded. MongoDB not required.');

})();
