const multer = require('multer');
const { storage } = require('../config/cloudinary');

const fileFilter = (req, file, cb) => {
  const isVideoField = ['video', 'heroVideo', 'adVideo'].includes(file.fieldname);
  const isVideoMime = file.mimetype.startsWith('video/');
  const isImageMime = file.mimetype.startsWith('image/');

  if (isVideoField) {
    if (isVideoMime) return cb(null, true);
    return cb(new Error('Only video files allowed in this field'));
  }
  
  if (isImageMime) return cb(null, true);
  cb(new Error('Only image files allowed (JPEG, PNG, etc.)'));
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
