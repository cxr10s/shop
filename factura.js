// =============================================
// FACTURA.JS — Generador de facturas PDF
// Diseño moderno con jsPDF
// =============================================

function fmt(n) {
    return Math.round(Number(n)).toLocaleString('es-CO');
}

async function generarFacturaPDF(pedido) {
    if (!pedido) {
        alert('Error: no se encontró la información del pedido.');
        return;
    }

    // Cargar jsPDF si no está disponible
    if (!window.jspdf) {
        await new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
            s.onload = resolve;
            s.onerror = () => reject(new Error('No se pudo cargar jsPDF'));
            document.head.appendChild(s);
        });
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

    const W      = 210;
    const H      = 297;
    const margin = 18;
    let   y      = 0;

    // ── Paleta ───────────────────────────────────
    const C = {
        black:      [14,  14,  14 ],
        dark:       [28,  28,  35 ],
        purple:     [99,  60,  180],
        purpleLight:[124, 88,  213],
        green:      [22,  163, 74 ],
        greenLight: [240, 253, 244],
        red:        [220, 38,  38 ],
        gray:       [110, 110, 125],
        grayLight:  [245, 245, 250],
        border:     [226, 226, 235],
        white:      [255, 255, 255],
        accent:     [173, 255, 47 ], // verde lima
    };

    // ── Helpers ──────────────────────────────────
    const setColor  = (r,g,b) => doc.setTextColor(r,g,b);
    const setFill   = (r,g,b) => doc.setFillColor(r,g,b);
    const setStroke = (r,g,b) => doc.setDrawColor(r,g,b);

    function badge(x, by, w, h, text, bg, textColor = C.white, fontSize = 8) {
        setFill(...bg);
        doc.roundedRect(x, by, w, h, h/2, h/2, 'F');
        setColor(...textColor);
        doc.setFont('helvetica','bold');
        doc.setFontSize(fontSize);
        doc.text(text, x + w/2, by + h/2 + 1.2, { align:'center' });
    }

    function hLine(lx, ly, lw, color = C.border, thickness = 0.4) {
        setStroke(...color);
        doc.setLineWidth(thickness);
        doc.line(lx, ly, lx + lw, ly);
    }

    // ── HEADER ───────────────────────────────────
    // Fondo oscuro completo del header
    setFill(...C.dark);
    doc.rect(0, 0, W, 52, 'F');

    // Acento izquierdo (barra verde lima)
    setFill(...C.accent);
    doc.rect(0, 0, 5, 52, 'F');

    // Logo / nombre
    setColor(...C.accent);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(26);
    doc.text('STORE.', margin + 2, 22);

    setColor(180, 180, 190);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text('Tienda Deportiva — Colombia', margin + 2, 30);
    doc.text('cxr10s.github.io/tienda', margin + 2, 37);

    // Badge de factura (derecha)
    const idCorto = (pedido.id || 'LOCAL000').substring(0, 8).toUpperCase();
    setFill(...C.purple);
    doc.roundedRect(W - margin - 52, 10, 52, 30, 4, 4, 'F');

    setColor(...C.white);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('FACTURA', W - margin - 26, 19, { align:'center' });
    doc.setFontSize(14);
    doc.text(`#${idCorto}`, W - margin - 26, 28, { align:'center' });

    const fechaObj  = pedido.created_at ? new Date(pedido.created_at) : new Date();
    const fechaStr  = fechaObj.toLocaleDateString('es-CO', { day:'2-digit', month:'short', year:'numeric' });
    const horaStr   = fechaObj.toLocaleTimeString('es-CO', { hour:'2-digit', minute:'2-digit', hour12:true }).toUpperCase();
    setColor(200, 200, 215);
    doc.setFont('helvetica','normal');
    doc.setFontSize(7);
    doc.text(`${fechaStr}  ${horaStr}`, W - margin - 26, 36, { align:'center' });

    y = 64;

    // ── SECCIÓN CLIENTE + ENTREGA ─────────────────
    // Dos columnas
    const colW = (W - margin*2 - 6) / 2;

    // Tarjeta cliente
    setFill(...C.grayLight);
    setStroke(...C.border);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, colW, 46, 3, 3, 'FD');

    setColor(...C.purple);
    doc.setFont('helvetica','bold');
    doc.setFontSize(7);
    doc.text('CLIENTE', margin + 5, y + 8);

    setColor(...C.black);
    doc.setFont('helvetica','bold');
    doc.setFontSize(10);
    doc.text(pedido.nombre || '—', margin + 5, y + 16);

    doc.setFont('helvetica','normal');
    doc.setFontSize(8);
    setColor(...C.gray);
    const emailLines = doc.splitTextToSize(pedido.email || '—', colW - 10);
    doc.text(emailLines, margin + 5, y + 23);
    doc.text(`📞 ${pedido.telefono || '—'}`, margin + 5, y + 30);
    if (pedido.documento) doc.text(`🪪 ${pedido.documento}`, margin + 5, y + 37);

    // Tarjeta entrega
    const col2X = margin + colW + 6;
    setFill(...C.grayLight);
    doc.roundedRect(col2X, y, colW, 46, 3, 3, 'FD');

    setColor(...C.purple);
    doc.setFont('helvetica','bold');
    doc.setFontSize(7);
    doc.text('ENTREGA', col2X + 5, y + 8);

    const tipoEntrega = pedido.tipo_entrega || 'tienda';
    const icono = tipoEntrega === 'domicilio' ? '🚚' : '🏪';
    const tipoLabel = tipoEntrega === 'domicilio' ? 'Envío a domicilio' : 'Recogida en tienda';
    const dirLabel  = tipoEntrega === 'domicilio'
        ? (pedido.direccion_envio || pedido.direccion || '—')
        : 'Calle 13 #25-66';

    setColor(...C.black);
    doc.setFont('helvetica','bold');
    doc.setFontSize(9);
    doc.text(`${icono} ${tipoLabel}`, col2X + 5, y + 16);

    doc.setFont('helvetica','normal');
    doc.setFontSize(8);
    setColor(...C.gray);
    const dirLines = doc.splitTextToSize(dirLabel, colW - 10);
    doc.text(dirLines, col2X + 5, y + 23);

    if (pedido.notas) {
        doc.setFontSize(7.5);
        const notaLines = doc.splitTextToSize(`Nota: ${pedido.notas}`, colW - 10);
        doc.text(notaLines, col2X + 5, y + 32);
    }

    y += 54;

    // ── ESTADO DEL PEDIDO ─────────────────────────
    const ep = pedido.estado_pago || 'pendiente';
    const es = pedido.estado      || 'pendiente';

    const pagoConfig = {
        pagado:    { label:'✅ PAGO CONFIRMADO',   bg: C.green,  text: C.white },
        cancelado: { label:'❌ PEDIDO CANCELADO',   bg: C.red,    text: C.white },
        error:     { label:'❌ PAGO RECHAZADO',     bg: C.red,    text: C.white },
        pendiente: { label:'⏳ PAGO PENDIENTE',     bg: [245,158,11], text: C.white },
    };
    const pc = pagoConfig[ep] || pagoConfig.pendiente;

    badge(margin, y, 70, 9, pc.label, pc.bg, pc.text, 7.5);

    const estadoConfig = {
        pendiente:  { label:'PENDIENTE',  bg:[245,158,11] },
        pagado:     { label:'PAGADO',     bg: C.green     },
        enviado:    { label:'EN CAMINO',  bg:[59,130,246] },
        entregado:  { label:'ENTREGADO',  bg: C.green     },
        cancelado:  { label:'CANCELADO',  bg: C.red       },
    };
    const ec = estadoConfig[es] || estadoConfig.pendiente;
    badge(margin + 76, y, 42, 9, ec.label, ec.bg, C.white, 7);

    // Método de pago
    badge(margin + 124, y, 50, 9, `💜 Nequi · #${idCorto}`, [240,235,255], [99,60,180], 7);

    y += 17;

    // ── TABLA PRODUCTOS ───────────────────────────
    // Header tabla
    setFill(...C.dark);
    doc.roundedRect(margin, y, W - margin*2, 9, 2, 2, 'F');

    setColor(...C.accent);
    doc.setFont('helvetica','bold');
    doc.setFontSize(7.5);
    doc.text('PRODUCTO', margin + 5, y + 6);

    setColor(...C.white);
    doc.text('CANT.', W - 60, y + 6, { align:'right' });
    doc.text('PRECIO UNIT.', W - 35, y + 6, { align:'right' });
    doc.text('SUBTOTAL', W - margin - 3, y + 6, { align:'right' });

    y += 9;

    const productos = Array.isArray(pedido.productos) ? pedido.productos : [];
    productos.forEach((prod, i) => {
        const bgRow = i % 2 === 0 ? C.white : [250, 249, 255];
        setFill(...bgRow);
        doc.rect(margin, y, W - margin*2, 11, 'F');

        setColor(...C.black);
        doc.setFont('helvetica', prod.isGift ? 'italic' : 'bold');
        doc.setFontSize(8.5);
        const nombre = prod.name + (prod.isGift ? ' 🎁' : '');
        doc.text(nombre, margin + 5, y + 7.5);

        doc.setFont('helvetica','normal');
        setColor(...C.gray);
        doc.text(String(prod.quantity), W - 60, y + 7.5, { align:'right' });

        if (prod.isGift) {
            setColor(...C.green);
            doc.text('GRATIS', W - 35, y + 7.5, { align:'right' });
            doc.text('GRATIS', W - margin - 3, y + 7.5, { align:'right' });
        } else {
            setColor(...C.gray);
            doc.text(`$${fmt(prod.price)}`, W - 35, y + 7.5, { align:'right' });
            setColor(...C.black);
            doc.setFont('helvetica','bold');
            doc.text(`$${fmt(prod.price * prod.quantity)}`, W - margin - 3, y + 7.5, { align:'right' });
        }

        hLine(margin, y + 11, W - margin*2);
        y += 11;
    });

    y += 6;

    // ── TOTALES ───────────────────────────────────
    const totW = 88;
    const totX = W - margin - totW;

    // Fila subtotal
    const drawTotalRow = (label, value, color = C.gray, bold = false) => {
        doc.setFont('helvetica', bold ? 'bold' : 'normal');
        doc.setFontSize(9);
        setColor(...color);
        doc.text(label, totX + 5, y);
        doc.text(value, W - margin - 3, y, { align:'right' });
        y += 7;
    };

    setFill(...C.grayLight);
    doc.roundedRect(totX, y - 4, totW, ep === 'cancelado' ? 20 : (pedido.descuento > 0 ? 36 : 29), 3, 3, 'F');

    drawTotalRow('Subtotal', `$${fmt(pedido.subtotal)} COP`);

    if (pedido.descuento > 0) {
        drawTotalRow(`Descuento`, `-$${fmt(pedido.descuento)} COP`, C.green);
    }

    const envioLabel = tipoEntrega === 'tienda' ? '—' : (pedido.envio > 0 ? `$${fmt(pedido.envio)} COP` : '¡Gratis!');
    drawTotalRow('Envío', envioLabel);

    y += 2;
    hLine(totX + 4, y, totW - 8, C.border, 0.5);
    y += 5;

    // Total final en caja destacada
    setFill(...C.dark);
    doc.roundedRect(totX, y - 5, totW, 14, 3, 3, 'F');

    setColor(...C.accent);
    doc.setFont('helvetica','bold');
    doc.setFontSize(8);
    doc.text('TOTAL', totX + 6, y + 3);

    doc.setFontSize(12);
    doc.text(`$${fmt(pedido.total)} COP`, W - margin - 3, y + 3.5, { align:'right' });

    y += 20;

    // ── ID DEL PEDIDO ─────────────────────────────
    setFill(245, 245, 255);
    setStroke(...C.border);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, W - margin*2, 16, 3, 3, 'FD');

    setColor(...C.gray);
    doc.setFont('helvetica','normal');
    doc.setFontSize(7.5);
    doc.text('Guarda este ID para rastrear tu pedido en cualquier momento:', margin + 5, y + 6);

    setColor(...C.purple);
    doc.setFont('helvetica','bold');
    doc.setFontSize(11);
    doc.text(`ID: ${idCorto}`, margin + 5, y + 13);

    setColor(...C.gray);
    doc.setFont('helvetica','normal');
    doc.setFontSize(7);
    doc.text('cxr10s.github.io/tienda/mis-pedidos.html', W - margin - 3, y + 13, { align:'right' });

    y += 24;

    // ── TIMELINE DE ESTADO ────────────────────────
    const pasosRecogida  = ['Recibido','Pagado','Entregado'];
    const pasosDomicilio = ['Recibido','Pagado','En Camino','Entregado'];
    const pasos = tipoEntrega === 'domicilio' ? pasosDomicilio : pasosRecogida;
    const ordenR = { pendiente:0, pagado:1, entregado:2, cancelado:-1 };
    const ordenD = { pendiente:0, pagado:1, enviado:2, entregado:3, cancelado:-1 };
    const orden  = tipoEntrega === 'domicilio' ? ordenD : ordenR;
    const actual = orden[es] ?? 0;

    const stepW  = (W - margin*2) / pasos.length;
    pasos.forEach((paso, i) => {
        const cx = margin + stepW * i + stepW/2;
        const done = i <= actual && es !== 'cancelado';
        const cur  = i === actual && es !== 'cancelado';

        // Línea conectora
        if (i < pasos.length - 1) {
            setStroke(...(done ? C.green : C.border));
            doc.setLineWidth(0.8);
            doc.line(cx + 5, y + 4, cx + stepW - 5, y + 4);
        }

        // Círculo
        setFill(...(done ? C.green : cur ? C.purple : C.border));
        doc.circle(cx, y + 4, 4, 'F');

        // Check o número
        setColor(...C.white);
        doc.setFont('helvetica','bold');
        doc.setFontSize(7);
        doc.text(done ? '✓' : String(i+1), cx, y + 6, { align:'center' });

        // Label
        setColor(...(done ? C.green : cur ? C.purple : C.gray));
        doc.setFont('helvetica', cur ? 'bold' : 'normal');
        doc.setFontSize(7);
        doc.text(paso, cx, y + 13, { align:'center' });
    });

    y += 22;

    // ── FOOTER ────────────────────────────────────
    // Línea de cierre
    hLine(margin, y, W - margin*2, C.border, 0.5);
    y += 8;

    setColor(...C.purple);
    doc.setFont('helvetica','bold');
    doc.setFontSize(11);
    doc.text('¡Gracias por tu compra! 🎉', W/2, y, { align:'center' });

    y += 7;
    setColor(...C.gray);
    doc.setFont('helvetica','normal');
    doc.setFontSize(8);
    doc.text('Este documento es tu comprobante de pedido. Consérvalo.', W/2, y, { align:'center' });

    y += 6;
    doc.setFontSize(7.5);
    doc.text('@tienda_deportiva912 — Síguenos para novedades y descuentos', W/2, y, { align:'center' });

    // Barra inferior verde lima
    setFill(...C.dark);
    doc.rect(0, H - 10, W, 10, 'F');
    setFill(...C.accent);
    doc.rect(0, H - 10, W/3, 10, 'F');

    setColor(...C.dark);
    doc.setFont('helvetica','bold');
    doc.setFontSize(7.5);
    doc.text('STORE.', W/6, H - 3.5, { align:'center' });

    setColor(...C.white);
    doc.setFont('helvetica','normal');
    doc.setFontSize(7);
    doc.text(`Pedido #${idCorto}`, W/2, H - 3.5, { align:'center' });
    doc.text('cxr10s.github.io/tienda', W - margin, H - 3.5, { align:'right' });

    // ── GUARDAR ───────────────────────────────────
    doc.save(`Factura-${idCorto}-STORE.pdf`);
}
