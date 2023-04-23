const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const multer  = require('multer');
const fs = require("fs");

// two functions to create the directory name from the artists first name and the events name
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

const app = express();
const upload = multer();

app.use(express.static('app/public'));

app.set('views', 'app/public/views'); // set the views directory
app.set('view engine', 'pug'); // use pug to  render the pug files

mongoose.connect('mongodb://admin:11Jelszo@dbServer:27017/galeriDB', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

const entrySchema = new mongoose.Schema({
  title: String,
  artist: String,
  date: Date,
  tags: [String],
  directory: String,
  numImages: Number,
  isExib: Boolean,
});

const EntryModel = mongoose.model('Entry', entrySchema);

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'app/public/admin.html'));
});

async function insertEntries(entries) {
  // const result = await db.collection('entries').insertMany(entries);
  const result = await db.collection('entries').insertOne(entries);
  console.log(`Entries inserted: ${JSON.stringify(result.ops)}`);
};

app.post(
  "/uploadEvent",
  upload.fields([{ name: "image" }, { name: "imaGalery" }]),
  (req, res, next) => {
  // console.log('This is what we got:');
  // console.log(req.body);
  // console.log('the whole req:');
  // console.log(req);

  const newEntry = new EntryModel({
    title: req.body.title,
    artist: req.body.artist,
    date: new Date(req.body.date),
    tags: ["jovoben", "kitoltendo"],
    directory: createString({
      title: req.body.title,
      artist: req.body.artist,
    }),
    numImages: req.files["imaGalery"].length,
    isExib: true,
  });
  console.log(newEntry);

  // ezt majd írd át hogy működjön a konténerek és volumeok dirtreejével
  // create the subdirectory for the event
  const folderPath = path.join(
    __dirname,
    "/app/public",
    "exibs",
    newEntry.directory
  );
  fs.mkdirSync(folderPath);

  // write the description to a description.txt
  const descriptionPath = path.join(folderPath, "description.txt");
  fs.writeFileSync(descriptionPath, req.body.description);

  // save the cover image to the folder
  const coverImagePath = path.join(
    folderPath,
    "cover" + path.extname(req.files["image"][0].originalname)
  );
  fs.writeFileSync(coverImagePath, req.files["image"][0].buffer);

  // create a subfolder for the gallery images
  const galFolderPath = path.join(folderPath, "gal", "L");
  fs.mkdirSync(galFolderPath, { recursive: true });

  // save the gallery images to the subfolder
  req.files["imaGalery"].forEach((image, index) => {
    const galleryImageExtension = path.extname(image.originalname); // get the extension of the uploaded file
    const paddedIndex = `${index + 1}`.padStart(2, "0"); // pad the index with leading zeros if it is less than 10
    const galleryImagePath = path.join(
      galFolderPath,
      `${paddedIndex}${galleryImageExtension}`
    ); // use the extension to create the filename
    fs.writeFileSync(galleryImagePath, image.buffer);
  });

  // itt lesz az a kód ami puggal renderel egy html filet
  const eventRenderObject = {
    artist: newEntry.artist,
    title: newEntry.title,
    date: newEntry.date,
    tags: newEntry.tags,
    description: req.body.description,
    numImages: newEntry.numImages,
    coverImageSrc: `${newEntry.directory}/cover.png`,
    galleryPath: `${newEntry.directory}/gal/L`
  };

  console.log("eventRenderObject: ");
  console.log(eventRenderObject);

  // a pugnak amúgy innen tudnánk a legkönnyebben küldeni egy arrayt,
  // amiben csak annyi van, hogy ['01.png', '02.jpg', '03.jpeg', '04.png']

  // irj már valami minimális errorhandlinget legalább légyszike
  // és akkor lehet olyan, hogy ha a filedolgok errort dobnak akkor ne írj a débébe se és fordítva
  // insertEntries(newEntry);
  // res.send({ success: true });
  res.render("dinamikusEventPage", { event: eventRenderObject });
});


app.listen(3000, () => {
  console.log('Admin server started on port 3000 (expd on 3001)');
});
