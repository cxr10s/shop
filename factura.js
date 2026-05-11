async function generarFacturaPDF(pedido) {
    try {
        // ==============================
        // VALIDACIONES
        // ==============================
        if (!pedido) {
            throw new Error('Pedido inválido');
        }

        // ==============================
        // CARGAR JSPDF (Optimizado)
        // ==============================
        if (!window.jspdf?.jsPDF) {
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
                script.onload = resolve;
                script.onerror = () => reject(new Error('No se pudo cargar jsPDF'));
                document.head.appendChild(script);
            });
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Compatibilidad para rectángulos redondeados
        if (!doc.roundedRect && doc.roundRect) {
            doc.roundedRect = doc.roundRect;
        }

        // ==============================
        // DATOS Y COLORES
        // ==============================
        const id = String(pedido.id || 'LOCAL').substring(0, 8).toUpperCase();
        const productos = Array.isArray(pedido.productos) ? pedido.productos : [];
        const FECHA = new Date().toLocaleDateString('es-CO');
        
        const C = {
            dark: [20, 20, 28],
            accent: [173, 255, 47], // Verde Lima
            text: [40, 40, 40],
            muted: [120, 120, 120],
            bg: [248, 249, 252]
        };

        // ==============================
        // HEADER (Diseño Moderno)
        // ==============================
        doc.setFillColor(...C.dark);
        doc.rect(0, 0, 210, 55, 'F'); // Fondo oscuro

        // Logo y Nombre
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(28);
        doc.text('SHOP', 20, 30);

        // Badge de Factura (Derecha)
        doc.setFillColor(...C.accent);
        doc.roundedRect(140, 15, 50, 25, 3, 3, 'F');
        doc.setTextColor(...C.dark);
        doc.setFontSize(9);
        doc.text('FACTURA N°', 165, 25, { align: 'center' });
        doc.setFontSize(14);
        doc.text(`#${id}`, 165, 34, { align: 'center' });

        // ==============================
        // INFO DE CLIENTE Y FECHA
        // ==============================
        doc.setTextColor(...C.text);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('CLIENTE:', 20, 70);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(12);
        doc.text(`${pedido.nombre || 'Consumidor Final'}`, 20, 78);
        
        doc.setFontSize(9);
        doc.setTextColor(...C.muted);
        doc.text(`Documento: ${pedido.documento || 'N/A'}`, 20, 84);
        doc.text(`Teléfono: ${pedido.telefono || '—'}`, 20, 89);

        // Fecha y Entrega (Columna Derecha)
        doc.setTextColor(...C.text);
        doc.setFont('helvetica', 'bold');
        doc.text('DETALLES:', 140, 70);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(`Fecha: ${FECHA}`, 140, 78);
        doc.text(`Envío: ${pedido.tipo_entrega || 'Estándar'}`, 140, 84);

        // ==============================
        // TABLA DE PRODUCTOS (Header)
        // ==============================
        let y = 110;
        doc.setFillColor(...C.bg);
        doc.rect(20, y - 7, 170, 10, 'F'); // Fondo header tabla
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(...C.dark);
        doc.text('DESCRIPCIÓN', 25, y);
        doc.text('CANT', 120, y);
        doc.text('TOTAL', 185, y, { align: 'right' });

        doc.setDrawColor(230, 230, 230);
        doc.line(20, y + 3, 190, y + 3);

        // Listado
        y += 12;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        
        productos.forEach((p, index) => {
            const subtotal = Number(p?.quantity || 0) * Number(p?.price || 0);
            
            doc.setTextColor(...C.text);
            doc.text(String(p?.name || 'Producto').substring(0, 45), 25, y);
            doc.text(String(p?.quantity || 0), 120, y);
            doc.text(`$${subtotal.toLocaleString('es-CO')}`, 185, y, { align: 'right' });
            
            y += 10;
            
            // Línea divisoria suave
            doc.setDrawColor(245, 245, 245);
            doc.line(20, y - 4, 190, y - 4);
        });

        // ==============================
        // TOTAL (Resaltado)
        // ==============================
        y += 5;
        const total = Number(pedido.total || 0);
        
        doc.setFillColor(...C.dark);
        doc.roundedRect(130, y, 60, 15, 2, 2, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text('TOTAL A PAGAR', 135, y + 9);
        
        doc.setTextColor(...C.accent);
        doc.setFontSize(13);
        doc.text(`$${total.toLocaleString('es-CO')}`, 185, y + 10, { align: 'right' });

        // ==============================
        // FOOTER (Información Legal)
        // ==============================
        doc.setTextColor(...C.muted);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.text('SHOP S.A.S - NIT # - Centro, Bucaramanga', 105, 270, { align: 'center' });
        doc.text('Señor/a Usuario/a', 105, 275, { align: 'center' });
        doc.text('Gracias por su compra. Para cambios o devoluciones conserve este recibo.', 105, 280, { align: 'center' });
        doc.text('Este documento es una representación gráfica de su pedido.', 105, 285, { align: 'center' });

        // ==============================
        // GUARDAR
        // ==============================
        doc.save(`Factura-${id}.pdf`);

    } catch (err) {
        console.error(err);
        alert('Hubo un problema al generar el PDF: ' + err.message);
    }
}
