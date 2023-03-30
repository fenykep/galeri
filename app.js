const express = require('express')
const path = require('path')
const app = express()
const port = 3000

// const pagePath = path.join(__dirname, '..', 'page')
// app.use(express.static(path.join(__dirname, '..', 'page')))
app.use(express.static('page'))

app.get('/', (req, res) => {
  res.send('Hello World!')
})

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
