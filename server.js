// grab all the packages
// configure the application
// create basic routes (unprotected and protected)

var express = require('express')
var app = express()
var bodyParser = require('body-parser')
var morgan = require('morgan')
var mongoose = require('mongoose')
var jwt = require('jsonwebtoken')
var config = require('./config')
var User = require('./app/models/user')

var port = process.env.PORT || 8080

mongoose.connect(config.database)
app.set('superSecret', config.secret)

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(morgan('dev'))

/* basic routes */
app.get('/', function (req, res) {
  res.send('Hello! the API is at http://localhost:' + port + ' api')
})

app.get('/setup', function (req, res) {
  var oleg = new User({
    name: 'Oleg Yanchinskiy',
    password: 'password',
    admin: true
  })

  oleg.save(function (err) {
    if (err) throw err

    console.log('user saved successfully')
    res.json({ success: true })
  })
})

/* API Routes */
var apiRoutes = express.Router()

var authenticateToken = function (req, res, next) {
  var token = req.body.token || req.query.token || req.headers['x-access-token']

  if (token) {
    jwt.verify(token, app.get('superSecret'), function (err, decoded) {
      if (err) {
        return res.json({ success: false, message: 'Failed to authenticate token.'})
      } else {
        req.decoded = decoded
        next()
      }
    })
  } else {
    /* if no token, return error */
    return res.status(403).send({
      success: false,
      message: 'where your token at?!'
    })
  }
}

/* (GET http://localhost:8080/api/) */
apiRoutes.get('/', function (req, res) {
  res.json({ message: 'welcome to the coolest api on earth'})
})

/* route to authenticate a user */
apiRoutes.post('/authenticate', function (req, res) {
  User.findOne({
    name: req.body.name
  }, function (err, user) {
    if (err) throw err

    if (!user) {
      res.json({ success: false, message: 'Authentication failed. User not found.' })
    } else if (user) {
      /* check if password matches */
      if (user.password != req.body.password) {
        res.json({ success: false, message: 'Authentication failed.  Incorrect passowrd'})
      } else {
        /* if user is found & correct password, create a token */
        var token = jwt.sign(user, app.get('superSecret'), {
          expiresIn: 14400000
        })
        res.json({
          success: true,
          message: 'Enjoy your token ' + user.name,
          token: token
        })
      }
    }
  })
})
/* route to return all users
  (GET http://localhost:8080/api/)
*/
apiRoutes.get('/users', authenticateToken, function (req, res) {
  User.find({}, function (err, users) {
    res.json(users)
  })
})

/* Apply the routes to our application with the prefix /api */
app.use('/api', apiRoutes)

/*
  start the server
*/
app.listen(port)
console.log('Magic happening at http://localhost:' + port)
