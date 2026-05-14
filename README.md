# ECOMATCH — Backend API Documentation
# integrantes -Susan Montserrat Mendez Vargas, -Diego Antonio Leon Jimenez, -Jose Fernando Marin Cordova


## 🚀 Descripción
Backend profesional para ECOMATCH, plataforma de comercio electrónico para materiales reciclables. Desarrollado con Node.js, Express y MySQL siguiendo arquitectura MVC.

## 📋 Características
- ✅ Autenticación JWT con bcryptjs
- ✅ Rate limiting y validaciones de seguridad
- ✅ Arquitectura MVC completa
- ✅ 5 CRUDS completos: Users, Products, Payments, VIP, Chat
- ✅ Endpoints listos para Postman
- ✅ Compatible con MySQL
- ✅ Manejo de archivos con Multer
- ✅ Sistema de comisiones dinámico

## 🛠️ Tecnologías
- **Runtime**: Node.js
- **Framework**: Express.js
- **Base de datos**: MySQL con mysql2
- **Autenticación**: JWT
- **Hashing**: bcryptjs
- **Validación**: express-validator
- **Seguridad**: Helmet, CORS, Morgan
- **Rate Limiting**: express-rate-limit

## 🚀 Inicio Rápido

### 1. Instalar dependencias
```bash
cd BACKEND
npm install
```

### 2. Configurar base de datos
- Crear base de datos `ecomatch_db` en MySQL
- Ejecutar el script `database_schema.sql`

### 3. Configurar variables de entorno
Crear archivo `.env` en la raíz del proyecto BACKEND:
```env
PORT=3000
DB_HOST=localhost
DB_USER=tu_usuario_mysql
DB_PASSWORD=tu_password_mysql
DB_NAME=ecomatch_db
JWT_SECRET=tu_jwt_secret_muy_seguro_aqui
NODE_ENV=development
```

### 4. Iniciar servidor
```bash
npm start
```

El servidor estará disponible en `http://localhost:3000`

## 📚 API Endpoints

### 🔐 Autenticación

#### POST /api/auth/register
Registra un nuevo usuario.
```json
{
  "nombre": "Juan Pérez",
  "email": "juan@example.com",
  "password": "password123",
  "tipo_usuario": "vendedor"
}
```

#### POST /api/auth/login
Inicia sesión.
```json
{
  "email": "juan@example.com",
  "password": "password123"
}
```

#### POST /api/auth/logout
Cierra sesión (requiere token).

#### GET /api/auth/profile
Obtiene perfil del usuario autenticado (requiere token).

### 👥 Usuarios

#### GET /api/users
Lista todos los usuarios (solo admin).

#### GET /api/users/:id
Obtiene usuario por ID.

#### PUT /api/users/:id
Actualiza usuario (solo admin o propio perfil).

#### DELETE /api/users/:id
Elimina usuario (solo admin).

#### GET /api/users/:id/rate
Obtiene calificaciones de un usuario.

#### POST /api/users/:id/rate
Califica a un usuario (1-5 estrellas).

### 📦 Productos/Publicaciones

#### GET /api/products
Lista publicaciones con filtros paginados.

#### GET /api/products/:id
Obtiene publicación por ID.

#### POST /api/products
Crea nueva publicación (requiere token).

#### PUT /api/products/:id
Actualiza publicación (solo propietario).

#### DELETE /api/products/:id
Elimina publicación (solo propietario).

#### GET /api/products/search
Búsqueda avanzada de publicaciones.

### 💳 Pagos

#### POST /api/payments/transaccion
Registra nueva transacción.

#### GET /api/payments/history
Obtiene historial de transacciones del usuario.

#### PUT /api/payments/:id/status
Actualiza estado de transacción (admin o participantes).

#### DELETE /api/payments/:id
Cancela transacción (admin o participantes).

#### GET /api/payments/admin/stats
Estadísticas de pagos (solo admin).

### 👑 VIP

#### GET /api/vip/planes
Lista planes VIP disponibles.

#### GET /api/vip/status
Obtiene estado VIP del usuario.

#### POST /api/vip/subscribe
Suscribe a plan VIP.

#### POST /api/vip/renew
Renueva suscripción VIP.

#### POST /api/vip/cancel
Cancela suscripción VIP.

#### GET /api/vip/history
Historial de suscripciones VIP.

#### GET /api/vip/admin/stats
Estadísticas VIP (solo admin).

### 💬 Chat

#### GET /api/chat/conversations
Lista conversaciones del usuario.

#### POST /api/chat/conversations
Crea nueva conversación.

#### GET /api/chat/conversations/:id/messages
Obtiene mensajes de conversación.

#### PUT /api/chat/conversations/:id/read
Marca mensajes como leídos.

#### POST /api/chat/messages
Envía mensaje.

#### GET /api/chat/unread
Obtiene mensajes no leídos.

#### DELETE /api/chat/conversations/:id
Elimina conversación (admin o participantes).

#### GET /api/chat/admin/stats
Estadísticas de chat (solo admin).

### 🏠 General

#### GET /api/inicio
Estadísticas generales de la plataforma.

## 🧪 Testing con cURL

### Registro de usuario
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Test User",
    "email": "test@example.com",
    "password": "password123",
    "tipo_usuario": "vendedor"
  }'
```

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### Obtener productos (con token)
```bash
curl -X GET "http://localhost:3000/api/products" \
  -H "Authorization: Bearer TU_TOKEN_AQUI"
```

## 📊 Base de Datos

El esquema completo está en `database_schema.sql` e incluye:
- ✅ Tablas normalizadas con foreign keys
- ✅ Índices para optimización
- ✅ Datos de ejemplo
- ✅ Constraints de integridad

## 🔒 Seguridad

- ✅ JWT con expiración
- ✅ Rate limiting (100 req/15min por IP)
- ✅ Validación de entrada
- ✅ Hashing de passwords con bcrypt
- ✅ Headers de seguridad con Helmet
- ✅ CORS configurado
- ✅ Logging con Morgan

## 📝 Notas de Desarrollo

- El backend está completamente funcional y probado
- Todos los endpoints incluyen validaciones y manejo de errores
- Arquitectura MVC facilita mantenimiento y escalabilidad
- Sistema de comisiones dinámico basado en planes VIP
- Compatible con Postman para testing completo

## 🎯 Estado del Proyecto

✅ **COMPLETADO**: Backend profesional con todos los requerimientos implementados.

**Próximos pasos sugeridos:**
1. Integración completa con frontend
2. Implementación de pagos reales (Conekta/Stripe)
3. Sistema de notificaciones en tiempo real
4. Tests automatizados
5. Documentación API completa en Swagger
