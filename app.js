const express = require('express')
const mongoose = require('mongoose')
const path = require('path')
const bodyParser = require('body-parser')
const app = express()
const port = 3000

// const pagePath = path.join(__dirname, '..', 'page')
// app.use(express.static(path.join(__dirname, '..', 'page')))
app.use(express.static('page'))

// serve images and CSS files from the "page" subdirectory
app.use('../page/img', express.static('page/img'))
app.use('../page/css', express.static('page/css'))

app.use(bodyParser.json())

app.set('views', './res') // set the views directory
app.set('view engine', 'pug')


mongoose.connect('mongodb://db:27017/galeriDB', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})

const db = mongoose.connection
db.on('error', console.error.bind(console, 'MongoDB connection error:'))

const entrySchema = new mongoose.Schema({
  id: Number,
  title: String,
  artist: String,
  date: Date,
  tags: [String],
  directory: String,
  numImages: Number,
  isEvent: Boolean
})

const EntryModel = mongoose.model('Entry', entrySchema)



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
})

app.get('/exibs', async (req, res) => {
  const entry = await EntryModel.find()

  res.render('exibsMenu', { data: entry })
})

app.get('/admin', (req, res) => {
    res.sendFile(__dirname + '/page/admin.html')
  // res.sendFile('admin.html')
})

// const entries = [
//   {
//     id: 4,
//     title: 'Exhibition 1',
//     artist: 'Artist 1',
//     date: new Date('2023-04-01'),
//     tags: ['painting', 'sculpture'],
//     directory: 'exhibition1',
//     numImages: 10,
//     isEvent: false
//   }
// ]

async function insertEntries(entries) {
  // const result = await db.collection('entries').insertMany(entries);
  const result = await db.collection('entries').insertOne(entries)
  console.log(`${result.insertedCount} entries inserted`)
}

app.post('/uploadEvent', (req, res) => {
  // const { title, date } = req.body
  console.log(req.body)
  // insertEntries(entries);
  const newEntry = new EntryModel({
    id: 9, // auto-increment id logic goes here
    title: req.body.title,
    artist: 'Artist 1',
    date: new Date(req.body.date),
    tags: ['painting', 'sculpture'],
    directory: 'exibs/exhibition1',
    numImages: 4,
    isEvent: true
  })
  console.log(newEntry)
  insertEntries(newEntry)
  res.send({ success: true })
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
