// =============================================
// SECCIÓN OFERTAS — Configuración central
// =============================================
// Para agregar/quitar productos de Ofertas o cambiar descuentos,
// edita este objeto. discountPct = porcentaje de descuento de la sección.
const OFERTAS_CONFIG = {
    discountPct: 15,   // <-- cambia aquí el % de descuento global de Ofertas
    products: [
        // Para agregar: copia cualquier bloque y cambia los valores.
        // Para quitar: elimina el bloque completo.
        // "sizes" solo aplica a productos de ropa (camisetas, jeans).
        // Para productos sin talla (tenis, cascos, deportes) pon sizes: null
        {
            id: 'oferta-camiseta-1',
            name: 'Camiseta Brasil Retro',
            basePrice: 99000,
            image: 'CamisetaBrasil.png',
            category: 'camisetas',
            sizes: ['S','M','L','XL'],
            description: 'Camiseta oficial Adidas edición Brasil. Tejido técnico de alta respirabilidad.'
        },
        {
            id: 'oferta-tenis-1',
            name: 'Tenis Adidas Ultraboost',
            basePrice: 340000,
            image: 'Adidas-Ultraboost.png',
            category: 'tenis',
            sizes: ['36','37','38','39','40','41','42','43','44'],
            description: 'El tenis más cómodo de Adidas. Suela Boost para máxima amortiguación.'
        },
        {
            id: 'oferta-camiseta-2',
            name: 'Camiseta Adidas Madrid',
            basePrice: 87400,
            image: 'Camiseta_adidas_Madrid.png',
            category: 'camisetas',
            sizes: ['S','M','L','XL'],
            description: 'Camiseta oficial Real Madrid Adidas. Diseño elegante para hincha y casual.'
        },
        {
            id: 'oferta-jeans-1',
            name: 'Jeans ',
            basePrice: 88900,
            image: 'Jeans moderno ll.png',
            category: 'jeans',
            sizes: ['28','30','32','34'],
            description: 'Jeans de corte moderno. Ideal para el día a día con estilo urbano.'
        }
    ]
};

// =============================================
// MODAL DE PRODUCTO (talla + precio + descripción)
// =============================================
let _currentModalProduct = null;
let _currentModalSize    = null;

function openProductModal(productData) {
    _currentModalProduct = productData;
    _currentModalSize    = null;

    // Resolve image if null (get from product card in DOM)
    if (!productData.image || productData.image === 'null') {
        productData.image = getProductImage(productData.id) || 'https://via.placeholder.com/300x300?text=Producto';
    }

    const modal = document.getElementById('product-detail-modal');
    if (!modal) return;

    const discountedPrice = productData.salePrice ?? productData.price;
    const originalPrice   = productData.originalPrice ?? null;
    const discountPct     = productData.discountPct ?? 0;
    const sizes           = productData.sizes ?? null;

    // Imagen
    modal.querySelector('#pdm-img').src = productData.image;
    modal.querySelector('#pdm-img').alt = productData.name;

    // Nombre
    modal.querySelector('#pdm-name').textContent = productData.name;

    // Descuento badge
    const badge = modal.querySelector('#pdm-badge');
    if (discountPct > 0) {
        badge.textContent = `-${discountPct}%`;
        badge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
    }

    // Precio
    const priceWrap = modal.querySelector('#pdm-price-wrap');
    if (originalPrice && discountPct > 0) {
        priceWrap.innerHTML = `<span class="pdm-original-price">$${originalPrice.toLocaleString()} COP</span> <span class="pdm-sale-price">$${discountedPrice.toLocaleString()} COP</span>`;
    } else {
        priceWrap.innerHTML = `<span class="pdm-sale-price">$${discountedPrice.toLocaleString()} COP</span>`;
    }

    // Tallas
    const sizesSection = modal.querySelector('#pdm-sizes-section');
    const sizesContainer = modal.querySelector('#pdm-sizes');
    if (sizes && sizes.length > 0) {
        sizesSection.style.display = 'block';
        sizesContainer.innerHTML = sizes.map(s =>
            `<button class="pdm-size-btn" onclick="selectSize(this, '${s}')">${s}</button>`
        ).join('');
    } else {
        sizesSection.style.display = 'none';
        _currentModalSize = 'N/A';
    }

    // Descripción
    const desc = modal.querySelector('#pdm-desc');
    if (productData.description) {
        desc.textContent = productData.description;
        desc.style.display = 'block';
    } else {
        desc.style.display = 'none';
    }

    // Botón Ver carrito
    modal.querySelector('#pdm-view-cart').onclick = () => {
        closeProductModal();
        setTimeout(toggleCart, 100);
    };

    // Botón Agregar
    modal.querySelector('#pdm-add-btn').onclick = () => {
        const hasSizes = sizes && sizes.length > 0;
        if (hasSizes && !_currentModalSize) {
            showNotification('Por favor selecciona una talla');
            return;
        }
        const nameWithSize = hasSizes ? `${productData.name} (${_currentModalSize})` : productData.name;
        const price = productData.salePrice ?? productData.price;
        addToCart(productData.id + (hasSizes ? `-${_currentModalSize}` : ''), nameWithSize, price, productData.image, productData.originalPrice, productData.discountPct);
        closeProductModal();
    };

    modal.style.display = 'flex';
    document.body.classList.add('modal-open');
}

