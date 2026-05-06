const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const User   = require('../models/User');
const { ok, created, badRequest, unauthorized, conflict, notFound, serverError } = require('../utils/response');

const signToken = (user) =>
  jwt.sign(
    { id: user.id, email: user.email, role: user.role, nama: user.nama },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

exports.register = async (req, res) => {
  try {
    const { nama, nik, email, password, no_hp, instansi } = req.body;

    if (await User.emailExists(email))
      return conflict(res, 'Email sudah terdaftar. Gunakan email lain atau login.');
    if (await User.nikExists(nik))
      return conflict(res, 'NIK/NIP sudah terdaftar. Hubungi admin jika ini kesalahan.');

    const hashed = await bcrypt.hash(password, 12);
    const id     = await User.create({ nama, nik, email, password: hashed, no_hp, instansi });
    const user   = await User.findById(id);
    const token  = signToken(user);

    return created(res, { user, token }, 'Akun berhasil dibuat. Selamat datang di SiLatih!');
  } catch (err) {
    console.error('register:', err);
    return serverError(res);
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.password)))
      return unauthorized(res, 'Email atau password salah.');

    const { password: _, ...safeUser } = user;
    const token = signToken(safeUser);

    return ok(res, { user: safeUser, token }, 'Login berhasil!');
  } catch (err) {
    console.error('login:', err);
    return serverError(res);
  }
};

exports.me = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return notFound(res, 'User tidak ditemukan.');
    return ok(res, { user });
  } catch (err) {
    return serverError(res);
  }
};
