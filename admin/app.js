const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const multer = require("multer");
const sharp = require("sharp");
const pug = require("pug");
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

app.use(express.static("app/public"));

app.set("views", "app/public/views"); // set the views directory
app.set("view engine", "pug"); // use pug to  render the pug files

mongoose.connect("mongodb://admin:11Jelszo@dbServer:27017/galeriDB", {
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

async function getDescription(item) {
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
    return Promise.resolve(description);
  } catch (error) {
    console.error(`Error reading file ${descriptionFilePath}: ${error}`);
    return Promise.resolve("No description available");
  }
}

async function getEntries() {
  try {
    const actualExib = await EntryModel.findOne({ isExib: true }).sort({
      Date: -1,
    });
    const pastExibs = await EntryModel.find({
      isExib: true,
      _id: { $ne: actualExib._id },
    })
      .sort({ Date: -1 })
      .limit(3);
    const actualEvent = await EntryModel.findOne({ isExib: false }).sort({
      Date: -1,
    });

    const actualExibData = actualExib
      ? {
          ...actualExib.toObject(),
          description: await getDescription(actualExib),
        }
      : null;

    const pastExibsData = await Promise.all(
      pastExibs.map(async (item) => {
        return {
          ...item.toObject(),
          description: await getDescription(item),
        };
      })
    );

    const actualEventData = actualEvent
      ? {
          ...actualEvent.toObject(),
          description: await getDescription(actualEvent),
        }
      : null;

    return { actualExibData, pastExibsData, actualEventData };
  } catch (error) {
    console.error(`Error retrieving entries: ${error}`);
    throw new Error("Internal server error");
  }
}

async function updateIndexPage() {
  // const actualExib = {
  //   artist: newEntry.artist,
  //   title: newEntry.title,
  //   date: newEntry.date,
  //   directory: newEntry.directory,
  // };

  // get description from directory and update
  // actualExib.description

  // const pastExibs = [{}, {}, {}];
  // const actualEvent = {};
  const { actualExibData, pastExibsData, actualEventData } = await getEntries();
  const renderedHtml = pug.renderFile("app/public/views/index.pug", {
    actualExib: actualExibData,
    pastExibs: pastExibsData,
    actualEvent: actualEventData,
  });

  const filePath = path.join(__dirname, "app/public/indexGen.html");
  // Save the rendered HTML to the file
  fs.writeFile(filePath, renderedHtml, function (err) {
    if (err) {
      console.error("Error saving file:", err);
    } else {
      console.log("File saved successfully");
    }
  });
}

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "app/public/admin.html"));
});

app.get(["/", "/index"], async (req, res) => {
  res.sendFile(path.join(__dirname, "app/public/indexGen.html"));
});

app.get("/generalj", (req, res) => {
  updateIndexPage();
  res.sendFile(path.join(__dirname, "app/public/indexGen.html"));
});

async function insertEntries(entries) {
  // const result = await db.collection('entries').insertMany(entries);
  const result = await db.collection("entries").insertOne(entries);
  console.log(`Entries inserted: ${JSON.stringify(result.ops)}`);
}

// Resizes the provided file buffer into specified sizes and names in .webp format
//  @param {Buffer} fileBuffer - The file buffer to be resized
//  @param {Path} directoryPath - The path where the resized files should be saved to
//  @param {Object} sizes - An object containing image names and their widths, for example: { L:1920, M:768, S:480 }
//  @returns {Promise} A promise that resolves to an array of resized image buffers
async function resizeAndSaveFile(fileBuffer, sizes) {
  const sharpImage = sharp(fileBuffer);
  const promises = [];

  // const path = path.join('rootpath', $loopedname,webp)

  // Iterate over sizes and create promises to resize the image for each size
  for (const [name, width] of Object.entries(sizes)) {
    const imageBuffer = await sharpImage.resize(width).webp().toBuffer();
    promises.push(
      new Promise((resolve, reject) => {
        fs.writeFile(`${name}.webp`, imageBuffer, (error) => {
          if (error) {
            console.log("volt azért egy error.");
            console.log("");
            reject(error);
          } else {
            resolve(imageBuffer);
          }
        });
      })
    );
  }

  // Wait for all promises to resolve and return the array of resized image buffers
  return Promise.all(promises);
}

