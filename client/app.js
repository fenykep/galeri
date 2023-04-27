const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const { promises: fs } = require("fs");

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
});

// app.get("/exibs", async (req, res) => {
//   const entry = await EntryModel.find();

//   const data = await Promise.all(entry.map(async (item) => {
//     const descriptionFilePath = path.join(__dirname, "public", "exibs", item.directory, "description.txt");
//     const description = await fs.promises.readFile(descriptionFilePath, 'utf-8');
//     return { ...item.toObject(), description };
//   }));

//   res.render("exibsMenu", { data });
// });

app.get("/exibs", async (req, res) => {
  try {
    const entry = await EntryModel.find();

    const data = await Promise.all(entry.map(async (item) => {
      const descriptionFilePath = path.join(__dirname, "app", "public", "exibs", item.directory, "description.txt");
      let description;
      try {
        description = await fs.readFile(descriptionFilePath, 'utf-8');
      } catch (error) {
        console.error(`Error reading file ${descriptionFilePath}: ${error}`);
        description = "No description available";
      }
      return { ...item.toObject(), description };
    }));

    res.render("exibsMenu", { data });
  } catch (error) {
    console.error(`Error retrieving exibs: ${error}`);
    res.status(500).send("Internal server error");
  }
});

app.listen(3000, () => {
  console.log("Server started on port 3000.");
});
