const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
    cloud_name:process.env.CLOUDINARY_CLOUD_NAME,
    api_key:process.env.CLOUDINARY_KEY,
    api_secret:process.env.CLOUDINARY_SECRET
});

const storage=new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    // Reject immediately if not an image
    if (!file.mimetype.startsWith('image/')) {
      throw new Error('Only image files are allowed!');
    }
    return {
      folder: 'CampExplorer',
      resource_type: 'image',                 // 👈 force only images
      allowed_formats: ['jpg', 'jpeg', 'png'] // 👈 accepted formats
    };
  }
});

module.exports={
    cloudinary,
    storage
}

