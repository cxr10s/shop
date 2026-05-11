async function generarFacturaPDF(pedido) {

    try {

        // ==================================================
        // VALIDACIÓN
        // ==================================================

        if (!pedido) {
            throw new Error('Pedido inválido');
        }

        // ==================================================
        // CARGAR JSPDF
        // ==================================================

        if (!window.jspdf?.jsPDF) {

            await new Promise((resolve, reject) => {

                const script = document.createElement('script');

                script.src =
                    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';

                script.onload = resolve;

                script.onerror = () => {
                    reject(
                        new Error('No se pudo cargar jsPDF')
                    );
                };

                document.head.appendChild(script);
            });
        }

        const { jsPDF } = window.jspdf;

        // ==================================================
        // DOCUMENTO
        // ==================================================

        const doc = new jsPDF({
            unit: 'mm',
            format: 'a4',
            orientation: 'portrait'
        });

        const W = 210;
        const H = 297;
        const margin = 18;

        const C = {
            dark: [20, 20, 28],
            purple: [99, 60, 180],
            accent: [173, 255, 47],
            gray: [120, 120, 135],
            light: [245, 245, 250],
            border: [228, 228, 235],
            text: [35, 35, 40],
            white: [255, 255, 255],
            green: [22, 163, 74],
            red: [220, 38, 38]
        };

        // Compatibilidad
        if (!doc.roundedRect && doc.roundRect) {
            doc.roundedRect = doc.roundRect;
        }

        // ==================================================
        // HELPERS
        // ==================================================

        const fmt = (n) => {
            return Math.round(Number(n || 0))
                .toLocaleString('es-CO');
        };

        const line = (y) => {

            doc.setDrawColor(...C.border);

            doc.setLineWidth(0.3);

            doc.line(
                margin,
                y,
                W - margin,
                y
            );
        };

        const textRight = (txt, x, y) => {
            doc.text(txt, x, y, {
                align: 'right'
            });
        };

        // ==================================================
        // DATOS
        // ==================================================

        const id = String(
            pedido.id || 'LOCAL000'
        )
        .substring(0, 8)
        .toUpperCase();

        const fecha = pedido.created_at
            ? new Date(pedido.created_at)
            : new Date();

        const fechaStr =
            fecha.toLocaleDateString('es-CO');

        const horaStr =
            fecha.toLocaleTimeString('es-CO');

        const productos =
            Array.isArray(pedido.productos)
                ? pedido.productos
                : [];

        const subtotal =
            Number(pedido.subtotal || 0);

        const envio =
            Number(pedido.envio || 0);

        const descuento =
            Number(pedido.descuento || 0);

        const iva =
            subtotal * 0.19;

        const total =
            pedido.total ??
            (subtotal + iva + envio - descuento);

        // ==================================================
        // HEADER
        // ==================================================

        doc.setFillColor(...C.dark);

        doc.rect(0, 0, W, 48, 'F');

        doc.setFillColor(...C.accent);

        doc.rect(0, 0, 5, 48, 'F');

        // LOGO
        doc.setTextColor(...C.accent);

        doc.setFont('helvetica', 'bold');

        doc.setFontSize(26);

        doc.text(
            'SHOP.',
            margin,
            22
        );

        doc.setTextColor(200, 200, 210);

        doc.setFont('helvetica', 'normal');

        doc.setFontSize(8.5);

        doc.text(
            'Tienda Deportiva Colombia',
            margin,
            30
        );

        doc.text(
            'shopdeportivo.com',
            margin,
            36
        );

        // FACTURA BOX
        doc.setFillColor(...C.purple);

        doc.roundedRect(
            W - 70,
            10,
            52,
            28,
            3,
            3,
            'F'
        );

        doc.setTextColor(...C.white);

        doc.setFont('helvetica', 'bold');

        doc.setFontSize(8);

        doc.text(
            'FACTURA',
            W - 44,
            18,
            { align: 'center' }
        );

        doc.setFontSize(14);

        doc.text(
            `#${id}`,
            W - 44,
            28,
            { align: 'center' }
        );

        doc.setFontSize(7);

        doc.setFont('helvetica', 'normal');

        doc.text(
            fechaStr,
            W - 44,
            34,
            { align: 'center' }
        );

        // ==================================================
        // CLIENTE
        // ==================================================

        let y = 60;

        doc.setFillColor(...C.light);

        doc.roundedRect(
            margin,
            y,
            W - margin * 2,
            38,
            3,
            3,
            'F'
        );

        doc.setTextColor(...C.purple);

        doc.setFont('helvetica', 'bold');

        doc.setFontSize(7);

        doc.text(
            'DATOS DEL CLIENTE',
            margin + 5,
            y + 8
        );

        doc.setTextColor(...C.text);

        doc.setFontSize(11);

        doc.text(
            pedido.nombre || 'Cliente General',
            margin + 5,
            y + 17
        );

        doc.setFont('helvetica', 'normal');

        doc.setFontSize(9);

        doc.setTextColor(...C.gray);

        doc.text(
            `Documento: ${pedido.documento || 'N/A'}`,
            margin + 5,
            y + 25
        );

        doc.text(
            `Email: ${pedido.email || 'No registrado'}`,
            margin + 5,
            y + 31
        );

        // ==================================================
        // ESTADO
        // ==================================================

        y += 48;

        const estado =
            pedido.estado || 'pendiente';

        let estadoColor = C.gray;

        if (estado === 'pagado') {
            estadoColor = C.green;
        }

        if (estado === 'cancelado') {
            estadoColor = C.red;
        }

        doc.setFillColor(...estadoColor);

        doc.roundedRect(
            margin,
            y,
            45,
            9,
            4,
            4,
            'F'
        );

        doc.setTextColor(...C.white);

        doc.setFont('helvetica', 'bold');

        doc.setFontSize(8);

        doc.text(
            estado.toUpperCase(),
            margin + 22.5,
            y + 6,
            { align: 'center' }
        );

        // ==================================================
        // TABLA PRODUCTOS
        // ==================================================

        y += 18;

        doc.setFillColor(...C.dark);

        doc.roundedRect(
            margin,
            y,
            W - margin * 2,
            10,
            2,
            2,
            'F'
        );

        doc.setTextColor(...C.white);

        doc.setFontSize(8);

        doc.setFont('helvetica', 'bold');

        doc.text(
            'PRODUCTO',
            margin + 5,
            y + 6.5
        );

        textRight(
            'CANT.',
            W - 75,
            y + 6.5
        );

        textRight(
            'UNIT.',
            W - 45,
            y + 6.5
        );

        textRight(
            'TOTAL',
            W - margin - 4,
            y + 6.5
        );

        y += 10;

        productos.forEach((p, i) => {

            if (i % 2 !== 0) {

                doc.setFillColor(...C.light);

                doc.rect(
                    margin,
                    y,
                    W - margin * 2,
                    11,
                    'F'
                );
            }

            const nombre = String(
                p?.name || 'Producto'
            ).substring(0, 42);

            const cantidad =
                Number(p?.quantity || 0);

            const precio =
                Number(p?.price || 0);

            const sub =
                cantidad * precio;

            doc.setTextColor(...C.text);

            doc.setFont('helvetica', 'normal');

            doc.setFontSize(8.5);

            doc.text(
                nombre,
                margin + 5,
                y + 7
            );

            textRight(
                String(cantidad),
                W - 75,
                y + 7
            );

            textRight(
                `$${fmt(precio)}`,
                W - 45,
                y + 7
            );

            doc.setFont(
                'helvetica',
                'bold'
            );

            textRight(
                `$${fmt(sub)}`,
                W - margin - 4,
                y + 7
            );

            y += 11;
        });

        // ==================================================
        // TOTALES
        // ==================================================

        y += 8;

        const bx = W - 90;

        doc.setFillColor(...C.light);

        doc.roundedRect(
            bx,
            y - 5,
            72,
            38,
            3,
            3,
            'F'
        );

        doc.setTextColor(...C.gray);

        doc.setFont('helvetica', 'normal');

        doc.setFontSize(9);

        doc.text(
            'Subtotal',
            bx + 5,
            y + 2
        );

        textRight(
            `$${fmt(subtotal)}`,
            W - 22,
            y + 2
        );

        doc.text(
            'IVA (19%)',
            bx + 5,
            y + 10
        );

        textRight(
            `$${fmt(iva)}`,
            W - 22,
            y + 10
        );

        doc.text(
            'Envio',
            bx + 5,
            y + 18
        );

        textRight(
            `$${fmt(envio)}`,
            W - 22,
            y + 18
        );

        if (descuento > 0) {

            doc.setTextColor(...C.green);

            doc.text(
                'Descuento',
                bx + 5,
                y + 26
            );

            textRight(
                `-$${fmt(descuento)}`,
                W - 22,
                y + 26
            );
        }

        line(y + 30);

        doc.setTextColor(...C.text);

        doc.setFont(
            'helvetica',
            'bold'
        );

        doc.setFontSize(11);

        doc.text(
            'TOTAL',
            bx + 5,
            y + 38
        );

        textRight(
            `$${fmt(total)}`,
            W - 22,
            y + 38
        );

        // ==================================================
        // FOOTER
        // ==================================================

        doc.setFillColor(...C.dark);

        doc.rect(
            0,
            H - 12,
            W,
            12,
            'F'
        );

        doc.setFillColor(...C.accent);

        doc.rect(
            0,
            H - 12,
            60,
            12,
            'F'
        );

        doc.setTextColor(...C.dark);

        doc.setFont(
            'helvetica',
            'bold'
        );

        doc.setFontSize(8);

        doc.text(
            'SHOP.',
            30,
            H - 4
        );

        doc.setTextColor(...C.white);

        doc.setFont(
            'helvetica',
            'normal'
        );

        doc.setFontSize(7);

        doc.text(
            `Pedido #${id}`,
            W / 2,
            H - 4,
            { align: 'center' }
        );

        doc.text(
            'Gracias por tu compra',
            W - margin,
            H - 4,
            { align: 'right' }
        );

        // ==================================================
        // DESCARGA
        // ==================================================

        doc.save(
            `Factura-${id}.pdf`
        );

    } catch (err) {

        console.error(err);

        alert(
            'Error generando factura:\n\n' +
            err.message
        );
    }
}