function selectSize(btn, size) {
    document.querySelectorAll('.pdm-size-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    _currentModalSize = size;
}

function closeProductModal() {
    const modal = document.getElementById('product-detail-modal');
    if (modal) modal.style.display = 'none';
    if (!document.querySelector('.modal.show')) {
        document.body.classList.remove('modal-open');
    }
}

// =============================================
// SISTEMA DE DESCUENTOS PROGRESIVO
// =============================================
function calcDiscount(subtotal) {
    if (subtotal >= 900000)  return { pct: 20, amount: Math.round(subtotal * 0.20) };
    if (subtotal >= 600000)  return { pct: 15, amount: Math.round(subtotal * 0.15) };
    if (subtotal >= 400000)  return { pct: 12, amount: Math.round(subtotal * 0.12) };
    if (subtotal >= 250000)  return { pct: 8,  amount: Math.round(subtotal * 0.08) };
    if (subtotal >= 150000)  return { pct: 5,  amount: Math.round(subtotal * 0.05) };
    return { pct: 0, amount: 0 };
}

let cart = [];
let cartTotal = 0;

function moveCarousel(sectionId, direction) {
    const container = document.getElementById(sectionId + '-container');
    if (!container) return;
    const cardWidth = 300;
    container.scrollBy({ left: cardWidth * direction, behavior: 'smooth' });
    hideScrollIndicators(container);
}

function addToCart(productId, productName, price, image = null, originalPrice = null, discountPct = 0) {
    const existingItem = cart.find(item => item.id === productId);
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            id: productId,
            name: productName,
            price: price,
            quantity: 1,
            image: image || getProductImage(productId),
            originalPrice: originalPrice || null,
            discountPct: discountPct || 0
        });
    }
    updateCartDisplay();
    updateCartIcon();
    showNotification(`${productName} agregado al carrito!`);
    checkGiftEligibility();
    saveCart();
}

function removeFromCart(productId) {
    const removedItem = cart.find(item => item.id === productId);

    if (removedItem && removedItem.isGift) {
        window._lastRemovedGiftId = productId;
        clearGiftCardHighlights();
    }

    cart = cart.filter(item => item.id !== productId);

    const subtotalSinRegalo = cart.reduce((sum, i) => sum + (i.isGift ? 0 : i.price * i.quantity), 0);
    if (subtotalSinRegalo < 150000) {
        const giftIndex = cart.findIndex(i => i.isGift === true);
        if (giftIndex !== -1) {
            cart.splice(giftIndex, 1);
            clearGiftCardHighlights();
        }
    }

    updateCartDisplay();
    updateCartIcon();
    checkGiftEligibility();
    saveCart();
}

function updateQuantity(productId, change) {
    const item = cart.find(item => item.id === productId);
    if (item) {
        if (item.isGift && change > 0) {
            showNotification('Solo puedes tener un regalo gratis en tu carrito.');
            return;
        }
        item.quantity += change;
        if (item.quantity <= 0) {
            removeFromCart(productId);
        } else {
            if (item.isGift && item.originalPrice) {
                const subtotal = cart.reduce((sum, item2) => {
                    if (item2.id === productId) return sum;
                    return sum + (item2.price * item2.quantity);
                }, 0);
                const isEligibleForGift = subtotal >= 150000;
                if (isEligibleForGift) {
                    item.price = 0;
                    item.name = item.name.replace(' (REGALO)', '') + ' (REGALO)';
                } else {
                    item.price = item.originalPrice;
                    item.name = item.name.replace(' (REGALO)', '');
                }
                item.isGift = isEligibleForGift;
            }
            updateCartDisplay();
            updateCartIcon();
            checkGiftEligibility();
            saveCart();
        }
    }
}

// =============================================
// CARRITO EN LA NUBE (Firestore)
// =============================================
const _STORE_FS_URL = 'https://firestore.googleapis.com/v1/projects/tiendadeportiva912-b9f0d/databases/(default)/documents/carts';

async function _getFirebaseToken() {
    try {
        const auth = window._firebaseAuth;
        if (!auth || !auth.currentUser) return null;
        return await auth.currentUser.getIdToken();
    } catch(e) { return null; }
}

