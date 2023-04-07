const express = require('express')
const mongoose = require('mongoose')
const path = require('path')
const app = express()
const port = 3000

// const pagePath = path.join(__dirname, '..', 'page')
// app.use(express.static(path.join(__dirname, '..', 'page')))
app.use(express.static('page'))

// serve images and CSS files from the "page" subdirectory
app.use('../page/img', express.static('page/img'))
app.use('../page/css', express.static('page/css'))


app.set('views', './res') // set the views directory
app.set('view engine', 'pug')


mongoose.connect('mongodb://db:27017/galeriDB', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

const entrySchema = new mongoose.Schema({
  id: Number,
  title: String,
  artist: String,
  date: Date,
  tags: [String],
  directory: String,
  numImages: Number,
  isExib: Boolean
});

const EntryModel = mongoose.model('Entry', entrySchema);



// const MongoClient = require('mongodb').MongoClient

// async function getCardData() {
//   const client = await MongoClient.connect('mongodb://localhost:27017')
//   const db = client.db('galeriDB')
//   const collection = db.collection('entries')
//   const cardData = await collection.findOne({ /* query to find the card data */ })
//   client.close()
//   return cardData
// }

app.get('/', (req, res) => {
  res.send('Hello World!')
})



app.get('/events', async (req, res) => {
  // const cardData = await getCardData(); // retrieve card data from MongoDB
  // res.render('menu', { title: cardData.title }); // pass title data to Pug template
  res.render('eventsMenu', { title: "Bolombér" })
});

app.get('/exibs', async (req, res) => {
    const entry = await EntryModel.find()

  res.render('exibsMenu', { data: entry })
});

app.get('/admin', (req, res) => {
    res.sendFile(__dirname + '/page/admin.html')
  // res.sendFile('admin.html')
})

app.post('/uploadEvent', (req, res) => {
  res.send('Got a POST request')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
