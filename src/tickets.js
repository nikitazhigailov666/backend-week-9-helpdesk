const { randomUUID } = require('node:crypto');
const express = require('express');
const statuses = ['open', 'in_progress', 'closed'];

function createRouter() {
  const router = express.Router();
  const tickets = new Map();

  router.get('/', (req, res) => {
    const { status } = req.query;
    if (status !== undefined && !statuses.includes(status)) {
      return res.status(400).json({ error: 'Неизвестный статус' });
    }
    const items = Array.from(tickets.values());
    res.json(status === undefined ? items : items.filter(ticket => ticket.status === status));
  });

  router.post('/', (req, res) => {
    const title = req.body?.title;
    if (typeof title !== 'string' || !title.trim() || title.trim().length > 120) {
      return res.status(400).json({ error: 'Укажите заголовок длиной от 1 до 120 символов' });
    }
    const ticket = { id: randomUUID(), title: title.trim(), status: 'open' };
    tickets.set(ticket.id, ticket);
    res.location('/api/tickets/' + ticket.id).status(201).json(ticket);
  });

  router.param('id', (req, res, next, id) => {
    const ticket = tickets.get(id);
    if (!ticket) return res.status(404).json({ error: 'Заявка не найдена' });
    req.ticket = ticket;
    next();
  });

  router.get('/:id', (req, res) => res.json(req.ticket));

  router.patch('/:id', (req, res) => {
    const status = req.body?.status;
    if (!statuses.includes(status)) {
      return res.status(400).json({ error: 'Укажите допустимый статус' });
    }
    req.ticket.status = status;
    res.json(req.ticket);
  });

  router.delete('/:id', (req, res) => {
    tickets.delete(req.ticket.id);
    res.sendStatus(204);
  });

  return router;
}

module.exports = { createRouter };
