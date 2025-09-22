const ExpressError = require("./utils/ExpressError");
const { campgroundSchema, reviewSchema } = require("./schemas.js");
const Campground = require("./models/campground");
const Review = require("./models/review");

module.exports.isLoggedIn = (req, res, next) => {
  //console.log("REQ.USER....",req.user); //to see user who is loggedin we dont need to see in session we can directly access req.user as it has been kept there automatically by passport it is automatically going to be filled in by deserealized information in the session
  if (!req.session.user) {
    req.flash("error", "You must be signed in first!");
    return res.redirect("/login");
  }
  next();
};

//setting middleware for validation
module.exports.validateCampground = (req, res, next) => {
  const { error } = campgroundSchema.validate(req.body);
  if (error) {
    const msg = error.details.map((el) => el.message).join(",");
    req.flash("error", msg);
    req.session.formData = req.body.campground;
    if (req.method === "POST") {
      return res.redirect("/campgrounds/new"); // ✅ back to new form
    } else if (req.method === "PUT") {
      return res.redirect(`/campgrounds/${req.params.id}/edit`); // ✅ back to edit form
    }

    return res.redirect("/campgrounds"); // fallback
  }
  next();
};

module.exports.validateReview = (req, res, next) => {
  const { error } = reviewSchema.validate(req.body);
  if (error) {
    req.flash("error", "Please select a rating and write a review.");
    return res.redirect("back");
  }
  next();
};

module.exports.isAuthor = async (req, res, next) => {
  const { id } = req.params;
  const campground = await Campground.findById(id);
  if (campground.author !== req.session.user.id) {
    req.flash("error", "You do not have permission to do that!");
    return res.redirect(`/campgrounds/${id}`);
  }
  next();
};

module.exports.isReviewAuthor = async (req, res, next) => {
  const { id, reviewId } = req.params;
  const review = await Review.findById(reviewId);
  console.log("here", review);
  if (review.author !== req.session.user.id) {
    req.flash("error", "You do not have permission to do that!");
    return res.redirect(`/campgrounds/${id}`);
  }
  next();
};
