// =============================================
// SISTEMA DE DESCUENTOS PROGRESIVO
// =============================================
// Tramos:
//   < $150.000   → sin descuento  (envío $25.000)
//  $150.000–$249.999 → 5%         (envío gratis)
//  $250.000–$399.999 → 8%
//  $400.000–$599.999 → 12%
//  $600.000–$899.999 → 15%
//  $900.000+          → 20%
function calcDiscount(subtotal) {
    if (subtotal >= 900000)  return { pct: 20, amount: Math.round(subtotal * 0.20) };
    if (subtotal >= 600000)  return { pct: 15, amount: Math.round(subtotal * 0.15) };
    if (subtotal >= 400000)  return { pct: 12, amount: Math.round(subtotal * 0.12) };
    if (subtotal >= 250000)  return { pct: 8,  amount: Math.round(subtotal * 0.08) };
    if (subtotal >= 150000)  return { pct: 5,  amount: Math.round(subtotal * 0.05) };
    return { pct: 0, amount: 0 };
}

// Variables globales
let cart = [];
let cartTotal = 0;


// Funcionalidad de carruseles
function moveCarousel(sectionId, direction) {
    const container = document.getElementById(sectionId + '-container');
    if (!container) return;
    
    const cardWidth = 300;
    const scrollAmount = cardWidth * direction;
    
    container.scrollBy({
        left: scrollAmount,
        behavior: 'smooth'
    });
    
    // Ocultar indicadores después de la primera interacción
    hideScrollIndicators(container);
}

// Sistema de carrito de compras
function addToCart(productId, productName, price, image = null) {
    const existingItem = cart.find(item => item.id === productId);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            id: productId,
            name: productName,
            price: price,
            quantity: 1,
            image: image || getProductImage(productId)
        });
    }
    
    updateCartDisplay();
    updateCartIcon();
    showNotification(`${productName} agregado al carrito!`);
    
    // Verificar si aplica regalo
    checkGiftEligibility();
    saveCart();
}


function removeFromCart(productId) {
    const removedItem = cart.find(item => item.id === productId);

    // Si se remueve un regalo, guardar su ID para no repetirlo
    if (removedItem && removedItem.isGift) {
        window._lastRemovedGiftId = productId;
        clearGiftCardHighlights();
        try { localStorage.setItem('tienda_last_removed_gift', productId); } catch(e) {}
    }

    cart = cart.filter(item => item.id !== productId);

    // Quitar regalo si ya no cumple el mínimo ANTES de guardar
    const subtotalSinRegalo = cart.reduce((sum, i) => sum + (i.isGift ? 0 : i.price * i.quantity), 0);
    if (subtotalSinRegalo < 150000) {
        const giftIndex = cart.findIndex(i => i.isGift === true);
        if (giftIndex !== -1) {
            cart.splice(giftIndex, 1);
            clearGiftCardHighlights();
        }
    }

    // Guardar estado real en localStorage ANTES de checkGiftEligibility
    if (cart.length === 0) {
        try {
            localStorage.removeItem('tienda_cart');
            localStorage.removeItem('tienda_last_removed_gift');
            window._lastRemovedGiftId = null;
        } catch(e) {}
    } else {
        try {
            localStorage.setItem('tienda_cart', JSON.stringify(cart));
        } catch(e) {}
    }

    updateCartDisplay();
    updateCartIcon();
    checkGiftEligibility();
    saveCart();
}

