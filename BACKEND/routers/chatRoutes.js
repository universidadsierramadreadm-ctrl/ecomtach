// routers/chatRoutes.js
const express = require('express');
const r = express.Router();
const ctrl = require('../controllers/chatController');
const { protect } = require('./middleware');
r.get('/conversations',          protect, ctrl.getConversations);
r.get('/messages/:conversacion_id', protect, ctrl.getMessages);
r.post('/send',                  protect, ctrl.sendMessage);
module.exports = r;