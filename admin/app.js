const mongoose = require("mongoose");
const express = require("express");
const multer = require("multer");
const sharp = require("sharp");
const path = require("path");
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
const upload = multer({
  limits: {
    fieldSize: 500 * 1024 * 1024, // 10MB in bytes
  },
});

app.use(express.static("app/public"));

app.set("views", "app/public/views"); // set the views directory
app.set("view engine", "pug"); // use pug to  render the pug files

const http_password = process.env.SELFPOST_SECRET;

const mongodbAdminPassword = process.env.MONGODB_ADMIN_PASSWORD;
const adminUri = `mongodb://admin:${mongodbAdminPassword}@dbServer:27017/galeriDB`;

mongoose
  .connect(adminUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Connected to MongoDB as admin");
  })
  .catch((error) => {
    console.error("Error connecting to MongoDB as admin:", error);
  });

// mongoose.connect(`mongodb://admin:11Jelszo@dbServer:27017/galeriDB`, {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
// });

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
    return Promise.resolve("Ezt az eseményt nem írtuk (még) le.");
  }
}

async function getEntries() {
  try {
    const actualExib = await EntryModel.findOne({ isExib: true }).sort({
      date: -1,
    });
    const pastExibs = await EntryModel.find({
      isExib: true,
      _id: { $ne: actualExib._id },
    })
      .sort({ date: -1 })
      .limit(3);
    const actualEvent = await EntryModel.findOne({ isExib: false }).sort({
      date: -1,
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

async function getAllEntries() {
  try {
    const entry = await EntryModel.find().sort({
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

async function updateIndexPage() {
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
      console.log("Index page updated successfully");
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

app.delete("/delEvent", upload.none(), (req, res) => {
  const { url, entered_password } = req.body;

  // const parsedURL = url.replace(/^\/|\/cover\.webp$/g, '');
  console.log(url);

  if (entered_password != http_password) {
    res.status(401).send("Unauthorized");
    throw new Error("Illetékteleneknek belépni tilos.");
  }

  const folderPath = path.join(__dirname, "/app/public", url);

  fs.rm(folderPath, { recursive: true }, (err) => {
    if (err) {
      console.error("Error removing directory:", err);
    } else {
      console.log("Directory removed successfully");
      db.collection("entries").deleteOne(
        { directory: url },
        (error, result) => {
          if (error) {
            console.error("Error deleting entry:", error);
          } else {
            console.log("Entry deleted successfully");
            updateIndexPage(); // Update the index page after successful deletion
          }
        }
      );
    }
  });

  res.sendFile(path.join(__dirname, "app/public/indexGen.html"));
});

// This is the endpoint which will display all events and exhibitions
// with all the cards having a smaall X to delete them
app.get("/eventsAdmin", async (req, res) => {
  const data = await getAllEntries();
  res.render("exibsMenu", { data, isRenderedFromAdmin: true });
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

app.post("/changeLandingImages", upload.none(), (req, res) => {
  // console.log(req.body);
  console.log("hallikóka, megjott!!");
  const { images, imageNames, entered_password } = req.body;

  // Check password for authentication
  if (req.body.entered_password != http_password) {
    res.status(401).send("Unauthorized");
    throw new Error("Illetékteleneknek belépni tilos.");
  }

  // If no images provided, redirect to '/'
  if (!images || images.length === 0) {
    return res.redirect("/");
  }

  // Loop through the images and save them to disk
  images.forEach((image, index) => {
    // const { src, name } = image;
    const filePath = path.join(
      __dirname,
      "app/public/img/cover/",
      imageNames[index]
    );

    const imageData = image.replace(/^data:image\/\w+;base64,/, ""); // Remove the data URL prefix

    // Convert the image URL to a Buffer
    const imageBuffer = Buffer.from(imageData, "base64");

    fs.writeFileSync(filePath, imageBuffer);
  });

  // Return a success response
  res.status(200).send("Images updated successfully");
});

app.post(
  "/uploadEvent",
  upload.fields([{ name: "image" }, { name: "imaGalery" }]),
  (req, res, next) => {
    if (req.body.entered_password != http_password) {
      res.status(401).send("Unauthorized");
      throw new Error("Illetékteleneknek belépni tilos.");
    }

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
      cover: 1920,
      coverM: 768,
      coverS: 480,
    };

    // // the destination file on the server
    const coverImagePath = path.join(folderPath, "cover.webp");

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

app.listen(2967, () => {
  console.log("Admin server started on port 2967 (not expd)");
});
