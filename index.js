const express = require('express')
const app = express()
const http = require('http').Server(app)

app.get('/', (req, res) => {
	res.sendFile(__dirname + '/index.html')
})

app.use('/assets', express.static(__dirname + '/assets/'))
app.use('/workers', express.static(__dirname + '/workers/'))

http.listen(3000, () => {
	console.log('Node app is running on port 3000')
})
