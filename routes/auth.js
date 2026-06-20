function requireAdmin(req, res, next) {
  if (!req.session.user) {
    res.redirect('/admin/login');
    return;
  }
  next();
}

function setFlash(req, type, message) {
  req.session.flash = { type, message };
}

module.exports = { requireAdmin, setFlash };
