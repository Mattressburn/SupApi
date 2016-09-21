var mongoose = require('mongoose');
//must require from correct directory
var User = require('./models/user');
mongoose.connect('mongodb://localhost/sup').then(function() {
User.find(function(err, users) {
console.log(users);
});
});