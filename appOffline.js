const express = require("express");
const path = require("path");
const multer = require("multer");
const mongoose = require("mongoose");

// This is an app.js that has code for upload handling
// and also for generating exhibition pages

function replaceAccentedChars(str) {
  return str
    .toLowerCase()
    .replace(/[áäàãâ]/g, "a")
    .replace(/[éèêë]/g, "e")
    .replace(/[íìîï]/g, "i")
    .replace(/[óòôõöő]/g, "o")
    .replace(/[úùûüű]/g, "u");
}

function createString(obj) {
  const title = replaceAccentedChars(obj.title).replace(/[^a-z0-9]/g, "");

  const artist = replaceAccentedChars(obj.artist.split(" ")[0]).replace(
    /[^a-z0-9]/g,
    ""
  );

  const artistShort = artist.substring(0, 10);
  const titleShort = title.substring(0, 8);
  const result = artist + title;

  return result;
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const folderName = createString({
      title: req.body.title,
      artist: req.body.artist,
    });
    const dir = `.public/exibs/${folderName}`;
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, "cover" + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

const app = express();
app.use(
  "/tinymce",
  express.static(path.join(__dirname, "node_modules", "tinymce"))
);

app.use(express.static("public"));

app.set("views", "./views"); // set the views directory
app.set("view engine", "pug");

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "/admin.html"));
});

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

app.post("/uploadEvent", upload.single("image"), (req, res, next) => {
  // const { title, date } = req.body
  console.log("This is what we got:");
  console.log(req.body);

  // const obj = ;
  // const result = createString(obj);
  console.log(createString({ title: req.body.title, artist: req.body.artist }));

  // insertEntries(entries);
  const newEntry = new EntryModel({
    title: req.body.title,
    artist: req.body.artist,
    date: new Date(req.body.date),
    tags: ["jovoben", "kitoltendo"],
    directory:
      "exibs/" +
      createString({ title: req.body.title, artist: req.body.artist }),
    numImages: 4,
    isExib: true,
  });
  console.log(newEntry);
  res.send({ success: true });
});

app.get("/event", async (req, res) => {
  const event = {
    artist: 'Csángó Kalász',
    title: 'Borókázás Bőrokávál',
    date: '2013-03-19',
    tags: ['majd', 'kitöltöm'],
    numImages: 2
  };
  
  const srcFolder = "exibs/"+createString({
    title: event.title,
    artist: event.artist,
  });
  event.coverImageSrc = srcFolder+'/cover.png';
  event.galleryPath = srcFolder+'/gal/L';
  // event.galleryPath = `exibs/${event.title}${event.artist}/alma.jpg`;
  res.render("eventPage", { event });
});

app.listen(3000, () => {
  console.log("TestServer started on P3000");
});
