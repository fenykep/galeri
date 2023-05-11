const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const express = require("express");
const path = require("path");
const fs = require("fs");

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

// remove this later, only until we have generated all the artists
async function getDescription(artistDir) {
  const descriptionFilePath = path.join(
    __dirname,
    "app",
    "public",
    "artists",
    artistDir,
    "description.txt"
  );
  let description;
  try {
    description = await fs.readFileSync(descriptionFilePath, "utf-8");
    return Promise.resolve(description);
  } catch (error) {
    console.error(`Error reading file ${descriptionFilePath}: ${error}`);
    return Promise.resolve("Róla még nem regéltek a krónikák");
  }
}

const EntryModel = mongoose.model("Entry", entrySchema);

app.use(express.static("app/public"));

async function getEntries(isExib) {
  try {
    const entry = await EntryModel.find({ isExib }).sort({
      date: -1,
    });

    const data = await Promise.all(
      entry.map(async (item) => {
        const descriptionFilePath = path.join(
          __dirname,
          "app",
          "public",
          item.directory,
          "description.txt"
        );
        let description;
        try {
          description = await fs.readFileSync(descriptionFilePath, "utf-8");
        } catch (error) {
          console.error(`Error reading file ${descriptionFilePath}: ${error}`);
          description = "Ezt az eseményt nem írtuk (még) le.";
        }
        return { ...item.toObject(), description };
      })
    );

    return data;
  } catch (error) {
    console.error(`Error retrieving entries: ${error}`);
    throw new Error("Internal server error");
  }
}

app.get("/artist/:artistname", async (req, res) => {
  const deSanitizerDict = {
      'claudemonet': 'Claude Monet',
      'georgiaokeeffe': "Georgia O'Keeffe",
      'fridakahlo': 'Frida Kahlo',
      'kemnygyrgy': 'Kemény György',
      'pablopicasso': 'Pablo Picasso',
      'yayoikusama': 'Yayoi Kusama',
      'marycassatt': 'Mary Cassatt',
      'vincentvangogh': 'Vincent van Gogh'
    };
  const artistName = req.params.artistname;
  // const artistDirectory = artistName.replace(/\W+/g, '').toLowerCase();

  const description = await getDescription(artistName);
  res.render("artistPage", { name: deSanitizerDict[artistName], directory: artistName, description: description });
});


app.get("/events", async (req, res) => {
  const data = await getEntries(false);
  res.render("exibsMenu", { data });
});

app.get("/exibs", async (req, res) => {
  const data = await getEntries(true);
  res.render("exibsMenu", { data });
});

app.listen(3000, () => {
  console.log("Server started on port 3000.");
});
