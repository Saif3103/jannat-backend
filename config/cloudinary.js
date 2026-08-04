const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    let folder = 'jannat_rugs';
    if (file.fieldname === 'images') folder = 'jannat_rugs/products';
    else if (file.fieldname === 'categoryImage') folder = 'jannat_rugs/categories';
    else if (file.fieldname === 'avatar' || file.fieldname === 'profileImage') folder = 'jannat_rugs/users';
    else if (file.fieldname === 'image' || file.fieldname === 'chatImage') folder = 'jannat_rugs/support';
    else if (file.fieldname === 'paymentProof') folder = 'jannat_rugs/payments';
    else if (
      ['founderImage', 'sahanaImage', 'saifImage', 'coFounderImage'].includes(file.fieldname)
    ) {
      folder = 'jannat_rugs/team';
    } else folder = 'jannat_rugs/general';

    return {
      folder: folder,
      resource_type: 'auto',
      public_id: Date.now() + '-' + Math.round(Math.random() * 1e9),
    };
  },
});

module.exports = { cloudinary, storage };
