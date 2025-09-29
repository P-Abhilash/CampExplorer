const express = require("express");
const router = express.Router();
const catchAsync = require("../utils/catchAsync");
const Campground = require("../models/campground");
const campgrounds = require("../controllers/campgrounds");
const { isLoggedIn, isAuthor, validateCampground } = require("../middleware");
const multer = require("multer"); //https://github.com/expressjs/multer
const { storage } = require("../cloudinary");

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // ✅ 5MB per file
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      req.fileValidationError = "Only image files are allowed!";
      cb(null, false);
    }
  },
});

//Multer is a node.js middleware for handling multipart/form-data, which is primarily used for uploading files.

// router.get('/',catchAsync(campgrounds.index));
// router.post('/',isLoggedIn,validateCampground,catchAsync(campgrounds.createCampground));
//since these above 2 routes have same path we can route these in a fancy way using router.route
router
  .route("/")
  .get(catchAsync(campgrounds.index))
  .post(
    isLoggedIn,
    upload.array("image", 5),
    validateCampground,
    catchAsync(campgrounds.createCampground)
  );
// .post(upload.array('image'),(req,res)=>{  //make sure input name (here-'image') matches the name in form
//     console.log(req.body, req.files);  //without multer req.body will be an empty object bcz enctype of the form is set to multipart so we need multer middleware to handle these
//     res.send("IT Worked!!");  //if we use arry those files will we stores in req.files
// })

router.get("/mine", isLoggedIn, catchAsync(campgrounds.myCampgrounds));

router.get("/new", isLoggedIn, (req, res) => {
  const formData = req.session.formData || {};
  delete req.session.formData; // clear after use
  res.render("campgrounds/new", { campground: formData });
});

router
  .route("/:id")
  .get(catchAsync(campgrounds.showCampground))
  .put(
    isLoggedIn,
    isAuthor,
    upload.array("image", 5),
    validateCampground,
    catchAsync(campgrounds.updateCampground)
  )
  .delete(isLoggedIn, isAuthor, catchAsync(campgrounds.deleteCampground));

router.get(
  "/:id/edit",
  isLoggedIn,
  isAuthor,
  catchAsync(async (req, res) => {
    const campground = await Campground.findById(req.params.id);
    if (!campground) {
      req.flash("error", "Campground not found!");
      return res.redirect("/campgrounds");
    }
    const formData = req.session.formData || {};
    delete req.session.formData;

    // Ensure _id is always present
    res.render("campgrounds/edit", {
      campground: { ...campground.toObject(), ...formData },
    });
  })
);

module.exports = router;