async function saveCart() {
    try {
        if (cart.length > 0) {
            localStorage.setItem('tienda_cart', JSON.stringify(cart));
            localStorage.setItem('tienda_last_removed_gift', window._lastRemovedGiftId || '');
        } else {
            localStorage.removeItem('tienda_cart');
            localStorage.removeItem('tienda_last_removed_gift');
            window._lastRemovedGiftId = null;
        }
    } catch(e) {}

    const token = await _getFirebaseToken();
    if (!token || !window._currentUser) return;
    const uid = window._currentUser.uid;

    try {
        if (cart.length > 0) {
            await fetch(`${_STORE_FS_URL}/${uid}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ fields: {
                    items:           { stringValue: JSON.stringify(cart) },
                    lastRemovedGift: { stringValue: window._lastRemovedGiftId || '' },
                    updatedAt:       { stringValue: new Date().toISOString() }
                }})
            });
        } else {
            await fetch(`${_STORE_FS_URL}/${uid}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
        }
    } catch(e) {}
}

// Retorna: 'loaded' | 'empty' | 'error'
async function loadCartFromCloud(uid, token) {
    try {
        const res = await fetch(`${_STORE_FS_URL}/${uid}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.status === 404) return 'empty'; // borrado intencionalmente
        if (!res.ok) return 'error';
        const data = await res.json();
        const fields = data.fields || {};
        const itemsStr = fields.items?.stringValue;
        const giftStr  = fields.lastRemovedGift?.stringValue;
        if (itemsStr) {
            const parsed = JSON.parse(itemsStr);
            if (Array.isArray(parsed) && parsed.length > 0) {
                cart = parsed;
                if (giftStr) window._lastRemovedGiftId = giftStr;
                return 'loaded';
            }
        }
        return 'empty';
    } catch(e) { return 'error'; }
}

function loadCart() {
    try {
        const saved = localStorage.getItem('tienda_cart');
        if (saved) cart = JSON.parse(saved);
        const savedGift = localStorage.getItem('tienda_last_removed_gift');
        if (savedGift) window._lastRemovedGiftId = savedGift;
    } catch(e) {}
}

function _initCartAuthSync() {
    if (!window._firebaseAuth) {
        setTimeout(_initCartAuthSync, 300);
        return;
    }
    try {
        const { onAuthStateChanged } = window._firebaseAuthModule || {};
        if (typeof onAuthStateChanged === 'function') {
            onAuthStateChanged(window._firebaseAuth, _handleAuthCartChange);
        } else {
            let lastUid = null;
            setInterval(async () => {
                const user = window._currentUser;
                const uid  = user ? user.uid : null;
                if (uid !== lastUid) {
                    lastUid = uid;
                    await _handleAuthCartChange(user);
                }
            }, 800);
        }
    } catch(e) {
        let lastUid = null;
        setInterval(async () => {
            const user = window._currentUser;
            const uid  = user ? user.uid : null;
            if (uid !== lastUid) {
                lastUid = uid;
                await _handleAuthCartChange(user);
            }
        }, 800);
    }
}

async function _handleAuthCartChange(user) {
    if (user) {
        const token = await _getFirebaseToken();
        if (token) {
            const result = await loadCartFromCloud(user.uid, token);

            if (result === 'loaded') {
                // Nube tiene datos → usarlos, limpiar local
                try {
                    localStorage.removeItem('tienda_cart');
                    localStorage.removeItem('tienda_last_removed_gift');
                } catch(e) {}
            } else if (result === 'empty') {
                // Carrito fue vaciado intencionalmente → respetar
                cart = [];
                window._lastRemovedGiftId = null;
                try {
                    localStorage.removeItem('tienda_cart');
                    localStorage.removeItem('tienda_last_removed_gift');
                } catch(e) {}
            }
            // result === 'error' → no tocar nada (mantener lo que hay)
        }
        updateCartDisplay();
        updateCartIcon();
        const yaHayRegalo = cart.some(i => i.isGift === true);
        if (!yaHayRegalo) checkGiftEligibility();
    } else {
        // Cerró sesión
        cart = [];
        window._lastRemovedGiftId = null;
        try {
            localStorage.removeItem('tienda_cart');
            localStorage.removeItem('tienda_last_removed_gift');
        } catch(e) {}
        updateCartDisplay();
        updateCartIcon();
    }
}

function updateCartDisplay() {
    const cartItems = document.getElementById('cart-items');
    const cartSubtotal = document.getElementById('cart-subtotal');
    const cartTotalElement = document.getElementById('cart-total');
    const discountInfo = document.getElementById('discount-info');
    const discountAmount = document.getElementById('discount-amount');
    const giftInfo = document.getElementById('gift-info');
    
    if (!cartItems) return;
    
    cartItems.innerHTML = '';

    if (cart.length === 0) {
        const shippingInfo = document.getElementById('shipping-info');
        const shippingAmount = document.getElementById('shipping-amount');
        if (shippingInfo && shippingAmount) {
            shippingInfo.style.display = 'block';
            shippingAmount.textContent = `-`;
        }
        if (discountInfo) discountInfo.style.display = 'none';
        if (giftInfo) giftInfo.style.display = 'none';
        cartSubtotal.textContent = `$0 COP`;
        cartTotalElement.textContent = `$0 COP`;
        cartTotal = 0;
        clearGiftCardHighlights();
        const cartItemsContainer = document.getElementById('cart-items');
        if (cartItemsContainer) {
            cartItemsContainer.classList.remove('has-many-items');
            removeScrollIndicator();
        }
        return;
    }
    
    let subtotal = 0;
    cart.forEach(item => {
        subtotal += item.price * item.quantity;
        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item';
        let priceDisplay = `$${item.price.toLocaleString()} COP`;
        if (item.isGift && item.originalPrice) {
            priceDisplay = `<span style="text-decoration: line-through; color: #999;">$${item.originalPrice.toLocaleString()} COP</span> <span style="color: #000; font-weight: bold;">¡GRATIS!</span>`;
        } else if (!item.isGift && item.originalPrice && item.discountPct > 0) {
            priceDisplay = `<span style="text-decoration: line-through; color: #888; font-size:0.85em;">$${item.originalPrice.toLocaleString()}</span> <span style="color:#e0e0e0; font-weight:700;">$${item.price.toLocaleString()} COP</span> <span style="background:#c0392b;color:#fff;font-size:0.7em;padding:1px 5px;border-radius:8px;font-weight:700;">-${item.discountPct}%</span>`;
        }
        cartItem.innerHTML = `
            <img src="${item.image}" alt="${item.name}">
            <div class="cart-item-info">
                <h4>${item.name}</h4>
                <p>${priceDisplay}</p>
            </div>
            <div class="cart-item-controls">
                <button class="quantity-btn" onclick="updateQuantity('${item.id}', -1)">-</button>
                <span>${item.quantity}</span>
                <button class="quantity-btn" onclick="updateQuantity('${item.id}', 1)">+</button>
                <button class="remove-item" onclick="removeFromCart('${item.id}')">Eliminar</button>
            </div>
        `;
        cartItems.appendChild(cartItem);
    });
    
    const { pct: discountPct, amount: discount } = calcDiscount(subtotal);
    const hasGift = cart.some(item => item.isGift === true);
    
    const shippingInfo = document.getElementById('shipping-info');
    const shippingAmount = document.getElementById('shipping-amount');
    
    // El envío NO se suma al total aquí; el usuario elegirá envío o recogida más adelante
    const total = subtotal - discount;
    
    cartSubtotal.textContent = `$${subtotal.toLocaleString()} COP`;
    cartTotalElement.textContent = `$${total.toLocaleString()} COP`;
    
    if (shippingInfo && shippingAmount) {
        shippingInfo.style.display = 'block';
        shippingAmount.textContent = `-`;
    }
    
    if (discount > 0) {
        discountInfo.style.display = 'block';
        discountAmount.textContent = `$${discount.toLocaleString()} COP (${discountPct}% off)`;
    } else {
        discountInfo.style.display = 'none';
    }
    
    if (hasGift) {
        giftInfo.style.display = 'block';
    } else {
        giftInfo.style.display = 'none';
    }
    
    cartTotal = total;
    
    const cartItemsContainer = document.getElementById('cart-items');
    if (cartItemsContainer) {
        if (cart.length > 3) {
            cartItemsContainer.classList.add('has-many-items');
            addScrollIndicator();
        } else {
            cartItemsContainer.classList.remove('has-many-items');
            removeScrollIndicator();
        }
    }
}

function removeScrollIndicator() {
    const indicator = document.querySelector('.scroll-indicator');
    if (indicator) indicator.remove();
}

function addScrollIndicator() {
    if (document.querySelector('.scroll-indicator')) return;
    const cartItemsContainer = document.getElementById('cart-items');
    if (!cartItemsContainer) return;
    const indicator = document.createElement('div');
    indicator.className = 'scroll-indicator';
    indicator.style.cssText = `
        text-align: center;
        padding: 6px 0 2px;
        font-size: 12px;
        color: #888;
        pointer-events: none;
        user-select: none;
    `;
    indicator.textContent = '↕ Desliza para ver más productos';
    cartItemsContainer.parentNode.insertBefore(indicator, cartItemsContainer.nextSibling);
}

function updateCartIcon() {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const navCount = document.getElementById('nav-cart-count');
    if (navCount) {
        navCount.textContent = totalItems;
        navCount.setAttribute('data-count', totalItems);
        if (totalItems > 0) {
            navCount.classList.add('bump');
            setTimeout(() => navCount.classList.remove('bump'), 200);
        }
    }
    const pill = document.getElementById('cart-count-pill');
    if (pill) pill.textContent = totalItems;
}

function toggleCart() {
    const cartSidebar = document.getElementById('cart-sidebar');
    const backdrop = document.getElementById('cart-backdrop');
    if (cartSidebar) {
        cartSidebar.classList.toggle('open');
        if (cartSidebar.classList.contains('open')) {
            document.body.classList.add('modal-open');
            backdrop?.classList.add('show');
        } else {
            document.body.classList.remove('modal-open');
            backdrop?.classList.remove('show');
        }
    }
}

function checkGiftEligibility() {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const alreadyHasGift = cart.some(item => item.isGift === true);

    if (subtotal >= 150000) {
        if (!alreadyHasGift) {
            const regalo = getRandomGiftProduct(window._lastRemovedGiftId);
            if (regalo) {
                cart.push({
                    id: regalo.id,
                    name: `${regalo.name} (REGALO)`,
                    price: 0,
                    quantity: 1,
                    image: getProductImage(regalo.id),
                    originalPrice: regalo.price,
                    isGift: true,
                    isAutoGift: true
                });
                updateCartDisplay();
                updateCartIcon();
                highlightGiftCard(regalo.id);
            }
        }
    } else {
        if (alreadyHasGift) {
            cart = cart.filter(item => !item.isGift);
            clearGiftCardHighlights();
            updateCartDisplay();
            updateCartIcon();
        }
    }
}

function highlightGiftCard(giftId) {
    clearGiftCardHighlights();
    const cards = document.querySelectorAll('#regalos-container .gift-card');
    cards.forEach(card => {
        try {
            const data = JSON.parse(card.getAttribute('data-product') || '{}');
            if (data.id === giftId) card.classList.add('gift-selected');
        } catch (e) {}
    });
}

function clearGiftCardHighlights() {
    document.querySelectorAll('#regalos-container .gift-card').forEach(card => {
        card.classList.remove('gift-selected');
    });
}

function getRandomGiftProduct(excludeId) {
    const giftCards = Array.from(document.querySelectorAll('#regalos-container .gift-card'));
    if (!giftCards || giftCards.length === 0) return null;

    const available = giftCards.reduce((acc, card) => {
        try {
            const data = JSON.parse(card.getAttribute('data-product') || '{}');
            if (data.id && data.id !== excludeId) acc.push({ id: data.id, name: data.name, price: data.price });
        } catch (e) {}
        return acc;
    }, []);

    const pool = available.length > 0 ? available : giftCards.reduce((acc, card) => {
        try {
            const data = JSON.parse(card.getAttribute('data-product') || '{}');
            if (data.id) acc.push({ id: data.id, name: data.name, price: data.price });
        } catch (e) {}
        return acc;
    }, []);

    if (pool.length === 0) return null;
    return pool[Math.floor(Math.random() * pool.length)];
}

function getProductImage(productId) {
    // Busqueda exacta por id — evita que "camiseta-1" encuentre "oferta-camiseta-1"
    const allCards = document.querySelectorAll('[data-product]');
    for (const card of allCards) {
        try {
            const data = JSON.parse(card.getAttribute('data-product'));
            if (data.id === productId) {
                const img = card.querySelector('img');
                return img ? img.src : 'https://via.placeholder.com/300x300?text=Producto';
            }
        } catch(e) {}
    }
    return 'https://via.placeholder.com/300x300?text=Producto';
}

function showCatalog(category) {
    const modal = document.getElementById('catalog-modal');
    const overlay = document.getElementById('modal-overlay');
    const title = document.getElementById('catalog-title');
    const grid = document.getElementById('catalog-grid');
    if (!modal || !overlay || !title || !grid) return;
    title.textContent = `Catálogo - ${getCategoryName(category)}`;
    grid.innerHTML = '';
    const products = getCatalogProducts(category);
    products.forEach(product => {
        const item = document.createElement('div');
        item.className = 'catalog-item';
        const discPct = product.discountPct || 0;
        const salePrice = discPct > 0 ? Math.round(product.price * (1 - discPct/100)) : product.price;
        const priceHTML = discPct > 0
            ? `<span class="price-original">$${product.price.toLocaleString()} COP</span><span class="price-sale">$${salePrice.toLocaleString()} COP</span><span class="discount-badge">-${discPct}%</span>`
            : `<span class="price">$${product.price.toLocaleString()} COP</span>`;

        const hasSizes = product.sizes && product.sizes.length > 0;
        item.innerHTML = `
            <img src="${product.image}" alt="${product.name}">
            <h4>${product.name}</h4>
            <p class="price-wrap">${priceHTML}</p>
            <button class="add-to-cart-btn" onclick='openProductModalGuarded(${JSON.stringify({
                id: product.id, name: product.name, price: salePrice,
                salePrice: salePrice, originalPrice: discPct > 0 ? product.price : null,
                discountPct: discPct, image: product.image,
                sizes: product.sizes || null, description: product.description || null
            })})'>
                ${hasSizes ? 'Seleccionar talla' : 'Agregar'}
            </button>
        `;
        grid.appendChild(item);
    });
    overlay.removeAttribute('style');
    modal.classList.add('show');
    overlay.classList.add('show');
    document.body.classList.add('modal-open');
}

function closeCatalogModal() {
    const modal = document.getElementById('catalog-modal');
    const overlay = document.getElementById('modal-overlay');
    if (modal && overlay) {
        modal.classList.remove('show');
        overlay.classList.remove('show');
        document.body.classList.remove('modal-open');
    }
}

function getCategoryName(category) {
    const names = {
        'camisetas': 'Camisetas Adidas',
        'tenis': 'Tenis Adidas',
        'jeans': 'Jeans',
        'cascos': 'Cascos para Motos',
        'deportes': 'Equipos Deportivos',
        'ofertas': '🔥 Ofertas'
    };
    return names[category] || category;
}

function getCatalogProducts(category) {
    const catalogProducts = {
        'camisetas': [
            { id: 'camiseta-cat-1', name: 'Camiseta Adidas Liverpool ', price: 74900, image: 'Camiseta adidas4.png', sizes: ['S','M','L','XL'] },
            { id: 'camiseta-cat-2', name: 'Camiseta Adidas Black     ', price: 49900, image: 'Camiseta Adidas2.png', sizes: ['S','M','L','XL'] },
            { id: 'camiseta-cat-3', name: 'Camiseta Adidas Arsenal Club ', price: 79500, image: 'Camiseta Arsenal.png', sizes: ['S','M','L','XL'] },
            { id: 'camiseta-cat-5', name: 'Camiseta Adidas Madrid Blue ', price: 78400, image: 'Madridblue.png', sizes: ['S','M','L','XL'] },
            { id: 'camiseta-cat-6', name: 'Camiseta Adidas Colombia ', price: 52000, image: 'Colombia.png', sizes: ['S','M','L','XL'] }
        ],
        'tenis': [
            { id: 'tenis-cat-1', name: 'Tenis Adidas Yeezy', price: 295900, image: 'Tenis Adidas yeezy.png', sizes: ['36','37','38','39','40','41','42','43','44'] },
            { id: 'tenis-cat-2', name: 'Tenis Adidas Boost', price: 229000, image: 'Tenis Adidas Boost.png', sizes: ['36','37','38','39','40','41','42','43','44'] },
            { id: 'tenis-cat-3', name: 'Tenis Adidas Red', price: 172000, image: 'tenisadidas6.png', sizes: ['36','37','38','39','40','41','42','43','44'] },
            { id: 'tenis-cat-4', name: 'Tenis Adidas Black', price: 110000, image: 'tenisadidas5.png', sizes: ['36','37','38','39','40','41','42','43','44'] },
            { id: 'tenis-cat-5', name: 'Tenis Adidas White', price: 214900, image: 'tenisadidas1.png', sizes: ['36','37','38','39','40','41','42','43','44'] },
            { id: 'tenis-cat-6', name: 'Tenis Adidas I', price: 149000, image: 'tenisadidas3.png', sizes: ['36','37','38','39','40','41','42','43','44'] },
            { id: 'tenis-cat-7', name: 'Tenis Adidas II', price: 105000, image: 'tenisadidas2.png', sizes: ['36','37','38','39','40','41','42','43','44'] },
            { id: 'tenis-cat-8', name: 'Tenis Adidas III', price: 99200, image: 'tenisadidas4.png', sizes: ['36','37','38','39','40','41','42','43','44'] }
        ],
        'jeans': [
            { id: 'jeans-cat-1', name: 'Jeans Clasicos', price: 70800, image: 'Jeans clasico hombre l.png', sizes: ['28','30','32','34'] },
            { id: 'jeans-cat-2', name: 'Jeans Clasicos II', price: 68200, image: 'Jeans clasico hombre ll.png', sizes: ['28','30','32','34'] },
            { id: 'jeans-cat-3', name: 'Jeans Vintage', price: 80000, image: 'jeans ventage dama l.png', sizes: ['28','30','32','34'] },
            { id: 'jeans-cat-4', name: 'Jeans Vintage II', price: 80000, image: 'jeans vintage dama ll.png', sizes: ['28','30','32','34'] },
            { id: 'jeans-cat-5', name: 'Jeans Rotos', price: 72800, image: 'jeans rotos ll.png', sizes: ['28','30','32','34'] },
            { id: 'jeans-cat-6', name: 'Jeans Relaxed', price: 88700, image: 'jeans relaxed ll.png', sizes: ['28','30','32','34'] },
            { id: 'jeans-cat-7', name: 'Jeans Modernos', price: 73900, image: 'Jeans moderno ll.png', sizes: ['28','30','32','34'] },
        ],
        'cascos': [
            { id: 'casco-cat-1', name: 'Casco Moto croos', price: 220600, image: 'cross azul.png', sizes: ['XS (53-54cm)','S (55-56cm)','M (57-58cm)','L (59-60cm)','XL (61-62cm)'] },
            { id: 'casco-cat-2', name: 'Casco Motocicleta', price: 113500, image: 'rojo.png', sizes: ['XS (53-54cm)','S (55-56cm)','M (57-58cm)','L (59-60cm)','XL (61-62cm)'] },
            { id: 'casco-cat-3', name: 'Casco Carreras', price: 420900, image: 'Casco Racing l.png', sizes: ['XS (53-54cm)','S (55-56cm)','M (57-58cm)','L (59-60cm)','XL (61-62cm)'] },
            { id: 'casco-cat-4', name: 'Casco Carreras ll', price: 410400, image: 'Casco Racing ll.png', sizes: ['XS (53-54cm)','S (55-56cm)','M (57-58cm)','L (59-60cm)','XL (61-62cm)'] },
            { id: 'casco-cat-5', name: 'Casco TodoT', price: 199200, image: 'Casco Touring l.png', sizes: ['XS (53-54cm)','S (55-56cm)','M (57-58cm)','L (59-60cm)','XL (61-62cm)'] },
            { id: 'casco-cat-6', name: 'Casco TodoT ll', price: 189900, image: 'Casco Touring ll.png', sizes: ['XS (53-54cm)','S (55-56cm)','M (57-58cm)','L (59-60cm)','XL (61-62cm)'] }
        ],
        'deportes': [
            { id: 'deportes-cat-1', name: 'Bicicleta Mount Bike I', price: 890000, image: 'BicicletaCata.png' },
            { id: 'deportes-cat-2', name: 'Bicicleta Mount Bike II', price: 760000, image: 'BicicletaBike3.png' },
            { id: 'deportes-cat-3', name: 'Bicicleta Mount Bike III', price: 900000, image: 'BicicletaBike4.png' },
            { id: 'deportes-cat-4', name: 'Bicicleta Mount Bike IIII', price: 1000000, image: 'BicicletaBike2.png' },
            { id: 'deportes-cat-5', name: 'Equipo Ciclismo ', price: 188200, image: 'Equipo Completo 1.png' },
            { id: 'deportes-cat-6', name: 'Equipo Ciclismo II', price: 183500, image: 'Equipo Completo 2.png' },
            { id: 'deportes-cat-7', name: 'Equipo Ciclismo III', price: 179900, image: 'Equipo Completo 3.png' },
            { id: 'deportes-cat-8', name: 'Accesorios Deport I', price: 50000, image: 'AcesoriosBici.png' },
            { id: 'deportes-cat-9', name: 'Accesorios Deport II', price: 55000, image: 'AcesoriosBici2.png' },
            { id: 'deportes-cat-10', name: 'Accesorios Deport III', price: 30000, image: 'AcesoriosBici3.png' },
            { id: 'deportes-cat-11', name: 'Guantes Ciclismo', price: 30000, image: 'GuantesCiclismo.png' },
            { id: 'deportes-cat-12', name: 'Mancuerna 2KG', price: 25000, image: 'Mancuerna2KG.png' },
            { id: 'deportes-cat-13', name: 'Mancuerna 5KG', price: 55900, image: 'Mancuerna5KG.png' },
            { id: 'deportes-cat-14', name: 'Mancuerna 10KG', price: 110500, image: 'Mancuerna10KG.png' },
            { id: 'deportes-cat-15', name: 'Mancuerna 20KG', price: 210900, image: 'Mancuerna20KG.png' },
            { id: 'deportes-cat-16', name: 'Mancuerna 25KG', price: 259200, image: 'Mancuerna25KG.png' },
            { id: 'deportes-cat-17', name: 'Mancuerna 30KG', price: 289400, image: 'Mancuerna30KG.png' }
        ],
        'ofertas': OFERTAS_CONFIG.products.map(p => {
            const salePrice = Math.round(p.basePrice * (1 - OFERTAS_CONFIG.discountPct / 100));
            return { id: p.id, name: p.name, price: p.basePrice, salePrice, discountPct: OFERTAS_CONFIG.discountPct, image: p.image, sizes: p.sizes || null, description: p.description || null };
        })
    };
    return catalogProducts[category] || [];
}

function openReservationModal() {
    if (cart.length === 0) {
        showNotification('Tu carrito está vacío');
        return;
    }
    const modal = document.getElementById('reservation-modal');
    const overlay = document.getElementById('modal-overlay');
    const items = document.getElementById('reservation-items');
    const total = document.getElementById('reservation-total-amount');
    if (!modal || !overlay || !items || !total) return;
    let html = '';
    cart.forEach(item => {
        const lineTotal = item.price * item.quantity;
        html += `
            <div class="payment-item">
                <span>${item.name} x${item.quantity}</span>
                <span>$${lineTotal.toLocaleString()} COP</span>
            </div>
        `;
    });
    const computedSubtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const { pct: computedPct, amount: computedDiscount } = calcDiscount(computedSubtotal);
    if (computedDiscount > 0) {
        html += `
            <div class="payment-item" style="margin-top:6px;">
                <span style="font-weight:600;">Descuento (${computedPct}%)</span>
                <span style="color:#44a08d;">-$${computedDiscount.toLocaleString()} COP</span>
            </div>
        `;
    }
    const gifts = cart.filter(i => i.isGift === true);
    if (gifts.length > 0) {
        const giftNames = gifts.map(g => g.name.replace(' (REGALO)', '')).join(', ');
        html += `
            <div class="payment-item">
                <span>Regalo incluido</span>
                <span>${giftNames}</span>
            </div>
        `;
    }
    items.innerHTML = html;
    total.textContent = `$${cartTotal.toLocaleString()} COP`;

    const cartSidebar = document.getElementById('cart-sidebar');
    const cartBackdrop = document.getElementById('cart-backdrop');
    if (cartSidebar?.classList.contains('open')) {
        cartSidebar.classList.remove('open');
        cartBackdrop?.classList.remove('show');
    }

    modal.classList.add('show');
    overlay.classList.add('show');
    document.body.classList.add('modal-open');
}

function closeReservationModal() {
    const modal = document.getElementById('reservation-modal');
    const overlay = document.getElementById('modal-overlay');
    if (modal && overlay) {
        modal.classList.remove('show');
        overlay.classList.remove('show');
        const cartOpen = document.getElementById('cart-sidebar')?.classList.contains('open');
        if (!cartOpen) document.body.classList.remove('modal-open');
    }
}

function buildCartLinesForMessage() {
    return cart.map(item => {
        const lineTotal = item.price * item.quantity;
        return `- ${item.name} x${item.quantity} - $${lineTotal.toLocaleString()} COP`;
    }).join('\n');
}

function validateName(name) {
    const nameRegex = /^[A-Za-zÁáÉéÍíÓóÚúÑñ\s]+$/;
    return nameRegex.test(name);
}

function validateEmail(email) {
    const emailRegex = /^[a-z0-9._%+-]+@(gmail\.com|hotmail\.com|outlook\.com)$/;
    return emailRegex.test(email);
}

function validatePhone(phone) {
    const phoneRegex = /^[0-9]{10}$/;
    return phoneRegex.test(phone);
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 0;
        left: 50%;
        transform: translateX(-50%) translateY(-100%);
        background: linear-gradient(45deg, #000);
        color: white;
        padding: 1rem 2rem;
        border-radius: 10px;
        box-shadow: 0 5px 20px rgba(0, 0, 0, 0.3);
        z-index: 10000;
        transition: transform 0.6s ease, opacity 0.6s ease;
        font-weight: 400;
        max-width: 300px;
        opacity: 0;
    `;
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.style.transform = "translateX(-50%) translateY(0px)";
        notification.style.opacity = "1";
    }, 100);
    setTimeout(() => {
        notification.style.transform = "translateX(-50%) translateY(-100%)";
        notification.style.opacity = "0";
        setTimeout(() => {
            if (notification.parentNode) notification.parentNode.removeChild(notification);
        }, 600);
    }, 1000);
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => modal.classList.remove('show'));
    document.getElementById('modal-overlay').classList.remove('show');
}