app.post(
  "/uploadEvent",
  upload.fields([{ name: "image" }, { name: "imaGalery" }]),
  (req, res, next) => {
    const numImages = req.files["imaGalery"]
      ? req.files["imaGalery"].length
      : 0; // Check if imaGalery files were uploaded

    const newEntry = new EntryModel({
      title: req.body.title,
      artist: req.body.artist,
      date: new Date(req.body.date),
      tags: req.body.tagsList
        .slice(0, -1)
        .split(";")
        .map((tag) => tag.trim()),
      directory: `${
        req.body.exOrEvCheckbox === "on" ? "exibs" : "events"
      }/${createString({
        title: req.body.title,
        artist: req.body.artist,
      })}`,
      numImages: numImages,
      isExib: req.body.exOrEvCheckbox === "on",
    });
    console.log(newEntry);

    const eventOrExib = newEntry.isExib ? "exibs" : "events";

    // create the subdirectory for the event
    const folderPath = path.join(__dirname, "/app/public", newEntry.directory);
    fs.mkdirSync(folderPath);

    // write the description to a description.txt
    const descriptionPath = path.join(folderPath, "description.txt");
    fs.writeFileSync(descriptionPath, req.body.description);

    // generate the cover images in L M S sizes
    const coverImgWidhts = {
      cover: 1980,
      coverM: 768,
      coverS: 480,
    };

    // <img srcset="image-480.webp 480w, image-768.webp 768w, image-1920.webp 1920w"
    //      sizes="(max-width: 480px) 100vw, (max-width: 768px) 50vw, 33.3vw"
    //      src="image-768.webp"
    //      alt="Image description">

    // // the destination file on the server
    const coverImagePath = path.join(folderPath, "cover.webp");
    // // read uploaded image using sharp
    // const uploadedCoverImage = sharp(req.files["image"][0].buffer);

    // resizeAndSaveFile(req.files["image"][0].buffer, coverImgWidhts);

    resizeAndSaveFile(req.files["image"][0].buffer, coverImgWidhts)
      .then((resizedImageBuffers) => {
        // Save the resized images to disk
        resizedImageBuffers.forEach((buffer, index) => {
          const name = Object.keys(coverImgWidhts)[index];
          console.log("ImageName: " + name);
          fs.writeFileSync(path.join(folderPath, `${name}.webp`), buffer);
        });
      })
      .catch((error) => {
        console.error(error);
      });

    // // convert image to webp format
    // uploadedCoverImage
    //   .webp({ quality: 100 })
    //   .toBuffer()
    //   .then((webpData) => {
    //     // write webp data to file
    //     fs.writeFileSync(coverImagePath, webpData);
    //   })
    //   .catch((err) => {
    //     console.error("Failed to convert image to webp format:", err);
    //   });

    // create a subfolder for the gallery images
    const galFolderPath = path.join(folderPath, "gal", "L");
    fs.mkdirSync(galFolderPath, { recursive: true });

    // save the gallery images to the subfolder if there are any
    if (newEntry.numImages != 0) {
      req.files["imaGalery"].forEach((image, index) => {
        const galleryImageExtension = path.extname(image.originalname); // get the extension of the uploaded file
        const paddedIndex = `${index + 1}`.padStart(2, "0"); // pad the index with leading zeros if it is less than 10
        const galleryImagePath = path.join(
          galFolderPath,
          `${paddedIndex}${galleryImageExtension}`
        ); // use the extension to create the filename
        fs.writeFileSync(galleryImagePath, image.buffer);
      });
    }

    // itt lesz az a kód ami puggal renderel egy html filet
    const eventRenderObject = {
      artist: newEntry.artist,
      title: newEntry.title,
      date: newEntry.date,
      tags: newEntry.tags,
      description: req.body.description,
      numImages: newEntry.numImages,
      directory: newEntry.directory,
    };

    console.log("eventRenderObject: ");
    console.log(eventRenderObject);

    const renderedHtml = pug.renderFile(
      "app/public/views/dinamikusEventPage.pug",
      { event: eventRenderObject }
    );
    // const filePath = path.join(
    //   __dirname,
    //   `app/public/exibs/${newEntry.directory}/eventPage.html`
    // );
    const filePath = path.join(folderPath, "eventPage.html");
    // Save the rendered HTML to the file
    fs.writeFile(filePath, renderedHtml, function (err) {
      if (err) {
        console.error("Error saving file:", err);
      } else {
        console.log("File saved successfully");
      }
    });

    // irj már valami minimális errorhandlinget legalább légyszike
    // és akkor lehet olyan, hogy ha a filedolgok errort dobnak akkor ne írj a débébe se és fordítva
    insertEntries(newEntry);

    console.log(filePath);

    const checkFileInterval = setInterval(() => {
      fs.access(coverImagePath, fs.constants.F_OK, (err) => {
        if (!err) {
          // The cover image file exists, clear the interval and redirect the user
          clearInterval(checkFileInterval);
          updateIndexPage();
          res.redirect(`/${newEntry.directory}/eventPage.html`);
        } else {
          console.log("Can't find the cover :(");
        }
      });
    }, 100);
  }
);

app.listen(3000, () => {
  console.log("Admin server started on port 3000 (expd on 3001)");
});
