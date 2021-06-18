const express = require('express');
const router = express.Router();
const campgounds = require('../controllers/campgrounds')
const catchAsync = require('../utils/catchAsync');
const { isLoggedIn, isAuthor, validateCampground } = require('../middleware');
const multer = require('multer')
const { storage } = require('../cloudinary');
const upload = multer({ storage });


router.get('/', catchAsync(campgounds.index));

router.post('/', isLoggedIn, upload.array('image'), validateCampground, catchAsync(campgounds.createCampground))

router.get('/new', isLoggedIn, campgounds.renderNewForm)

router.get('/:id', catchAsync(campgounds.showCampground));

router.put('/:id', isLoggedIn, isAuthor,upload.array('image') , validateCampground, catchAsync(campgounds.updateCampground));

router.delete('/:id', isLoggedIn, isAuthor, catchAsync(campgounds.deleteCampground));

router.get('/:id/edit', isLoggedIn, isAuthor, catchAsync(campgounds.renderEditForm))

module.exports = router;