function shareVia(platform) {
    const url   = 'https://cxr10s.github.io';
    const textLargo = `⚡ Shop — Tienda Deportiva Online\n\n` +
        `Te comparto esta tienda deportiva. Camisetas, tenis, jeans, cascos y equipos deportivos al mejor precio.\n\n` +
        `🎁 Regalo GRATIS desde $150.000\n` +
        `🚚 Envío GRATIS desde $150.000\n` +
        `💳 Descuentos hasta el 20%\n\n` +
        `¡También está disponible para la venta como negocio digital!\n\n` +
        `👉 ${url}`;
    const titleEmail = '⚡ Shop — Tienda Deportiva Online';
    const links = {
        whatsapp: `https://wa.me/?text=${encodeURIComponent(url)}`,
        telegram: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(textLargo)}`,
        instagram: `https://x.com/intent/tweet?text=${encodeURIComponent(textLargo)}&url=${encodeURIComponent(url)}`,
        email:    `mailto:?subject=${encodeURIComponent(titleEmail)}&body=${encodeURIComponent(textLargo)}`,
    };
    if (platform === 'copy') {
        navigator.clipboard.writeText(url).then(() => {
            const btn = document.getElementById('copy-btn');
            const span = btn ? btn.querySelector('span') : null;
            const icon = btn ? btn.querySelector('i') : null;
            if (span) span.textContent = '¡Copiado!';
            if (icon) { icon.classList.remove('fa-link'); icon.classList.add('fa-check'); }
            setTimeout(() => {
                if (span) span.textContent = '';
                if (icon) { icon.classList.remove('fa-check'); icon.classList.add('fa-link'); }
            }, 2000);
        }).catch(() => {
            const el = document.createElement('textarea');
            el.value = url;
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
            showNotification('¡Enlace copiado!');
        });
        return;
    }
    if (links[platform]) window.open(links[platform], '_blank', 'noopener,noreferrer');
}

