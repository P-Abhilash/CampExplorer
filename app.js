if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}
// require("dotenv").config();

// console.log(process.env.CLOUDINARY_CLOUD_NAME);
// console.log(process.env.CLOUDINARY_KEY);

const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const ejsMate = require("ejs-mate");
const Joi = require("joi"); //schema data validator for javascript
const ExpressError = require("./utils/ExpressError");
const methodOverride = require("method-override");
const { required, string } = require("joi");
const session = require("express-session");
const flash = require("connect-flash");
const User = require("./models/user");
const helmet = require("helmet"); //Helmet helps you secure your Express apps by setting various HTTP headers. It's not a silver bullet, but it can help!
const mongoSanitize = require("express-mongo-sanitize"); //it will remove any prohibited character (ex-$, . etc) from query string
const multer = require("multer");

const userRoutes = require("./routes/users");
const campgroundRoutes = require("./routes/campgrounds");
const reviewRoutes = require("./routes/reviews");

const MongoDBStore = require("connect-mongo")(session);

const dbUrl = process.env.DB_URL || "mongodb://localhost:27017/camp-explorer";
mongoose.connect(dbUrl, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false,
});

const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
  console.log("Database Connected!");
});

const app = express();

app.engine("ejs", ejsMate); // we tell express thats the one we wanna use istead the default one
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true })); //it will parse the req body for us
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "public"))); //telling express to serve one public directory named public
// // To remove data, use:
// app.use(mongoSanitize());

// Or, to replace prohibited characters with _, use:
app.use(
  mongoSanitize({
    replaceWith: "_",
  })
);

const secret = process.env.SECRET || "thisshouldbeabettersecret!";

const store = new MongoDBStore({
  //configuring mongoStore for session's storage
  url: dbUrl,
  secret,
  touchAfter: 24 * 60 * 60, //time period in seconds
});

store.on("error", function (e) {
  console.log("SESSION STORE ERROR", e);
});

const sessionConfig = {
  store, //shortcut of store:store, //telling to use store insteed of default memory
  name: "session", //since we dont want the default name 'connect.sid' which people can directly get to know so we put our own name it could be anything we are just changing name not hiding it
  secret,
  resave: false,
  saveUninitialized: true,
  cookie: {
    httpOnly: true, //these are little security features we can refer to docs to know more
    // secure:true, // enabling this will make cookie work only on http and since localhost is not http cookies will not work on localhost but we definitely want this while deploying
    express: Date.now() + 1000 * 60 * 60 * 24 * 7, //setting to expire in 7 days in millisecondss
    maxAge: 1000 * 60 * 60 * 24 * 7,
  },
};
app.use(session(sessionConfig));
app.use(flash());
app.use(helmet()); //this will automatically enable all 11 middleware defined in it see docs- https://helmetjs.github.io/ one of those is contentPolicysECURITY WILL WILL CREATE SOME PROBLEM currently so disabling it for now

const scriptSrcUrls = [
  "https://stackpath.bootstrapcdn.com/",
  // "https://api.tiles.mapbox.com/",
  // "https://api.mapbox.com/",
  "https://kit.fontawesome.com/",
  "https://cdnjs.cloudflare.com/",
  "https://cdn.jsdelivr.net",
  "https://cdn.maptiler.com/", // add this
];
const styleSrcUrls = [
  "https://kit-free.fontawesome.com/",
  "https://stackpath.bootstrapcdn.com/",
  // "https://api.mapbox.com/",
  // "https://api.tiles.mapbox.com/",
  "https://fonts.googleapis.com/",
  "https://use.fontawesome.com/",
  "https://cdn.jsdelivr.net",
  "https://cdn.maptiler.com/", // add this
];
const connectSrcUrls = [
  // "https://api.mapbox.com/",
  // "https://a.tiles.mapbox.com/",
  // "https://b.tiles.mapbox.com/",
  // "https://events.mapbox.com/",
  "https://api.maptiler.com/", // add this
];
const fontSrcUrls = [];
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: [],
      connectSrc: ["'self'", ...connectSrcUrls],
      scriptSrc: ["'unsafe-inline'", "'self'", ...scriptSrcUrls],
      styleSrc: ["'self'", "'unsafe-inline'", ...styleSrcUrls],
      workerSrc: ["'self'", "blob:"],
      objectSrc: [],
      imgSrc: [
        "'self'",
        "blob:",
        "data:",
        `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/`, //SHOULD MATCH YOUR CLOUDINARY ACCOUNT!
        "https://images.unsplash.com/",
        "https://www.pexels.com/",
        "https://fontawesome.com/",
        "https://api.maptiler.com/",
      ],
      fontSrc: ["'self'", ...fontSrcUrls],
    },
  })
);

app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  next();
});

app.use("/", userRoutes);
app.use("/campgrounds", campgroundRoutes); //inside campgrounds routes all routes starting from /campgrounds.
app.use("/campgrounds/:id/reviews", reviewRoutes); //inside reviews routes all routes starting from /campgrounds/:id/reviews

app.get("/", (req, res) => {
  res.render("home");
});
app.get("/about", (req, res) => {
  res.render("about");
});

app.all("*", (req, res, next) => {
  next(new ExpressError("Page Not Found", 404));
});

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_UNEXPECTED_FILE") {
      req.flash("error", "You can upload up to 5 images only!");
      req.session.formData = req.body.campground; // ✅ preserve form values
      if (req.originalUrl.includes("/campgrounds/") && req.method === "PUT") {
        return res.redirect(req.originalUrl.replace("?_method=PUT", "/edit"));
      }
      return res.redirect("/campgrounds/new");
    }
    if (err.code === "LIMIT_FILE_SIZE") {
      req.flash("error", "Image too large! Max size is 5MB per file.");
      req.session.formData = req.body.campground; // ✅ preserve form values
      return res.redirect("back");
    }
  }
  next(err);
});

app.use((err, req, res, next) => {
  const { statusCode = 500, message = "Something went wrong" } = err;
  if (!err.message) err.message = "Something Went Wrong";
  res.status(statusCode).render("error", { err });
});

const port = process.env.PORT || 3000; //process.env.PORT will be automatically present on heroku
app.listen(port, () => {
  console.log(`SERVING ON PORT ${port}!`);
});
