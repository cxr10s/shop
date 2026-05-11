
const fmt = (n) => `${Math.round(Number(n || 0)).toLocaleString('es-CO')}`;

/**
 * Carga jsPDF de forma segura
 */
const LoadJsPDF = () => {
    return new Promise((resolve, reject) => {

        // Ya cargado correctamente
        if (window.jspdf?.jsPDF) {
            return resolve(window.jspdf.jsPDF);
        }

        // Evitar cargar múltiples veces
        const existing = document.querySelector(
            'script[src*="jspdf.umd.min.js"]'
        );

        if (existing) {
            waitForJsPDF(resolve, reject);
            return;
        }

        const s = document.createElement('script');

        s.src =
            'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';

        s.async = true;

        s.onload = () => {
            waitForJsPDF(resolve, reject);
        };

        s.onerror = () => {
            reject(new Error('Error de red cargando jsPDF'));
        };

        document.head.appendChild(s);
    });
};

/**
 * Espera hasta que jsPDF esté realmente inicializado
 */
function waitForJsPDF(resolve, reject) {
    let attempts = 0;
    const maxAttempts = 60;

    const check = () => {

        if (window.jspdf?.jsPDF) {
            resolve(window.jspdf.jsPDF);
            return;
        }

        attempts++;

        if (attempts >= maxAttempts) {
            reject(new Error('jsPDF no inicializó correctamente'));
            return;
        }

        setTimeout(check, 25);
    };

    check();
}

