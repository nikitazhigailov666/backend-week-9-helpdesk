const { randomUUID } = require('node:crypto');
const express = require('express');
const { createRouter } = require('./tickets');

function createApp() {
  const app = express();

  app.use((req, res, next) => {
    res.set('X-Request-Id', randomUUID());
    next();
  });
  app.use(express.json({ limit: '16kb' }));

  app.get('/health', (req, res) => res.json({ status: 'ok' }));
  app.use('/api/tickets', createRouter());
  app.use((req, res) => res.status(404).json({ error: 'Маршрут не найден' }));
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (error.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'Некорректный JSON' });
    }
    if (error.type === 'entity.too.large') {
      return res.status(413).json({ error: 'Тело запроса слишком большое' });
    }
    console.error(error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  });
  return app;
}

module.exports = { createApp };
