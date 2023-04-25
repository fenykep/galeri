const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.json());

app.set("views", "app/public/views"); // set the views directory
app.set("view engine", "pug"); // use pug to  render the pug files

mongoose.connect("mongodb://client:1jelszo@dbServer:27017/galeriDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on("error", console.error.bind(console, "MongoDB connection error:"));

const entrySchema = new mongoose.Schema({
  title: String,
  artist: String,
  date: Date,
  tags: [String],
  directory: String,
  numImages: Number,
  isExib: Boolean,
});

const EntryModel = mongoose.model("Entry", entrySchema);

app.use(express.static("app/public"));

// define a custom error handler middleware
// app.use((req, res) => {
//   res.status(404);
//   res.render('404', { title: 'Page not found' });
// });

app.get("/events", (req, res) => {
  res.send("itt lesz az eventek gridje");
  // const event = {
  //   artist: "Csángó Kalász",
  //   title: "Borókázás Bőrokávál",
  //   date: "2013-03-19",
  //   tags: ["majd", "kitöltöm"],
  //   numImages: 2,
  // };

  // const srcFolder =
  //   "exibs/" +
  //   createString({
  //     title: event.title,
  //     artist: event.artist,
  //   });
  // event.coverImageSrc = srcFolder + "/cover.png";
  // // event.galleryPath = srcFolder + "/gal/L";
  // event.galleryPath = `exibs/${srcFolder}/gal/L`;
  // res.render("eventPage", { event });
});

app.get("/exibs", async (req, res) => {
  const entry = await EntryModel.find();
  res.render("exibsMenu", { data: entry });
});

app.listen(3000, () => {
  console.log("Server started on port 3000.");
});