async function generarFacturaPDF(pedido) {

    try {

        // =========================================
        // VALIDACIONES
        // =========================================

        if (!pedido) {
            throw new Error('No se recibió el pedido');
        }

        if (!Array.isArray(pedido.productos)) {
            throw new Error('La lista de productos es inválida');
        }

        // =========================================
        // CARGA SEGURA DE jsPDF
        // =========================================

        const jsPDF = await LoadJsPDF();

        // =========================================
        // DOCUMENTO
        // =========================================

        const doc = new jsPDF({
            unit: 'mm',
            format: 'a4',
            orientation: 'portrait'
        });

        const W = 210;
        const H = 297;
        const margin = 20;

        const C = {
            dark: [20, 20, 28],
            accent: [173, 255, 47],
            purple: [99, 60, 180],
            text: [40, 40, 45],
            muted: [130, 130, 145],
            border: [230, 230, 235],
            bg: [248, 249, 252],
            white: [255, 255, 255]
        };

        let y = 0;

        // =========================================
        // HEADER
        // =========================================

        doc.setFillColor(...C.dark);
        doc.rect(0, 0, W, 55, 'F');

        doc.setFillColor(...C.accent);
        doc.rect(0, 0, 5, 55, 'F');

        doc.setTextColor(...C.accent);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(26);

        doc.text('SHOP.', margin, 22);

        doc.setTextColor(180, 180, 190);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);

        doc.text(
            'NIT: 900.876.543-2 | Bogotá, Colombia',
            margin,
            30
        );

        doc.text(
            'tiendadeportiva.com',
            margin,
            35
        );

        // =========================================
        // BADGE FACTURA
        // =========================================

        const id = String(
            pedido.id || 'LOCAL000'
        )
        .substring(0, 8)
        .toUpperCase();

        doc.setFillColor(...C.purple);

        doc.roundedRect(
            W - margin - 55,
            12,
            55,
            30,
            3,
            3,
            'F'
        );

        doc.setTextColor(...C.white);

        doc.setFont('helvetica', 'bold');

        doc.setFontSize(8);

        doc.text(
            'ORDEN DE COMPRA',
            W - margin - 27.5,
            20,
            { align: 'center' }
        );

        doc.setFontSize(14);

        doc.text(
            `#${id}`,
            W - margin - 27.5,
            30,
            { align: 'center' }
        );

        // =========================================
        // CLIENTE
        // =========================================

        y = 65;

        doc.setFillColor(...C.bg);

        doc.roundedRect(
            margin,
            y,
            W - (margin * 2),
            35,
            2,
            2,
            'F'
        );

        doc.setTextColor(...C.purple);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);

        doc.text(
            'DATOS DEL CLIENTE',
            margin + 6,
            y + 8
        );

        doc.setTextColor(...C.text);

        doc.setFontSize(11);

        doc.text(
            pedido.nombre || 'Cliente General',
            margin + 6,
            y + 16
        );

        doc.setTextColor(...C.muted);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);

        doc.text(
            `Documento: ${pedido.documento || 'N/A'}`,
            margin + 6,
            y + 23
        );

        doc.text(
            `Email: ${pedido.email || '—'}`,
            margin + 6,
            y + 28
        );

        // =========================================
        // TABLA PRODUCTOS
        // =========================================

        y += 45;

        doc.setFillColor(...C.dark);

        doc.roundedRect(
            margin,
            y,
            W - (margin * 2),
            10,
            1,
            1,
            'F'
        );

        doc.setTextColor(...C.white);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);

        doc.text(
            'DESCRIPCIÓN',
            margin + 5,
            y + 6.5
        );

        doc.text(
            'CANT',
            W - 70,
            y + 6.5,
            { align: 'right' }
        );

        doc.text(
            'TOTAL',
            W - margin - 5,
            y + 6.5,
            { align: 'right' }
        );

        y += 10;

        pedido.productos.forEach((prod, i) => {

            if (i % 2 !== 0) {
                doc.setFillColor(...C.bg);

                doc.rect(
                    margin,
                    y,
                    W - (margin * 2),
                    11,
                    'F'
                );
            }

            const nombre = String(
                prod?.name || 'Producto'
            ).substring(0, 45);

            const cantidad = Number(
                prod?.quantity || 0
            );

            const precio = Number(
                prod?.price || 0
            );

            const subtotalProducto =
                prod?.isGift
                    ? 0
                    : precio * cantidad;

            doc.setTextColor(...C.text);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);

            doc.text(
                nombre,
                margin + 5,
                y + 7
            );

            doc.text(
                String(cantidad),
                W - 70,
                y + 7,
                { align: 'right' }
            );

            doc.setFont('helvetica', 'bold');

            doc.text(
                prod?.isGift
                    ? 'GRATIS'
                    : `$${fmt(subtotalProducto)}`,
                W - margin - 5,
                y + 7,
                { align: 'right' }
            );

            y += 11;
        });

        // =========================================
        // TOTALES
        // =========================================

        y += 7;

        const subtotal = Number(
            pedido.subtotal || 0
        );

        const iva = subtotal * 0.19;

        const envio = Number(
            pedido.envio || 0
        );

        const descuento = Number(
            pedido.descuento || 0
        );

        const total =
            pedido.total ??
            (subtotal + iva + envio - descuento);

        const drawTotal = (
            label,
            value,
            isBold = false
        ) => {

            doc.setTextColor(
                ...(isBold ? C.text : C.muted)
            );

            doc.setFont(
                'helvetica',
                isBold ? 'bold' : 'normal'
            );

            doc.setFontSize(
                isBold ? 11 : 9
            );

            doc.text(
                label,
                W - 90,
                y
            );

            doc.text(
                `$${fmt(value)}`,
                W - margin - 5,
                y,
                { align: 'right' }
            );

            y += 7;
        };

        drawTotal('Subtotal:', subtotal);

        drawTotal('IVA (19%):', iva);

        if (envio > 0) {
            drawTotal('Envío:', envio);
        }

        if (descuento > 0) {
            drawTotal(
                'Descuento:',
                -descuento
            );
        }

        y += 2;

        drawTotal(
            'TOTAL:',
            total,
            true
        );

        // =========================================
        // FOOTER
        // =========================================

        doc.setFont('helvetica', 'normal');

        doc.setFontSize(7);

        doc.setTextColor(...C.muted);

        doc.text(
            'Gracias por tu compra. Conserva este documento.',
            W / 2,
            H - 12,
            { align: 'center' }
        );

        // =========================================
        // DESCARGA
        // =========================================

        doc.save(
            `Factura_SHOP_${id}.pdf`
        );

        console.log(
            'Factura descargada con éxito.'
        );

    } catch (error) {

        console.error(
            'Fallo Crítico en Generador:',
            error
        );

        alert(
            'No se pudo generar la factura.\n\n' +
            error.message
        );
    }
}
