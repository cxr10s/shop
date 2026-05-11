/**
 * FACTURA.JS — Ultra-Resilient Edition v3.0
 * Corregido: Gestión de carga asíncrona y disparador de descarga.
 */

const fmt = (n) => `${Math.round(Number(n)).toLocaleString('es-CO')}`;

/**
 * Garantiza que jsPDF esté listo antes de ejecutar la lógica
 */
const LoadJsPDF = () => {
    return new Promise((resolve, reject) => {
        if (window.jspdf) return resolve(window.jspdf);
        
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        s.async = true;
        s.onload = () => {
            // Pequeño delay para asegurar que el namespace esté disponible
            setTimeout(() => {
                if (window.jspdf) resolve(window.jspdf);
                else reject(new Error("Namespace jsPDF no encontrado"));
            }, 50);
        };
        s.onerror = () => reject(new Error("Error de red cargando jsPDF"));
        document.head.appendChild(s);
    });
};

async function generarFacturaPDF(pedido) {
    try {
        // 1. Validación de entrada
        if (!pedido || !pedido.productos) {
            throw new Error("Datos del pedido insuficientes");
        }

        // 2. Carga segura del motor
        const lib = await LoadJsPDF();
        const { jsPDF } = lib;
        
        // 3. Inicialización del documento
        const doc = new jsPDF({ unit: 'mm', format: 'a4' });
        const W = 210;
        const margin = 20;
        const C = {
            dark: [20, 20, 28],
            accent: [173, 255, 47], 
            purple: [99, 60, 180],
            text: [40, 40, 45],
            muted: [130, 130, 145],
            border: [230, 230, 235],
            bg: [248, 249, 252]
        };

        let y = 0;

        // --- RENDERIZADO DE HEADER ---
        doc.setFillColor(...C.dark);
        doc.rect(0, 0, W, 55, 'F');
        doc.setFillColor(...C.accent);
        doc.rect(0, 0, 5, 55, 'F');

        doc.setTextColor(...C.accent);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(26);
        doc.text('SHOP.', margin, 22);
        
        doc.setTextColor(180, 180, 190);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text('NIT: 900.876.543-2 | Bogotá, Colombia', margin, 30);
        doc.text('tiendadeportiva.com', margin, 35);

        // Badge de Factura
        const id = (pedido.id || 'LOCAL').substring(0, 8).toUpperCase();
        doc.setFillColor(...C.purple);
        doc.roundedRect(W - margin - 55, 12, 55, 30, 3, 3, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.text('ORDEN DE COMPRA', W - margin - 27.5, 20, { align: 'center' });
        doc.setFontSize(14);
        doc.text(`#${id}`, W - margin - 27.5, 30, { align: 'center' });

        // --- INFORMACIÓN CLIENTE ---
        y = 65;
        doc.setFillColor(...C.bg);
        doc.roundedRect(margin, y, W - (margin * 2), 35, 2, 2, 'F');

        doc.setTextColor(...C.purple);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.text('DATOS DEL CLIENTE', margin + 6, y + 8);
        
        doc.setTextColor(...C.text);
        doc.setFontSize(11);
        doc.text(pedido.nombre || 'Cliente General', margin + 6, y + 16);
        
        doc.setTextColor(...C.muted);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`Documento: ${pedido.documento || 'N/A'}`, margin + 6, y + 23);
        doc.text(`Email: ${pedido.email || '—'}`, margin + 6, y + 28);

        // --- TABLA DE PRODUCTOS ---
        y += 45;
        doc.setFillColor(...C.dark);
        doc.roundedRect(margin, y, W - (margin * 2), 10, 1, 1, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('DESCRIPCIÓN', margin + 5, y + 6.5);
        doc.text('CANT', W - 70, y + 6.5, { align: 'right' });
        doc.text('TOTAL', W - margin - 5, y + 6.5, { align: 'right' });

        y += 10;
        pedido.productos.forEach((prod, i) => {
            if (i % 2 !== 0) {
                doc.setFillColor(...C.bg);
                doc.rect(margin, y, W - (margin * 2), 11, 'F');
            }
            doc.setTextColor(...C.text);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.text(prod.name.substring(0, 45), margin + 5, y + 7);
            doc.text(String(prod.quantity), W - 70, y + 7, { align: 'right' });
            
            const sub = prod.isGift ? 0 : prod.price * prod.quantity;
            doc.setFont('helvetica', 'bold');
            doc.text(prod.isGift ? 'GRATIS' : `$${fmt(sub)}`, W - margin - 5, y + 7, { align: 'right' });
            
            y += 11;
        });

        // --- TOTALES ---
        y += 5;
        const subtotal = pedido.subtotal || 0;
        const iva = subtotal * 0.19;
        const total = subtotal + iva + (pedido.envio || 0) - (pedido.descuento || 0);

        const drawTotal = (label, value, isBold = false) => {
            doc.setTextColor(...(isBold ? C.text : C.muted));
            doc.setFontSize(isBold ? 11 : 9);
            doc.setFont('helvetica', isBold ? 'bold' : 'normal');
            doc.text(label, W - 90, y);
            doc.text(`$${fmt(value)}`, W - margin - 5, y, { align: 'right' });
            y += 7;
        };

        drawTotal('Subtotal:', subtotal);
        drawTotal('IVA (19%):', iva);
        if (pedido.envio) drawTotal('Envío:', pedido.envio);
        y += 2;
        drawTotal('TOTAL:', total, true);

        // --- PIE DE PÁGINA ---
        doc.setFontSize(7);
        doc.setTextColor(...C.muted);
        doc.text('Gracias por tu compra. Para cambios, presenta este documento en los próximos 30 días.', W/2, 285, { align: 'center' });

        // 4. DISPARADOR DE DESCARGA SEGURO
        // Usamos un nombre de archivo dinámico basado en el ID
        doc.save(`Factura_SHOP_${id}.pdf`);
        console.log("Factura descargada con éxito.");

    } catch (error) {
        console.error("Fallo Crítico en Generador:", error);
        alert("No se pudo generar la factura. Detalles: " + error.message);
    }
}
