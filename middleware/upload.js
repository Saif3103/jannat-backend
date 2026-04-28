const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder = 'general';
    if (file.fieldname === 'images') folder = 'products';
    else if (file.fieldname === 'logo') folder = 'site';
    else if (file.fieldname === 'favicon') folder = 'site';
    else if (file.fieldname === 'profileImage') folder = 'site';
    else if (file.fieldname === 'bannerImages') folder = 'site';
    else if (file.fieldname === 'avatar') folder = 'avatars';
    else if (file.fieldname === 'video') folder = 'videos';
    else if (file.fieldname === 'categoryImage') folder = 'categories';
    else if (file.fieldname === 'image') folder = 'general';

    const dest = path.join(uploadDir, folder);
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  const videoTypes = /mp4|webm|ogg|mov/;
  const imageTypes = /jpeg|jpg|png|gif|webp|svg/;
  const ext = path.extname(file.originalname).toLowerCase().slice(1);

  if (file.fieldname === 'video') {
    if (videoTypes.test(ext)) return cb(null, true);
    return cb(new Error('Only video files allowed'));
  }
  if (imageTypes.test(ext)) return cb(null, true);
  cb(new Error('Only image files allowed'));
};

const multerInstance = multer({
  storage,
  fileFilter,
  limits: { fileSize: 500 * 1024 * 1024 },
});

// ─── Express 5 + Multer v2 compatible wrapper ───────────────────────────────
// Multer v2 uses a 4-argument error callback which conflicts with Express 5's
// route handler signature, causing "next is not a function" errors.
// This wrapper fixes it by manually calling the multer handler and catching errors.
function wrapMulter(multerMiddleware) {
  return function (req, res, next) {
    new Promise((resolve, reject) => {
      multerMiddleware(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    })
      .then(() => next())
      .catch((err) => {
        res.status(400).json({ success: false, message: err.message || 'File upload error' });
      });
  };
}

const upload = {
  array: (fieldName, maxCount) => wrapMulter(multerInstance.array(fieldName, maxCount)),
  single: (fieldName) => wrapMulter(multerInstance.single(fieldName)),
  fields: (fields) => wrapMulter(multerInstance.fields(fields)),
  none: () => wrapMulter(multerInstance.none()),
};

module.exports = upload;
