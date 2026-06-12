const nodemailer = require('nodemailer');

const RATE_LIMIT_WINDOW = 30000;
const RATE_LIMIT_MAX = 3;
const ipHits = {};

function getIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim()
    || req.headers['x-real-ip']
    || req.connection?.remoteAddress
    || 'unknown';
}

function sanitize(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[<>&"']/g, function (m) {
    switch (m) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '"': return '&quot;';
      case "'": return '&#x27;';
      default: return m;
    }
  });
}

function validate(data) {
  const errors = [];
  if (!data.Nombre || data.Nombre.trim().length < 2) errors.push('El nombre debe tener al menos 2 caracteres.');
  if (data.Nombre && data.Nombre.length > 100) errors.push('El nombre es demasiado largo.');
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!data.Email || !emailRe.test(data.Email)) errors.push('Ingresa un email válido.');
  if (data.Email && data.Email.length > 200) errors.push('El email es demasiado largo.');
  if (data.Telefono && data.Telefono.trim()) {
    if (data.Telefono.length > 20) errors.push('El teléfono es demasiado largo.');
    const phoneClean = data.Telefono.replace(/[\s\-\(\)\+]/g, '');
    if (phoneClean.length < 7) errors.push('Ingresa un teléfono válido.');
  }
  if (data.Empresa && data.Empresa.length > 200) errors.push('El nombre de empresa es demasiado largo.');
  if (!data.Mensaje || data.Mensaje.trim().length < 10) errors.push('El mensaje debe tener al menos 10 caracteres.');
  if (data.Mensaje && data.Mensaje.length > 2000) errors.push('El mensaje es demasiado largo.');
  return errors;
}

function checkRateLimit(ip) {
  const now = Date.now();
  if (!ipHits[ip]) {
    ipHits[ip] = { count: 1, start: now };
    return { allowed: true };
  }
  const entry = ipHits[ip];
  if (now - entry.start > RATE_LIMIT_WINDOW) {
    ipHits[ip] = { count: 1, start: now };
    return { allowed: true };
  }
  if (entry.count >= RATE_LIMIT_MAX) {
    return { allowed: false, retryAfter: Math.ceil((RATE_LIMIT_WINDOW - (now - entry.start)) / 1000) };
  }
  entry.count++;
  return { allowed: true };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const contentType = req.headers['content-type'] || '';
  if (!contentType.includes('application/json')) {
    return res.status(400).json({ success: false, error: 'Content-Type must be application/json' });
  }

  try {
    const ip = getIP(req);
    const rateCheck = checkRateLimit(ip);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        success: false,
        error: `Demasiadas solicitudes. Espera ${rateCheck.retryAfter} segundos.`,
        retryAfter: rateCheck.retryAfter
      });
    }

    const data = req.body || {};

    if (data._honey) {
      return res.status(400).json({ success: false, error: 'Spam detectado.' });
    }

    const errors = validate(data);
    if (errors.length) {
      return res.status(422).json({ success: false, errors });
    }

    const clean = {
      Nombre: sanitize(data.Nombre),
      Email: sanitize(data.Email),
      Telefono: sanitize(data.Telefono || ''),
      Empresa: sanitize(data.Empresa || ''),
      Interes: sanitize(data.Interes || ''),
      Mensaje: sanitize(data.Mensaje)
    };

    const emailUser = process.env.SMTP_USER;
    const emailPass = process.env.SMTP_PASS;
    const emailTo = process.env.CONTACT_EMAIL || 'Mods.agency.ia@gmail.com';

    if (emailUser && emailPass) {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: { user: emailUser, pass: emailPass }
      });

      const html = `
        <h2>Nuevo contacto desde MODS IA</h2>
        <table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;font-family:sans-serif;">
          <tr><td><strong>Nombre</strong></td><td>${clean.Nombre}</td></tr>
          <tr><td><strong>Email</strong></td><td>${clean.Email}</td></tr>
          <tr><td><strong>Teléfono</strong></td><td>${clean.Telefono || '—'}</td></tr>
          <tr><td><strong>Empresa</strong></td><td>${clean.Empresa || '—'}</td></tr>
          <tr><td><strong>Interés</strong></td><td>${clean.Interes || '—'}</td></tr>
          <tr><td><strong>Mensaje</strong></td><td>${clean.Mensaje}</td></tr>
        </table>
      `;

      await transporter.sendMail({
        from: emailUser,
        to: emailTo,
        subject: `[MODS IA] Contacto de ${clean.Nombre}`,
        html
      });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Error en api/contact:', err);
    return res.status(500).json({ success: false, error: 'Error interno del servidor.' });
  }
};
