const mongoose = require("mongoose");
const Campground = require("../models/campground");
const cities = require("./cities");
const {
  descriptors,
  places,
  descriptions,
  images,
  reviews,
  fakeUsers,
} = require("./seedHelpers");
const User = require("../models/user");
const Review = require("../models/review");

mongoose.connect("mongodb://localhost:27017/yelp-camp", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
  console.log("Database Connected!");
});

// Instead of usernames + passwords, just make fake Supabase-style users
const seedUsers = async () => {
  await User.deleteMany({});
  await User.insertMany(fakeUsers);

  return fakeUsers;
};

const seedDB = async () => {
  await Campground.deleteMany({});
  await Review.deleteMany({});
  const users = await seedUsers();

  for (let i = 0; i < 21; i++) {
    const randomCity = Math.floor(Math.random() * cities.length);
    const price = Math.floor(Math.random() * 20) + 10;
    const author = users[i % users.length];

    const camp = new Campground({
      author: author._id,
      location: `${cities[randomCity].city}, ${cities[randomCity].state}`,
      title: `${descriptors[i % descriptors.length]} ${
        places[i % places.length]
      }`,
      description: descriptions[i % descriptions.length],
      price,
      geometry: {
        type: "Point",
        coordinates: [
          cities[randomCity].longitude,
          cities[randomCity].latitude,
        ],
      },
      images: [images[i * 2], images[i * 2 + 1]],
    });

    // add 2 reviews per camp
    const shuffledUsers = users.filter((u) => u._id !== author._id);
    for (let j = 0; j < 2; j++) {
      const reviewData = reviews[(i + j) % reviews.length];
      const review = new Review({
        body: reviewData.body,
        rating: reviewData.rating,
        author: shuffledUsers[j % shuffledUsers.length]._id,
      });
      await review.save();
      camp.reviews.push(review._id);
    }

    await camp.save();
  }
};

seedDB().then(() => {
  mongoose.connection.close();
});
