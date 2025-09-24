const Campground = require("../models/campground");
const maptilerClient = require("@maptiler/client");
maptilerClient.config.apiKey = process.env.MAPTILER_API_KEY;
const { cloudinary } = require("../cloudinary");
const moment = require("moment");

module.exports.index = async (req, res) => {
  const { q } = req.query;

  let campgrounds;
  if (q) {
    // Case-insensitive regex search
    const regex = new RegExp(q, "i");
    campgrounds = await Campground.find({
      $or: [{ title: regex }, { location: regex }],
    })
      .populate("reviews")
      .sort({ createdAt: -1 });
  } else {
    campgrounds = await Campground.find({})
      .populate("reviews")
      .sort({ createdAt: -1 });
  }

  res.render("campgrounds/index", { campgrounds, searchQuery: q });
};

module.exports.renderNewForm = (req, res) => {
  res.render("campgrounds/new", { campground: {} });
};

module.exports.createCampground = async (req, res, next) => {
  try {
    if (req.fileValidationError) {
      return res.render("campgrounds/new", {
        campground: req.body.campground,
        error: req.fileValidationError,
      });
    }

    const geoData = await maptilerClient.geocoding.forward(
      req.body.campground.location,
      { limit: 1 }
    );

    // 🛑 Guard: stop immediately if no valid location
    if (
      req.body.locationValid !== "true" ||
      !geoData ||
      !geoData.features ||
      geoData.features.length === 0
    ) {
      return res.render("campgrounds/new", {
        campground: req.body.campground,
        error: "Invalid location. Please enter a valid place.",
      });
    }

    const campground = new Campground(req.body.campground);
    campground.geometry = geoData.features[0].geometry;
    campground.images = req.files.map((f) => ({
      url: f.path,
      filename: f.filename,
    }));
    campground.author = req.session.user.id;

    await campground.save();
    req.flash("success", "Successfully made a new campground!");
    res.redirect(`/campgrounds/${campground._id}`);
  } catch (e) {
    console.error("❌ Error in createCampground:", e);
    req.flash("error", "Something went wrong while creating campground.");
    res.redirect("/campgrounds/new");
  }
};

module.exports.showCampground = async (req, res) => {
  const campground = await Campground.findById(req.params.id)
    .populate({
      path: "reviews", //populating reviews of this campground
      populate: {
        path: "author", //nested population for author of reviews
        populate: { path: "author" },
      },
    })
    .populate("author"); //populating author of this campground
  //console.log(campground);
  if (!campground) {
    req.flash("error", "Can't find that campground");
    return res.redirect("/campgrounds");
  }
  let avgRating = 0;
  if (campground.reviews.length > 0) {
    const total = campground.reviews.reduce(
      (sum, review) => sum + review.rating,
      0
    );
    avgRating = (total / campground.reviews.length).toFixed(1);
  }
  const formattedDate = moment(campground.createdAt).fromNow();
  res.render("campgrounds/show", { campground, avgRating, formattedDate });
};

module.exports.renderEditForm = async (req, res) => {
  const { id } = req.params;
  const campground = await Campground.findById(id);
  if (!campground) {
    req.flash("error", "Cannot find that campground!");
    return res.redirect("/campgrounds");
  }
  res.render("campgrounds/edit", { campground });
};

module.exports.updateCampground = async (req, res, next) => {
  const { id } = req.params;
  try {
    if (req.fileValidationError) {
      req.flash("error", req.fileValidationError);
      return res.redirect(`/campgrounds/${id}/edit`);
    }

    const geoData = await maptilerClient.geocoding.forward(
      req.body.campground.location,
      { limit: 1 }
    );

    if (
      req.body.locationValid !== "true" ||
      !geoData ||
      !geoData.features ||
      geoData.features.length === 0
    ) {
      req.flash("error", "Invalid location. Please enter a valid place.");
      return res.redirect(`/campgrounds/${id}/edit`);
    }

    const campground = await Campground.findByIdAndUpdate(
      id,
      req.body.campground,
      { runValidators: true, new: true }
    );
    campground.geometry = geoData.features[0].geometry;
    const imgs = req.files.map((f) => ({ url: f.path, filename: f.filename }));
    campground.images.push(...imgs); //push on existing images
    await campground.save();
    if (req.body.deleteImages) {
      for (let filename of req.body.deleteImages) {
        await cloudinary.uploader.destroy(filename);
      }
      await campground.updateOne({
        $pull: { images: { filename: { $in: req.body.deleteImages } } },
      });
      // console.log(campground);
    }
    req.flash("success", "Successfully updated a campground!");
    //res.send(req.body.campground);
    res.redirect(`/campgrounds/${campground._id}`);
  } catch (e) {
    console.error("❌ Update error:", e);
    req.flash(
      "error",
      e.message || "Something went wrong updating campground."
    );
    console.error("Redirecting back to:", `/campgrounds/${id}/edit`);
    res.redirect(`/campgrounds/${id}/edit`);
  }
};

module.exports.deleteCampground = async (req, res) => {
  const { id } = req.params;
  const campground = await Campground.findByIdAndDelete(id);
  req.flash("success", "Successfully deleted a campground");
  res.redirect("/campgrounds");
};
