// middleware/auth.js — kontrola přihlášení
function requireAuth(req, res, next) {
  if (req.session && req.session.userId) return next();
  const isApi = req.path.startsWith('/api/');
  if (isApi) return res.status(401).json({ ok: false, error: 'Nepřihlášen' });
  return res.redirect('/login');
}

module.exports = { requireAuth };