function updateQuantity(productId, change) {
    const item = cart.find(item => item.id === productId);
    if (item) {
        // Si es un regalo gratis y se intenta aumentar la cantidad, no permitirlo
        if (item.isGift && change > 0) {
            showNotification('Solo puedes tener un regalo gratis en tu carrito.');
            return;
        }
        item.quantity += change;
        if (item.quantity <= 0) {
            removeFromCart(productId);
        } else {
            // Si es un regalo, verificar si sigue siendo elegible
            if (item.isGift && item.originalPrice) {
                const subtotal = cart.reduce((sum, item2) => {
                    if (item2.id === productId) return sum; // Excluir el item actual del cálculo
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
// El carrito se guarda por usuario de Google.
// Al cerrar sesión se limpia; al iniciar se restaura.
// =============================================
const _STORE_FS_URL  = 'https://firestore.googleapis.com/v1/projects/tiendadeportiva912-b9f0d/databases/(default)/documents/carts';

async function _getFirebaseToken() {
    try {
        const auth = window._firebaseAuth;
        if (!auth || !auth.currentUser) return null;
        return await auth.currentUser.getIdToken();
    } catch(e) { return null; }
}

async function saveCart() {
    // localStorage
    try {
        if (cart.length > 0) {
            localStorage.setItem('tienda_cart', JSON.stringify(cart));
            localStorage.setItem('tienda_last_removed_gift', window._lastRemovedGiftId || '');
        } else {
            localStorage.removeItem('tienda_cart');
            localStorage.removeItem('tienda_last_removed_gift');
        }
    } catch(e) {}

    const token = await _getFirebaseToken();
    if (!token || !window._currentUser) return;
    const uid = window._currentUser.uid;

    try {
        if (cart.length > 0) {
            // Guardar carrito en Firestore
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
            // Carrito vacío → eliminar documento de Firestore para que no se restaure
            await fetch(`${_STORE_FS_URL}/${uid}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
        }
    } catch(e) {}
}

async function loadCartFromCloud(uid, token) {
    try {
        const res = await fetch(`${_STORE_FS_URL}/${uid}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) return false;
        const data = await res.json();
        const fields = data.fields || {};
        const itemsStr = fields.items?.stringValue;
        const giftStr  = fields.lastRemovedGift?.stringValue;
        if (itemsStr) {
            const parsed = JSON.parse(itemsStr);
            if (Array.isArray(parsed) && parsed.length > 0) {
                cart = parsed;
                if (giftStr) window._lastRemovedGiftId = giftStr;
                return true;
            }
        }
        return false;
    } catch(e) { return false; }
}

function loadCart() {
    // Carga local como fallback (se sobreescribe al iniciar sesión)
    try {
        const saved = localStorage.getItem('tienda_cart');
        if (saved) cart = JSON.parse(saved);
        const savedGift = localStorage.getItem('tienda_last_removed_gift');
        if (savedGift) window._lastRemovedGiftId = savedGift;
    } catch(e) {}
}

// Escuchar cambios de autenticación para sincronizar el carrito
function _initCartAuthSync() {
    if (!window._firebaseAuth) {
        // Esperar hasta que Firebase esté listo
        setTimeout(_initCartAuthSync, 300);
        return;
    }
    // Usar la función nativa de Firebase si está disponible
    try {
        const { onAuthStateChanged } = window._firebaseAuthModule || {};
        if (typeof onAuthStateChanged === 'function') {
            onAuthStateChanged(window._firebaseAuth, _handleAuthCartChange);
        } else {
            // Fallback: polling
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
        // Fallback: polling
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
            // Limpiar local ANTES de cargar nube
            try {
                localStorage.removeItem('tienda_cart');
                localStorage.removeItem('tienda_last_removed_gift');
            } catch(e) {}

            const loaded = await loadCartFromCloud(user.uid, token);
            if (!loaded) {
                // Nube vacía o sin datos → carrito vacío
                cart = [];
                window._lastRemovedGiftId = null;
            }
        }
        updateCartDisplay();
        updateCartIcon();
        const yaHayRegalo = cart.some(i => i.isGift === true);
        if (!yaHayRegalo) checkGiftEligibility();
    } else {
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

    // Si no hay productos en el carrito, asegurar totales y envío en 0
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
    
    // Calcular descuentos
    const { pct: discountPct, amount: discount } = calcDiscount(subtotal);
    const hasGift = cart.some(item => item.isGift === true);
    
    // Calcular costo de envío
    let shippingCost = 0;
    const shippingInfo = document.getElementById('shipping-info');
    const shippingAmount = document.getElementById('shipping-amount');
    
    // Envío gratis si el subtotal cumple la condición o si el carrito está vacío
    if (subtotal > 0 && subtotal < 150000) {
        shippingCost = 25000; // Costo de envío cuando no se cumple la condición
    }
    
    const total = subtotal - discount + shippingCost;
    
    cartSubtotal.textContent = `$${subtotal.toLocaleString()} COP`;
    cartTotalElement.textContent = `$${total.toLocaleString()} COP`;
    
    // Mostrar información de envío
    if (shippingInfo && shippingAmount) {
        shippingInfo.style.display = 'block';
        if (shippingCost > 0) {
            shippingAmount.textContent = `-`;
        } else {
            shippingAmount.textContent = `-`;
        }
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
    
    // Detectar si hay muchos productos y aplicar clase correspondiente
    const cartItemsContainer = document.getElementById('cart-items');
    if (cartItemsContainer) {
        if (cart.length > 3) {
            cartItemsContainer.classList.add('has-many-items');
            // Agregar indicador visual adicional
            addScrollIndicator();
        } else {
            cartItemsContainer.classList.remove('has-many-items');
            removeScrollIndicator();
        }
    }
}

function removeScrollIndicator() {
    const indicator = document.querySelector('.scroll-indicator');
    if (indicator) {
        indicator.remove();
    }
}

function addScrollIndicator() {
    // Evitar duplicados
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
    // Botón flotante eliminado — el carrito vive en la navbar
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

    // Actualizar badge en la navbar
    const navCount = document.getElementById('nav-cart-count');
    if (navCount) {
        navCount.textContent = totalItems;
        navCount.setAttribute('data-count', totalItems);
        if (totalItems > 0) {
            navCount.classList.add('bump');
            setTimeout(() => navCount.classList.remove('bump'), 200);
        }
    }

    // Actualizar el pill dentro del sidebar
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
            // Seleccionar un regalo aleatorio diferente al último removido
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
                // Marcar visualmente la tarjeta seleccionada
                highlightGiftCard(regalo.id);
            }
        }
    } else {
        // Ya no cumple el mínimo → quitar regalo sin notificación
        if (alreadyHasGift) {
            cart = cart.filter(item => !item.isGift);
            clearGiftCardHighlights();
            updateCartDisplay();
            updateCartIcon();
        }
    }
}

// Resaltar la tarjeta del regalo seleccionado
function highlightGiftCard(giftId) {
    clearGiftCardHighlights();
    const cards = document.querySelectorAll('#regalos-container .gift-card');
    cards.forEach(card => {
        try {
            const data = JSON.parse(card.getAttribute('data-product') || '{}');
            if (data.id === giftId) {
                card.classList.add('gift-selected');
            }
        } catch (e) {}
    });
}

function clearGiftCardHighlights() {
    document.querySelectorAll('#regalos-container .gift-card').forEach(card => {
        card.classList.remove('gift-selected');
    });
}

// Obtener un producto de regalo aleatorio, excluyendo el último removido
function getRandomGiftProduct(excludeId) {
    const giftCards = Array.from(document.querySelectorAll('#regalos-container .gift-card'));
    if (!giftCards || giftCards.length === 0) return null;

    // Parsear todos los productos disponibles
    const available = giftCards.reduce((acc, card) => {
        try {
            const data = JSON.parse(card.getAttribute('data-product') || '{}');
            if (data.id && data.id !== excludeId) {
                acc.push({ id: data.id, name: data.name, price: data.price });
            }
        } catch (e) {}
        return acc;
    }, []);

    // Si después de excluir no queda ninguno, usar todos (fallback)
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
    const productCard = document.querySelector(`[data-product*="${productId}"]`);
    if (productCard) {
        const img = productCard.querySelector('img');
        return img ? img.src : 'https://via.placeholder.com/300x300?text=Producto';
    }
    return 'https://via.placeholder.com/300x300?text=Producto';
}

// Sistema de catálogo
function showCatalog(category) {
    const modal = document.getElementById('catalog-modal');
    const overlay = document.getElementById('modal-overlay');
    const title = document.getElementById('catalog-title');
    const grid = document.getElementById('catalog-grid');
    
    if (!modal || !overlay || !title || !grid) return;
    
    title.textContent = `Catálogo - ${getCategoryName(category)}`;
    grid.innerHTML = '';
    
    // Cargar productos del catálogo
    const products = getCatalogProducts(category);
    products.forEach(product => {
        const item = document.createElement('div');
        item.className = 'catalog-item';
        item.innerHTML = `
            <img src="${product.image}" alt="${product.name}">
            <h4>${product.name}</h4>
            <p class="price">$${product.price.toLocaleString()} COP</p>
            <button class="add-to-cart-btn" onclick="addToCart('${product.id}', '${product.name}', ${product.price}, '${product.image}')">Agregar</button>
        `;
        grid.appendChild(item);
    });

    // Limpiar estilos inline que puedan interferir
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
        'deportes': 'Equipos Deportivos'
    };
    return names[category] || category;
}

function getCatalogProducts(category) {
    // Productos adicionales para el catálogo
    const catalogProducts = {
        'camisetas': [
            { id: 'camiseta-cat-1', name: 'Camiseta Adidas Liverpool ', price: 74900, image: 'Camiseta adidas4.png' },
            { id: 'camiseta-cat-2', name: 'Camiseta Adidas Black ', price: 49900, image: 'Camiseta Adidas2.png' },
            { id: 'camiseta-cat-3', name: 'Camiseta Adidas Arsenal Club ', price: 79500, image: 'Camiseta Arsenal.png' },
            { id: 'camiseta-cat-4', name: 'Camiseta Adidas Retro Brasil ', price:99000, image: 'CamisetaBrasil.png' },
            { id: 'camiseta-cat-5', name: 'Camiseta Adidas Madrid Blue ', price: 78400, image: 'Madridblue.png' },
            { id: 'camiseta-cat-6', name: 'Camiseta Adidas Colombia ', price: 52000, image: 'Colombia.png' }
        ],
        'tenis': [
            { id: 'tenis-cat-1', name: 'Tenis Adidas Yeezy', price: 295900, image: 'Tenis Adidas yeezy.png' },
            { id: 'tenis-cat-2', name: 'Tenis Adidas Boost', price: 229000, image: 'Tenis Adidas Boost.png' },
            { id: 'tenis-cat-3', name: 'Tenis Adidas Red', price: 172000, image: 'tenisadidas6.png' },
            { id: 'tenis-cat-4', name: 'Tenis Adidas Black', price: 110000, image: 'tenisadidas5.png' },
            { id: 'tenis-cat-5', name: 'Tenis Adidas White', price: 214900, image: 'tenisadidas1.png' },
            { id: 'tenis-cat-6', name: 'Tenis Adidas I', price: 149000, image: 'tenisadidas3.png' },
            { id: 'tenis-cat-7', name: 'Tenis Adidas II', price: 105000, image: 'tenisadidas2.png' },
            { id: 'tenis-cat-8', name: 'Tenis Adidas III', price: 99200, image: 'tenisadidas4.png' }
        ],
        'jeans': [
            { id: 'jeans-cat-1', name: 'Jeans Clasicos', price: 70800, image: 'Jeans clasico hombre l.png' },
            { id: 'jeans-cat-2', name: 'Jeans Clasicos II', price: 68200, image: 'Jeans clasico hombre ll.png' },
            { id: 'jeans-cat-3', name: 'Jeans Vintage', price: 80000, image: 'jeans ventage dama l.png' },
            { id: 'jeans-cat-4', name: 'Jeans Vintage II', price: 80000, image: 'jeans vintage dama ll.png' },
            { id: 'jeans-cat-5', name: 'Jeans Rotos', price: 72800, image: 'jeans rotos ll.png' },
            { id: 'jeans-cat-6', name: 'Jeans Relaxed', price: 88700, image: 'jeans relaxed ll.png' },
            { id: 'jeans-cat-7', name: 'Jeans Modernos', price: 73900, image: 'Jeans moderno ll.png' },
        ],
        'cascos': [
            { id: 'casco-cat-1', name: 'Casco Moto croos', price: 220600, image: 'cross azul.png' },
            { id: 'casco-cat-2', name: 'Casco Motocicleta', price: 113500, image: 'rojo.png' },
            { id: 'casco-cat-3', name: 'Casco Carreras', price: 420900, image: 'Casco Racing l.png' },
            { id: 'casco-cat-4', name: 'Casco Carreras ll', price: 410400, image: 'Casco Racing ll.png' },
            { id: 'casco-cat-5', name: 'Casco TodoT', price: 199200, image: 'Casco Touring l.png' },
            { id: 'casco-cat-6', name: 'Casco TodoT ll', price: 189900, image: 'Casco Touring ll.png' }
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
        ]
    };
    
    return catalogProducts[category] || [];
}


// Flujo de registro de pedidos
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
    // Render resumen
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
    // Añadir descuento si aplica
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
    // Mostrar regalo incluido si lo hay
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

    // Cerrar carrito automáticamente si está abierto (sin perder productos)
    const cartSidebar = document.getElementById('cart-sidebar');
    const cartBackdrop = document.getElementById('cart-backdrop');
    if (cartSidebar?.classList.contains('open')) {
        cartSidebar.classList.remove('open');
        cartBackdrop?.classList.remove('show');
    }

    modal.classList.add('show');
    overlay.classList.add('show');
    // Agregar clase modal-open al body para prevenir scroll
    document.body.classList.add('modal-open');
}

function closeReservationModal() {
    const modal = document.getElementById('reservation-modal');
    const overlay = document.getElementById('modal-overlay');
    if (modal && overlay) {
        modal.classList.remove('show');
        overlay.classList.remove('show');
        // Solo quitar modal-open si el carrito NO está abierto
        const cartOpen = document.getElementById('cart-sidebar')?.classList.contains('open');
        if (!cartOpen) {
            document.body.classList.remove('modal-open');
        }
    }
}

function buildCartLinesForMessage() {
    // Solo productos, sin mensajes extra
    return cart.map(item => {
        const lineTotal = item.price * item.quantity;
        return `- ${item.name} x${item.quantity} - $${lineTotal.toLocaleString()} COP`;
    }).join('\n');
}

// Funciones de validación
function validateName(name) {
    // Permitir letras, espacios y tildes
    const nameRegex = /^[A-Za-zÁáÉéÍíÓóÚúÑñ\s]+$/;
    return nameRegex.test(name);
}

function validateEmail(email) {
    // Permitir @gmail.com, @hotmail.com y @outlook.com
    const emailRegex = /^[a-z0-9._%+-]+@(gmail\.com|hotmail\.com|outlook\.com)$/;
    return emailRegex.test(email);
}

function validatePhone(phone) {
    // Exactamente 10 dígitos numéricos, sin letras, espacios ni caracteres especiales
    const phoneRegex = /^[0-9]{10}$/;
    return phoneRegex.test(phone);
}

// Sistema de notificaciones
function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    
    notification.style.cssText = `
        position: fixed;
        top: 0; /* parte superior de la pantalla */
        left: 50%; /* centrado horizontal */
        transform: translateX(-50%) translateY(-100%); /* empieza oculto arriba */
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
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 600); // espera a que termine la transición
    }, 1000);
}


// Funciones de utilidad
function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('show');
    });
    document.getElementById('modal-overlay').classList.remove('show');
}

// =============================================
// COMPARTIR LA PÁGINA
// =============================================
function shareVia(platform) {
    const imgUrl = 'https://cxr10s.github.io/Img.png'; // Imagen representativa para compartir
    const url   = 'https://cxr10s.github.io';
    const title = 'Tienda Deportiva';
    const text  = 'Mira esta tienda deportiva: Camisetas, Tenis, Jeans, Cascos y más. Envío gratis desde $150.000 COP.';

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
            // Fallback para navegadores sin clipboard API
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

    if (links[platform]) {
        window.open(links[platform], '_blank', 'noopener,noreferrer');
    }
}

// =============================================
// INICIALIZAR CARRITO AL CARGAR LA PÁGINA
// =============================================
window.addEventListener('DOMContentLoaded', function() {
    loadCart();
    _initCartAuthSync();  // ← sincronizar carrito con cuenta Google
    if (cart.length > 0) {
        updateCartDisplay();
        updateCartIcon();
        // Solo verificar regalo si NO hay ya uno en el carrito guardado
        const yaHayRegalo = cart.some(item => item.isGift === true);
        if (!yaHayRegalo) {
            checkGiftEligibility();
        }
    }
});
