// =============================================
// CONFIGURACIÓN SUPABASE
// =============================================
const SUPABASE_URL      = 'https://qvaaistunotxgpyqebya.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2YWFpc3R1bm90eGdweXFlYnlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxMTk2MzMsImV4cCI6MjA4OTY5NTYzM30.eG62aFEYEtigW7Vb9wJ2VCDK4HVzKCxEredHmVNZXjU';

// =============================================
// GUARDAR PEDIDO EN SUPABASE
// =============================================
async function guardarPedidoEnSupabase(pedido) {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/pedidos`, {
        method: 'POST',
        headers: {
            'Content-Type':  'application/json',
            'apikey':        SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Prefer':        'return=representation'
        },
        body: JSON.stringify(pedido)
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al guardar el pedido');
    }
    return await response.json();
}

// =============================================
// SUBMIT → sessionStorage → pago-nequi.html
// =============================================
async function submitReservation(event) {
    event.preventDefault();

    if (cart.length === 0) { showNotification('Tu carrito está vacío'); return; }

    let nombre = document.getElementById('reservation-name').value.trim();
    nombre = nombre.split(' ').filter(Boolean)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

    const telefono  = document.getElementById('reservation-phone').value.trim();
    const email     = document.getElementById('reservation-email').value.trim();
    const direccion = document.getElementById('reservation-address').value.trim();
    const notas     = document.getElementById('reservation-notes').value.trim();

    if (!nombre || !telefono || !email || !direccion) {
        showNotification('Por favor completa todos los campos obligatorios'); return;
    }
    if (!validateName(nombre.replace(/\s+/g, ''))) {
        showNotification('El nombre solo puede contener letras y espacios.'); return;
    }
    if (!validateEmail(email)) {
        showNotification('Solo se aceptan correos @gmail.com, @hotmail.com o @outlook.com'); return;
    }
    if (!validatePhone(telefono)) {
        showNotification('El teléfono debe tener exactamente 10 dígitos.'); return;
    }

    const subtotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const { amount: descuento } = calcDiscount(subtotal);

    const pedido = {
        nombre, telefono, email, direccion,
        notas: notas || null,
        documento: (() => { try { const t = document.getElementById('doc-tipo'); const d = document.getElementById('documento'); return t && d ? `${t.value} ${d.value.trim()}` : null; } catch(e){ return null; } })(),
        productos: cart.map(i => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity, isGift: i.isGift || false })),
        subtotal, descuento,
        envio: 0,        // se define en pago-nequi.html según tipo de entrega
        total: subtotal - descuento,
        estado: 'pendiente', estado_pago: 'pendiente'
    };

    const btn = document.querySelector('.payment-submit-btn');
    if (btn) { btn.disabled = true; btn.querySelector('.submit-btn-text').textContent = 'Procesando...'; }

    try {
        sessionStorage.setItem('store_pedido', JSON.stringify(pedido));
        sessionStorage.setItem('store_user', JSON.stringify({ email, displayName: nombre, telefono }));

        cart = [];
        window._lastRemovedGiftId = null;
        try { localStorage.removeItem('tienda_cart'); localStorage.removeItem('tienda_last_removed_gift'); } catch(e) {}
        updateCartDisplay();
        updateCartIcon();
        closeReservationModal();

        window.location.href = 'https://cxr10s.github.io/tienda/pago-nequi.html';

    } catch (error) {
        console.error('Error:', error);
        showNotification('❌ Error al procesar. Intenta de nuevo.');
        if (btn) { btn.disabled = false; btn.querySelector('.submit-btn-text').textContent = 'Realizar Pedido'; }
    }
}

document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('reservation-form');
    if (form) form.addEventListener('submit', submitReservation);
});