// =============================================
// RENDERIZAR SECCIÓN OFERTAS
// =============================================
function renderOfertasSection() {
    const container = document.getElementById('ofertas-container');
    if (!container) return;
    container.innerHTML = '';
    const pct = OFERTAS_CONFIG.discountPct;
    OFERTAS_CONFIG.products.forEach(p => {
        const salePrice = Math.round(p.basePrice * (1 - pct / 100));
        const hasSizes = p.sizes && p.sizes.length > 0;
        const modalData = JSON.stringify({
            id: p.id, name: p.name, price: salePrice,
            salePrice, originalPrice: p.basePrice, discountPct: pct,
            image: p.image, sizes: p.sizes || null, description: p.description || null
        }).replace(/'/g, '&#39;');
        const card = document.createElement('div');
        card.className = 'product-card oferta-card';
        card.setAttribute('data-product', JSON.stringify({ id: p.id, name: p.name, price: salePrice, category: 'ofertas' }));
        card.innerHTML = `
            <div class="oferta-badge">-${pct}%</div>
            <img src="${p.image}" alt="${p.name}" loading="lazy">
            <h3>${p.name}</h3>
            <div class="price-block">
                <span class="price-original-card">$${p.basePrice.toLocaleString()} COP</span>
                <span class="price-sale-card">$${salePrice.toLocaleString()} COP</span>
            </div>
            <button class="add-to-cart-btn" onclick='openProductModalGuarded(${modalData})'>
                ${hasSizes ? 'Seleccionar talla' : 'Agregar'}
            </button>
        `;
        container.appendChild(card);
    });
}

// =============================================
// INICIALIZAR
// =============================================
window.addEventListener('DOMContentLoaded', function() {
    loadCart();
    _initCartAuthSync();
    renderOfertasSection();
    if (cart.length > 0) {
        updateCartDisplay();
        updateCartIcon();
        const yaHayRegalo = cart.some(item => item.isGift === true);
        if (!yaHayRegalo) checkGiftEligibility();
    }
});
