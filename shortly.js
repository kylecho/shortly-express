var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var bcrypt = require('bcrypt-nodejs'); // we added it
var session = require('express-session'); // we added it
var knex = require('knex');

var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');

var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));

// To create session
app.use(session({ secret: 'keyboard cat', cookie: {maxAge: 800000} }));

// session({resave: true, saveUninitialized: true, secret: 'SOMERANDOMSECRETHERE', cookie: { maxAge: 60000 }

app.get('/',
function(req, res) {
  if (req.session.user === undefined) {
    res.redirect('/login');
  } else if (req.session.user) {
    res.render('index');
  }
});

app.get('/login',
  function(req, res) {
    res.render('login');  // else - error
  }
);

app.get('/create', 
function(req, res) {
  res.redirect('/login'); // need to consider cookies
});

app.get('/logout',
  function(req, res) {
    console.log(req.session.user + ' has logged out.');
    req.session.destroy();
    res.redirect('/'); // redirect to login page
  }
);

app.get('/links', 
function(req, res) {
  Links.reset().fetch().then(function(links) {
    res.send(200, links.models);
  });
});

app.get('/signup', 
function(req, res) {
  res.render('signup'); // need to consider cookies
});

app.post('/links', 
function(req, res) {
  var uri = req.body.url;

  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.send(404);
  }

  new Link({ url: uri }).fetch().then(function(found) {
    if (found) {
      res.send(200, found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.send(404);
        }

        Links.create({
          url: uri,
          title: title,
          base_url: req.headers.origin
        })
        .then(function(newLink) {
          res.send(200, newLink);
        });
      });
    }
  });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/

function checkUser (req) {
  if (req.session) {
    return true;
  } else {
    return false;
  }
}

// '/signup'
app.post('/signup',
function (req, res){
  var username = req.body.username;
  var password = req.body.password;
  var salt = bcrypt.genSaltSync(10);
  var hash = bcrypt.hashSync(password, salt); // generate hash with salt
  console.log(hash);

  Users.create({
    username: username,
    hash: hash
  })
  .then(function() {
    req.session.regenerate(function(){
      console.log("A new user " + username + " has signed up.");
      req.session.user = username; 
      res.redirect('/');  
    });
  });
});

// '/login'
app.post('/login',
function (req, res){
  var username = req.body.username;
  var password = req.body.password; // get password

  new User({ username: username }).fetch().then(function(found) {
    if (found && bcrypt.compareSync(password, found.attributes.hash)) { // compare with db's hash with new hash
      req.session.regenerate(function(){
        req.session.user = username; 
        res.redirect('/');
      });
    } else {
      res.redirect('/login');
    }
  });

});

// '/restricted' vs '/create'?


/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        link_id: link.get('id')
      });

      click.save().then(function() {
        link.set('visits', link.get('visits')+1);
        link.save().then(function() {
          return res.redirect(link.get('url'));
        });
      });
    }
  });
});

console.log('Shortly is listening on 4568');
app.listen(4568);

