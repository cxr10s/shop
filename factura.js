/**
 * FACTURA.JS — Professional Edition v2.1
 * Core: jsPDF with High-Performance Rendering
 * Design: Modern Minimalist / Sports Branding
 */

// Utilidad de formateo de moneda para Colombia (COP)
const fmt = (n) => `${Math.round(Number(n)).toLocaleString('es-CO')}`;

/**
 * Función principal para generar el PDF
 * @param {Object} pedido - Objeto con la información de la compra
 */
async function generarFacturaPDF(pedido) {
    // 1. Guardrail: Validación de integridad de datos
    if (!pedido || !pedido.productos) {
        console.error('Error: Datos del pedido incompletos.');
        return;
    }

    // 2. Inyección optimizada de dependencia (jsPDF)
    if (!window.jspdf) {
        await new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
            s.async = true; 
            s.onload = resolve;
            s.onerror = () => reject('Error cargando motor de PDF');
            document.head.appendChild(s);
        });
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

    // --- CONFIGURACIÓN DE DISEÑO ---
    const W = 210;
    const margin = 20;
    const C = {
        dark: [20, 20, 28],      // Fondo elegante
        accent: [173, 255, 47],  // Verde Lima (High Visibility)
        purple: [99, 60, 180],   // Marca secundaria
        text: [40, 40, 45],      // Texto principal
        muted: [130, 130, 145],  // Texto secundario
        border: [230, 230, 235], // Divisores
        bg: [248, 249, 252]      // Fondos de tarjetas
    };

    let y = 0;

    // --- HELPERS DE RENDERIZADO ---
    const setF = (color, size, style = 'normal') => {
        doc.setTextColor(...color);
        doc.setFontSize(size);
        doc.setFont('helvetica', style);
    };

    const drawLine = (ly) => {
        doc.setDrawColor(...C.border);
        doc.setLineWidth(0.2);
        doc.line(margin, ly, W - margin, ly);
    };

    // --- SECCIÓN 1: HEADER & BRANDING ---
    doc.setFillColor(...C.dark);
    doc.rect(0, 0, W, 55, 'F');
    
    // Detalle estético lateral
    doc.setFillColor(...C.accent);
    doc.rect(0, 0, 5, 55, 'F');

    setF(C.accent, 26, 'bold');
    doc.text('SHOP.', margin, 22);
    
    setF([180, 180, 190], 9);
    doc.text('NIT: 900.876.543-2', margin, 30);
    doc.text('Calle 13 #25-66, Bogotá D.C.', margin, 35);
    doc.text('tiendadeportiva.com', margin, 40);

    // Badge Factura (Derecha)
    const id = (pedido.id || 'N/A').substring(0, 8).toUpperCase();
    doc.setFillColor(...C.purple);
    doc.roundedRect(W - margin - 55, 12, 55, 30, 3, 3, 'F');
    
    setF([255, 255, 255], 8, 'bold');
    doc.text('ORDEN DE COMPRA', W - margin - 27.5, 20, { align: 'center' });
    doc.setFontSize(14);
    doc.text(`#${id}`, W - margin - 27.5, 30, { align: 'center' });
    
    setF([220, 220, 220], 7.5);
    const fecha = new Date().toLocaleDateString('es-CO', { day:'2-digit', month:'short', year:'numeric' });
    doc.text(fecha.toUpperCase(), W - margin - 27.5, 38, { align: 'center' });

    // --- SECCIÓN 2: CLIENTE Y ENVÍO ---
    y = 65;
    doc.setFillColor(...C.bg);
    doc.roundedRect(margin, y, W - (margin * 2), 35, 2, 2, 'F');

    setF(C.purple, 7, 'bold');
    doc.text('CLIENTE', margin + 6, y + 8);
    setF(C.text, 11, 'bold');
    doc.text(pedido.nombre || 'Cliente General', margin + 6, y + 16);
    
    setF(C.muted, 9);
    doc.text(`Documento: ${pedido.documento || 'No registrado'}`, margin + 6, y + 23);
    doc.text(`Email: ${pedido.email || '—'}`, margin + 6, y + 28);

    setF(C.purple, 7, 'bold');
    doc.text('ENTREGA', W - margin - 60, y + 8);
    setF(C.text, 9, 'normal');
    const dir = pedido.direccion_envio || pedido.direccion || 'Recogida en tienda';
    const dirLines = doc.splitTextToSize(dir, 55);
    doc.text(dirLines, W - margin - 60, y + 14);

    // --- SECCIÓN 3: TABLA DE PRODUCTOS ---
    y += 48;
    
    // Header de Tabla
    doc.setFillColor(...C.dark);
    doc.roundedRect(margin, y, W - (margin * 2), 10, 1, 1, 'F');
    setF([255, 255, 255], 8, 'bold');
    doc.text('DESCRIPCIÓN DEL ARTÍCULO', margin + 5, y + 6.5);
    doc.text('CANT.', W - 70, y + 6.5, { align: 'right' });
    doc.text('UNITARIO', W - 45, y + 6.5, { align: 'right' });
    doc.text('SUBTOTAL', W - margin - 5, y + 6.5, { align: 'right' });

    y += 10;

    // Cuerpo de Tabla
    pedido.productos.forEach((prod, i) => {
        if (i % 2 !== 0) {
            doc.setFillColor(...C.bg);
            doc.rect(margin, y, W - (margin * 2), 11, 'F');
        }
        
        setF(C.text, 9);
        const name = prod.name + (prod.isGift ? ' (Regalo)' : '');
        doc.text(name, margin + 5, y + 7);
        
        setF(C.muted, 9);
        doc.text(String(prod.quantity), W - 70, y + 7, { align: 'right' });
        
        if (prod.isGift) {
            setF(C.purple, 8, 'bold');
            doc.text('GRATIS', W - 45, y + 7, { align: 'right' });
            doc.text('GRATIS', W - margin - 5, y + 7, { align: 'right' });
        } else {
            setF(C.muted, 9);
            doc.text(`$${fmt(prod.price)}`, W - 45, y + 7, { align: 'right' });
            setF(C.text, 9, 'bold');
            doc.text(`$${fmt(prod.price * prod.quantity)}`, W - margin - 5, y + 7, { align: 'right' });
        }
        
        drawLine(y + 11);
        y += 11;
    });

    // --- SECCIÓN 4: TOTALES ---
    y += 10;
    const calcSubtotal = pedido.subtotal || 0;
    const calcIva = calcSubtotal * 0.19; // IVA Estándar
    const calcEnvio = pedido.envio || 0;
    const calcDesc = pedido.descuento || 0;
    const calcTotal = calcSubtotal + calcIva + calcEnvio - calcDesc;

    const rowTotal = (label, value, isFinal = false) => {
        if (isFinal) {
            doc.setFillColor(...C.dark);
            doc.roundedRect(W - 90, y - 5, 70, 12, 1, 1, 'F');
            setF(C.accent, 11, 'bold');
        } else {
            setF(C.muted, 9);
        }
        doc.text(label, W - 85, y + 2.5);
        doc.text(`$${fmt(value)}`, W - margin - 5, y + 2.5, { align: 'right' });
        y += 8;
    };

    rowTotal('Subtotal Neto', calcSubtotal);
    rowTotal('IVA (19%)', calcIva);
    if (calcEnvio > 0) rowTotal('Gastos de Envío', calcEnvio);
    if (calcDesc > 0) {
        setF([22, 163, 74], 9); // Color verde para descuentos
        rowTotal('Descuento aplicado', -calcDesc);
    }
    y += 4;
    rowTotal('TOTAL A PAGAR', calcTotal, true);

    // --- SECCIÓN 5: FOOTER LEGAL & GARANTÍA ---
    y = 265;
    drawLine(y);
    
    setF(C.muted, 7, 'normal');
    const legal = [
        'Esta es una representación gráfica de una factura electrónica.',
        'Garantía: 30 días por defectos de fábrica con este comprobante.',
        'Visita cxr10s.github.io/tienda para rastrear tu envío.'
    ];
    legal.forEach((text, i) => {
        doc.text(text, W/2, y + 5 + (i * 4), { align: 'center' });
    });

    // Barra de cierre estética
    doc.setFillColor(...C.dark);
    doc.rect(0, 287, W, 10, 'F');
    doc.setFillColor(...C.accent);
    doc.rect(0, 287, 60, 10, 'F');
    
    setF(C.dark, 8, 'bold');
    doc.text('SHOP. OFFICIAL STORE', 30, 293.5, { align: 'center' });
    setF([255, 255, 255], 7);
    doc.text(`ID Transacción: ${id}-TX`, W - margin, 293.5, { align: 'right' });

    // 3. Descarga Directa (Trigger)
    doc.save(`Factura_SHOP_${id}.pdf`);
}
