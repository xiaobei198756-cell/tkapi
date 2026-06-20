require('dotenv').config();

const path = require('path');
const express = require('express');
const session = require('express-session');
const requestIp = require('request-ip');

const { ensureSchema } = require('./config/schema');
const adminRoutes = require('./routes/admin');
const publicRoutes = require('./routes/public');

const app = express();
const port = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(requestIp.mw());
app.use(express.static(path.join(__dirname, 'public')));
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'development-only-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      maxAge: 1000 * 60 * 60 * 8
    }
  })
);

app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  res.locals.flash = req.session.flash || null;
  delete req.session.flash;
  next();
});

app.get('/', (req, res) => {
  res.render('public/home');
});

app.use('/admin', adminRoutes);
app.use('/', publicRoutes);

app.use((req, res) => {
  res.status(404).render('public/message', {
    title: '页面不存在',
    message: '请求的页面不存在。'
  });
});

async function start() {
  await ensureSchema();
  app.listen(port, () => {
    console.log(`Support router running at http://localhost:${port}`);
  });
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
