const mongoose = require('mongoose');
const cities = require('./cities');
const { places, descriptors } = require('./seedHelpers');
const Campground = require('../models/campground');

mongoose.connect('mongodb://localhost:27017/yelp-camp', {
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true
});

const db = mongoose.connection;

db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
    console.log("Database connected");
});

const sample = array => array[Math.floor(Math.random() * array.length)];


const seedDB = async () => {
    await Campground.deleteMany({});
    for (let i = 0; i < 50; i++) {
        const random1000 = Math.floor(Math.random() * 1000);
        const price = Math.floor(Math.random() * 20) + 10;
        const camp = new Campground({
            author: '60c202e20a3e192a348751b0',
            location: `${cities[random1000].city}, ${cities[random1000].state}`,
            title: `${sample(descriptors)} ${sample(places)}`,
            description: 'Lorem ipsum dolor sit amet consectetur adipisicing elit. Eum at tempora eos perspiciatis amet quibusdam sed labore beatae esse dolorem error, quo provident omnis debitis et soluta veniam nemo vero.',
            price,
            images: [
                {
                    url: 'https://res.cloudinary.com/dakj8eiql/image/upload/v1623861736/YelpCamp/iwt7cfltie5hdv3gmijl.jpg',
                    filename: 'YelpCamp/iwt7cfltie5hdv3gmijl'
                },
                {
                    url: 'https://res.cloudinary.com/dakj8eiql/image/upload/v1623861738/YelpCamp/ivejqmcgpe7qwqrwyogx.jpg',
                    filename: 'YelpCamp/ivejqmcgpe7qwqrwyogx'
                },
                {
                    url: 'https://res.cloudinary.com/dakj8eiql/image/upload/v1623861739/YelpCamp/qdgiccj5ujekjzvg1v2p.jpg',
                    filename: 'YelpCamp/qdgiccj5ujekjzvg1v2p'
                }
            ]
        })
        await camp.save();
    }
}

seedDB().then(() => {
    mongoose.connection.close();
})