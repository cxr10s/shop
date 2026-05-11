async function generarFacturaPDF(pedido) {

    try {

        // ==============================
        // VALIDACIONES
        // ==============================

        if (!pedido) {
            throw new Error('Pedido inválido');
        }

        // ==============================
        // CARGAR JSPDF
        // ==============================

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

        // ==============================
        // JSPDF
        // ==============================

        const { jsPDF } = window.jspdf;

        const doc = new jsPDF();

        // Compatibilidad
        if (!doc.roundedRect && doc.roundRect) {
            doc.roundedRect = doc.roundRect;
        }

        // ==============================
        // DATOS
        // ==============================

        const id = String(
            pedido.id || 'LOCAL'
        ).substring(0, 8);

        const productos = Array.isArray(
            pedido.productos
        )
            ? pedido.productos
            : [];

        // ==============================
        // HEADER
        // ==============================

        doc.setFillColor(20, 20, 28);

        doc.rect(0, 0, 210, 50, 'F');

        doc.setTextColor(255, 255, 255);

        doc.setFontSize(24);

        doc.text('SHOP.', 20, 25);

        // ==============================
        // CLIENTE
        // ==============================

        doc.setTextColor(40, 40, 40);

        doc.setFontSize(12);

        doc.text(
            `Cliente: ${pedido.nombre || 'General'}`,
            20,
            70
        );

        doc.text(
            `Documento: ${pedido.documento || 'N/A'}`,
            20,
            80
        );

        // ==============================
        // PRODUCTOS
        // ==============================

        let y = 110;

        doc.setFontSize(11);

        productos.forEach((p) => {

            const nombre = String(
                p?.name || 'Producto'
            );

            const cantidad = Number(
                p?.quantity || 0
            );

            const precio = Number(
                p?.price || 0
            );

            const subtotal =
                cantidad * precio;

            doc.text(
                nombre,
                20,
                y
            );

            doc.text(
                `${cantidad}`,
                120,
                y
            );

            doc.text(
                `$${subtotal.toLocaleString('es-CO')}`,
                160,
                y
            );

            y += 10;
        });

        // ==============================
        // TOTAL
        // ==============================

        const total = Number(
            pedido.total || 0
        );

        y += 10;

        doc.setFontSize(14);

        doc.text(
            `TOTAL: $${total.toLocaleString('es-CO')}`,
            20,
            y
        );

        // ==============================
        // GUARDAR
        // ==============================

        doc.save(
            `Factura-${id}.pdf`
        );

    } catch (err) {

        console.error(err);

        alert(err.message);
    }
}
