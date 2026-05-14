// ══════════════════════════════════════════════════════
//  ECOMATCH — controllers/productController.js
//  CRUD completo de publicaciones de materiales
// ══════════════════════════════════════════════════════
const productModel = require('../models/productModel');
const path = require('path');
const fs   = require('fs');

/* ────────────────────────────────
   GET /api/products
   Listar con filtros y paginación
──────────────────────────────── */
exports.getAll = async (req, res) => {
  try {
    const {
      tipo_material, estado, ciudad, precio_min, precio_max,
      page = 1, limit = 12, search, sort = 'fecha_publicacion', order = 'DESC'
    } = req.query;

    const filters = {
      tipo_material,
      precio_min: precio_min ? parseFloat(precio_min) : undefined,
      precio_max: precio_max ? parseFloat(precio_max) : undefined,
      estado,
      ciudad,
      search,
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      sort,
      order
    };

    const products = await productModel.getAll(filters);

    // Obtener total para paginación (esto debería estar en el modelo también)
    const totalQuery = await productModel.getAll({ ...filters, limit: 1000000, offset: 0 });
    const total = totalQuery.length;

    res.json({
      success: true,
      data: products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ────────────────────────────────
   GET /api/products/:id
──────────────────────────────── */
exports.getOne = async (req, res) => {
  try {
    const product = await productModel.getById(req.params.id);
    if (!product)
      return res.status(404).json({ success: false, message: 'Publicación no encontrada' });

    // Incrementar vistas
    await productModel.incrementViews(req.params.id);

    res.json({ success: true, data: product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ────────────────────────────────
   POST /api/products
   Crear publicación (solo vendedores)
──────────────────────────────── */
exports.create = async (req, res) => {
  try {
    const {
      titulo, descripcion, tipo_material, cantidad, precio, estado, ciudad
    } = req.body;

    if (!titulo || !tipo_material || !cantidad || !precio)
      return res.status(400).json({ success: false, message: 'Faltan campos requeridos: titulo, tipo_material, cantidad, precio' });

    // Validar valores numéricos
    const cantidadNum = parseFloat(cantidad);
    const precioNum = parseFloat(precio);

    if (cantidadNum <= 0 || precioNum <= 0)
      return res.status(400).json({ success: false, message: 'Cantidad y precio deben ser valores positivos' });

    // Procesar imágenes si existen
    let imagenes = [];
    if (req.file) {
      imagenes = [`/uploads/${req.file.filename}`];
    }

    const productId = await productModel.create({
      usuario_id: req.user.id,
      titulo,
      descripcion,
      tipo_material,
      cantidad: cantidadNum,
      precio: precioNum,
      estado,
      ciudad,
      imagenes
    });

    res.status(201).json({
      success: true,
      message: 'Publicación creada exitosamente',
      data: { id: productId }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ────────────────────────────────
   PUT /api/products/:id
──────────────────────────────── */
exports.update = async (req, res) => {
  try {
    const product = await productModel.getById(req.params.id);
    if (!product)
      return res.status(404).json({ success: false, message: 'Publicación no encontrada' });

    if (product.usuario_id !== req.user.id && req.user.tipo_usuario !== 'admin')
      return res.status(403).json({ success: false, message: 'Sin permiso para editar esta publicación' });

    const {
      titulo, descripcion, tipo_material, cantidad, precio, estado, ciudad
    } = req.body;

    // Validar valores numéricos si se proporcionan
    const updateData = {};
    if (titulo !== undefined) updateData.titulo = titulo;
    if (descripcion !== undefined) updateData.descripcion = descripcion;
    if (tipo_material !== undefined) updateData.tipo_material = tipo_material;
    if (cantidad !== undefined) {
      const cantidadNum = parseFloat(cantidad);
      if (cantidadNum <= 0) return res.status(400).json({ success: false, message: 'Cantidad debe ser positiva' });
      updateData.cantidad = cantidadNum;
    }
    if (precio !== undefined) {
      const precioNum = parseFloat(precio);
      if (precioNum <= 0) return res.status(400).json({ success: false, message: 'Precio debe ser positivo' });
      updateData.precio = precioNum;
    }
    if (estado !== undefined) updateData.estado = estado;
    if (ciudad !== undefined) updateData.ciudad = ciudad;

    // Procesar nuevas imágenes si existen
    if (req.file) {
      updateData.imagenes = [`/uploads/${req.file.filename}`];
    }

    if (Object.keys(updateData).length === 0)
      return res.status(400).json({ success: false, message: 'No hay datos para actualizar' });

    await productModel.update(req.params.id, updateData);

    res.json({ success: true, message: 'Publicación actualizada correctamente' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ────────────────────────────────
   DELETE /api/products/:id
──────────────────────────────── */
exports.remove = async (req, res) => {
  try {
    const product = await productModel.getById(req.params.id);
    if (!product)
      return res.status(404).json({ success: false, message: 'Publicación no encontrada' });

    if (product.usuario_id !== req.user.id && req.user.tipo_usuario !== 'admin')
      return res.status(403).json({ success: false, message: 'Sin permiso para eliminar esta publicación' });

    // Eliminar imágenes del sistema de archivos si existen
    if (product.imagenes && Array.isArray(product.imagenes)) {
      product.imagenes.forEach(img => {
        const imgPath = path.join(__dirname, '../../FRONTEND/assets/images/uploads', path.basename(img));
        if (fs.existsSync(imgPath)) {
          fs.unlinkSync(imgPath);
        }
      });
    }

    await productModel.remove(req.params.id);

    res.json({ success: true, message: 'Publicación eliminada correctamente' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ────────────────────────────────
   GET /api/products/my/listings
   Mis publicaciones
──────────────────────────────── */
exports.myListings = async (req, res) => {
  try {
    const products = await productModel.getByUser(req.user.id);
    res.json({ success: true, data: products });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ────────────────────────────────
   POST /api/products/:id/request
   Solicitar compra de publicación
──────────────────────────────── */
exports.requestPurchase = async (req, res) => {
  try {
    const product = await productModel.getById(req.params.id);
    if (!product)
      return res.status(404).json({ success: false, message: 'Publicación no encontrada' });

    if (product.usuario_id === req.user.id)
      return res.status(400).json({ success: false, message: 'No puedes solicitar tu propia publicación' });

    const { cantidad_solicitada, mensaje } = req.body;

    if (!cantidad_solicitada || parseFloat(cantidad_solicitada) <= 0)
      return res.status(400).json({ success: false, message: 'Cantidad solicitada debe ser positiva' });

    if (parseFloat(cantidad_solicitada) > parseFloat(product.cantidad))
      return res.status(400).json({ success: false, message: 'Cantidad solicitada excede el disponible' });

    // Verificar que no haya ya una solicitud pendiente
    const db = require('../config/database');
    const [existing] = await db.query(
      'SELECT id FROM solicitudes WHERE publicacion_id = ? AND comprador_id = ? AND estado = "pendiente"',
      [req.params.id, req.user.id]
    );
    if (existing.length > 0)
      return res.status(409).json({ success: false, message: 'Ya tienes una solicitud pendiente para esta publicación' });

    // Crear solicitud
    const [result] = await db.query(
      `INSERT INTO solicitudes (publicacion_id, comprador_id, cantidad_solicitada, mensaje, fecha_solicitud)
       VALUES (?, ?, ?, ?, NOW())`,
      [req.params.id, req.user.id, parseFloat(cantidad_solicitada), mensaje || null]
    );

    res.status(201).json({
      success: true,
      message: 'Solicitud de compra enviada correctamente',
      data: { id: result.insertId }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};