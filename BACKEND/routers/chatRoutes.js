// routers/chatRoutes.js
const express = require('express');
const r = express.Router();
const ctrl = require('../controllers/chatController');
const { protect } = require('./middleware');

r.get('/conversations',          protect, ctrl.getConversations);
r.post('/conversations',         protect, ctrl.createConversation);
r.get('/conversations/:id/messages', protect, ctrl.getMessages);
r.put('/conversations/:id/read', protect, ctrl.markAsRead);
r.post('/messages',              protect, ctrl.sendMessage);
r.get('/unread',                 protect, ctrl.getUnreadMessages);
r.delete('/conversations/:id',   protect, ctrl.deleteConversation);
r.get('/admin/stats',            protect, ctrl.adminStats);

module.exports = r;