<div align="center">

# ` SHOP `

### Tienda Deportiva — Colombia

![Estado](https://img.shields.io/badge/Estado_De_La_Web_●_-Activa-adff2f?style=flat-square&labelColor=0a0a0a)

> comercio deportivo moderno con autenticación Google, pagos reales con Nequi y carrito sincronizado en la nube.

![HTML](https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white)
![CSS](https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=flat-square&logo=firebase&logoColor=black)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white)
![Nequi](https://img.shields.io/badge/Nequi-6D28D9?style=flat-square&logo=nequi&logoColor=white)
![GitHub Pages](https://img.shields.io/badge/GitHub_Pages-222?style=flat-square&logo=github&logoColor=white)

**[→ Ver tienda en linea](https://cxr10s.github.io/shop/)**

</div>

---

##  Características

| | Función | Descripción |
|---|---|---|
|  | **Carrito en la nube** | Sincronizado con la cuenta de Google via Firestore. Se restaura en cualquier dispositivo. |
|  | **Autenticación Google** | Firebase Auth. El modal se actualiza en tiempo real sin recargar la pagina. |
|  | **Pagos con Nequi** | Integracion completa con firma de integridad y redireccion de resultado. |
|  | **Facturas PDF** | Generacion automatica con PDF para usuarios |
|  | **Consulta de pedidos** | Búsqueda por correo o ID de factura con historial completo del estado. |
|  | **Descuentos** | Descuentos progresivos por cantidad desde $150.000 COP. |

---

## Estructura del proyecto

```
tienda/
├── index.html           # Pagina principal — productos, Navegacion, carrito
├── mis-pedidos.html     # Consulta de pedidos por correo o ID
├── pago-nequi.html      # Resultado del pago Nequi
├── admin.html           # Panel de administracion de pedidos
├── script.js            # Logica del carrito, Interfaz de usuario, sincronizacion Firestore
├── order-system.js      # Submit del pedido → Supabase →Nequi
├── factura.js           # Generador de PDF con jsPDF
└── styles.css           # Estilos globales
```

---

## Herramientas

| Capa | Tecnología |
|---|---|
| Frontend | HTML5, CSS3, JavaScript |
| Autenticación | Firebase Auth (Google) |
| Base de datos pedidos | Supabase (SQL) |
| Carrito en la nube | Firestore (Firebase) |
| Pagos | Nequi (Colombia) |
| Facturas PDF | jsPDF |
| Hosting | GitHub Pages |

---

## Ejecucion

El proyecto se sirve directamente desde **GitHub Pages** sin necesidad de build ni servidor.

```
https://cxr10s.github.io/shop/
---
