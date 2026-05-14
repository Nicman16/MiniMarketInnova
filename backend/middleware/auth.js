const jwt = require('jsonwebtoken');

// Verifica que el request tenga un JWT válido
const verificarToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token requerido' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'tu_clave_secreta_aqui');
    req.usuario = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
};

// Solo permite acceso al rol "jefe"
const requireJefe = (req, res, next) => {
  if (req.usuario?.rol !== 'jefe') {
    return res.status(403).json({ error: 'Solo administradores pueden realizar esta acción' });
  }
  next();
};

module.exports = { verificarToken, requireJefe };
