/**
 * FACTURA.JS — Minimal Rounded Edition (Mobile hardware style)
 * Jerarquía visual optimizada y bordes suaves.
 */

async function generarFacturaPDF(pedido) {
    try {
        // 1. CARGA SEGURA DE LIBRERÍA
        if (!window.jspdf?.jsPDF) {
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
                script.onload = resolve;
                script.onerror = () => reject(new Error('Error cargando motor PDF'));
                document.head.appendChild(script);
            });
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Polyfill para redondeado
        if (!doc.roundedRect && doc.roundRect) doc.roundedRect = doc.roundRect;

        // 2. CONFIGURACIÓN DE ESTILO (Sutil & Elegante)
        const C = {
            dark: [28, 28, 35],
            accent: [173, 255, 47], 
            text: [45, 45, 50],
            muted: [140, 140, 150],
            light: [245, 246, 250],
            radius: 4 // El redondeado mínimo estilo hardware
        };

        const id = String(pedido.id || 'SHOP').substring(0, 8).toUpperCase();
        const productos = Array.isArray(pedido.productos) ? pedido.productos : [];
        const FECHA = new Date().toLocaleDateString('es-CO');

        // 3. HEADER CON BORDES REDONDEADOS INFERIORES
        doc.setFillColor(...C.dark);
        // Dibujamos el fondo oscuro con un ligero redondeado en las esquinas inferiores
        doc.roundedRect(10, 10, 190, 45, C.radius, C.radius, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(24);
        doc.text('SHOP.', 25, 30);

        // Badge de ID con redondeado tipo "botón de iPhone"
        doc.setFillColor(...C.accent);
        doc.roundedRect(145, 20, 45, 20, 5, 5, 'F');
        doc.setTextColor(...C.dark);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('PEDIDO', 167.5, 28, { align: 'center' });
        doc.setFontSize(12);
        doc.text(`#${id}`, 167.5, 35, { align: 'center' });

        // 4. TARJETA DE CLIENTE (Soft UI)
        let y = 65;
        doc.setFillColor(...C.light);
        doc.roundedRect(20, y, 170, 32, C.radius, C.radius, 'F');
        
        doc.setTextColor(...C.dark);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('DATOS DE FACTURACIÓN', 28, y + 10);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.text(`${pedido.nombre || 'Cliente General'}`, 28, y + 18);
        doc.setFontSize(9);
        doc.setTextColor(...C.muted);
        doc.text(`ID: ${pedido.documento || 'N/A'}  •  ${FECHA}`, 28, y + 25);

        // 5. TABLA DE PRODUCTOS
        y = 110;
        // Header de tabla redondeado
        doc.setFillColor(...C.dark);
        doc.roundedRect(20, y, 170, 10, 2, 2, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.text('ARTÍCULO', 28, y + 6.5);
        doc.text('CANT', 130, y + 6.5, { align: 'center' });
        doc.text('TOTAL', 182, y + 6.5, { align: 'right' });

        y += 15;
        productos.forEach((p, i) => {
            const subtotal = (p.quantity || 0) * (p.price || 0);
            
            // Fila con fondo alterno y bordes suaves
            if (i % 2 === 0) {
                doc.setFillColor(250, 250, 252);
                doc.roundedRect(20, y - 6, 170, 10, 2, 2, 'F');
            }

            doc.setTextColor(...C.text);
            doc.setFontSize(10);
            doc.text(String(p.name).substring(0, 40), 28, y + 1);
            doc.text(String(p.quantity), 130, y + 1, { align: 'center' });
            doc.setFont('helvetica', 'bold');
            doc.text(`$${subtotal.toLocaleString('es-CO')}`, 182, y + 1, { align: 'right' });
            doc.setFont('helvetica', 'normal');
            
            y += 12;
        });

        // 6. TOTAL FINAL (Estilo Card de Pago)
        y += 5;
        const total = Number(pedido.total || 0);
        
        doc.setFillColor(...C.dark);
        doc.roundedRect(120, y, 70, 18, C.radius, C.radius, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.text('TOTAL NETO', 128, y + 11);
        
        doc.setTextColor(...C.accent);
        doc.setFontSize(14);
        doc.text(`$${total.toLocaleString('es-CO')}`, 182, y + 12, { align: 'right' });

        // 7. FOOTER
        doc.setTextColor(...C.muted);
        doc.setFontSize(8);
        doc.text('Esta es una confirmación de compra digital.', 105, 285, { align: 'center' });

        // 8. ACCIÓN DE DESCARGA
        doc.save(`Factura_Shop_${id}.pdf`);

    } catch (err) {
        console.error("Error en PDF Engine:", err);
        alert("Error al descargar: " + err.message);
    }
}
