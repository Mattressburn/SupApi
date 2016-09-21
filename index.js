//commenting to see if this forces a push and a build on Travis

var express = require('express');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var bcrypt = require('bcryptjs');
var passport = require('passport');
var BasicStrategy = require('passport-http').BasicStrategy;


mongoose.Promise = global.Promise; //instead of using mongoose lib, use node lib
var User = require('./models/user');
var Message = require('./models/message');

var app = express();
var jsonParser = bodyParser.json();

//Basic strategy
var stategy = new BasicStrategy(function(username, password, callback) {
    User.findOne({
        username: username
    }, function(err, user) {
        if (err) {
            callback(err);
            return;
        }
        if (!user) {
            return callback(null, false, {
                message: 'Incorrect username.'
            });
        }

        user.validatePassword(password, function(err, isValid) {
            if (err) {
                return callback(err);
            }

            if (!isValid) {
                return callback(null, false, {
                    message: 'Incorrect password.'
                });
            }
            return callback(null, user);
        });
    });
});

passport.use(stategy);

app.use(passport.initialize());

//API endpoints for USERS

// Users can only see the list of usernames
app.get('/users',
    passport.authenticate('basic', {
        session: false
    }),
    function(req, res) {
        console.log(typeof req.user.username);
        console.log(typeof req.user.password);
        User.find({}, function(err, users) { //blank obj means it searches for EVERYTHING
            if (err) {
                return res.status(err + 'basic authentication failed');
            }
            var newUsersArray = [];
            users.forEach(function(user) {
                    newUsersArray.push({_id: user._id, username: user.username});
            })
            res.json(newUsersArray);
        });
    }
);

app.post('/users', jsonParser, function(req, res) {
    if (!req.body) {
        return res.status(400).json({
            message: "No request body"
        })
    }

    if (!('username' in req.body)) {
        return res.status(422).json({
            message: 'Missing field: username'
        });
    }

    var username = req.body.username;

    if (typeof username !== 'string') {
        return res.status(422).json({
            message: 'Incorrect field type: username'
        });
    }

    username = username.trim();

    if (username === '') {
        return res.status(422).json({
            message: 'Incorrect field length: username'
        });
    }

    if (!('password' in req.body)) {
        return res.status(422).json({
            message: 'Missing field: password'
        });
    }

    var password = req.body.password;

    if (typeof password !== 'string') {
        return res.status(422).json({
            message: 'Incorrect field type: password'
        });
    }

    password = password.trim();

    if (password === '') {
        return res.status(422).json({
            message: 'Incorrect field length: password'
        });
    }

    bcrypt.genSalt(10, function(err, salt) {
        if (err) {
            return res.status(500).json({
                message: 'Internal server error'
            });
        }

        bcrypt.hash(password, salt, function(err, hash) {
            if (err) {
                return res.status(500).json({
                    message: 'Internal server error'
                });
            }

            var user = new User({
                username: username,
                password: hash
            });

            user.save(function(err) {
                if (err) {
                    return res.status(500).json({
                        message: 'Internal server error'
                    });
                }
                //   return res.status(201).json({});
                console.log('Username and password created');
                return res.status(201).location('/users/' + user._id).json({});
            });
        })

    });

    /* User.create({username: req.body.username}, function(err, user) {

        if(!req.body.username) {
            return res.status(422).json({'message': 'Missing field: username'});
        } else if(typeof req.body.username !== 'string') {
            return res.status(422).json({'message': 'Incorrect field type: username'})
        }
        
        res.status(201).location('/users/' + user._id).json({});
    }); */
});


//after authorization, the user should only be able to see their own username, and password, and can only view other's username but not password
app.get("/users/:userId", function(req, res) {
    var id = req.params.userId;
    
    
    User.findOne({
        _id: id
    }, function(err, user) {
        if (!user) {
            //console.log("You made it! good job! :+1:");
            return res.status(404).json({
                "message": "User not found"
            });
        }
        res.status(200).json({
            "username": user.username,
            "_id": user._id
        });
    });

});


//only the user can change his/her own username - lavie done
app.put("/users/:userId", jsonParser, passport.authenticate('basic', {
        session: false
    }), function(req, res) {
        
        var id = req.params.userId,
            newName = req.body.username,
            newPassword = req.body.password,
            authenticatedId = req.user._id,
            type = req.body.type;
    
        if (id.toString() !== authenticatedId.toString()) {
            return res.status(422).json({
                'message': 'Unauthorized user'
            });
        }
        
        if(type === "updateUsernamePassword") {
            bcrypt.genSalt(10, function(err, salt) {
                if (err) {
                    return res.status(500).json({
                        message: 'Internal server error'
                    });
                }
                bcrypt.hash(newPassword, salt, function(err, hash) {
                    if (err) {
                        return res.status(500).json({
                            message: 'Internal server error'
                        });
                    }
                 User.findByIdAndUpdate(
                    id,
                    {username: newName.toString(), password: hash.toString()}, 
                    {upsert: true}, 
                    function(err, user) {
                        res.status(200).json({})
                        });
    
                });
            });
        }
        
        if(type === "updateUsername") {
            User.findByIdAndUpdate(
                id,
                    {username: newName.toString()}, 
                        {upsert: true}, 
                        function(err, user) {
                            res.status(200).json({})
                        }
            );
        }
        if(type === "updatePassword") {
             bcrypt.genSalt(10, function(err, salt) {
                if (err) {
                    return res.status(500).json({
                        message: 'Internal server error'
                    });
                }
                bcrypt.hash(newPassword, salt, function(err, hash) {
                    if (err) {
                        return res.status(500).json({
                            message: 'Internal server error'
                        });
                    }
                 User.findByIdAndUpdate(
                    id,
                    {password: hash.toString()}, 
                    {upsert: true}, 
                    function(err, user) {
                        res.status(200).json({})
                        });
                });
            });
        };
});





//only the authenticated username can delete his/her own account 
app.delete("/users/:userId", jsonParser, function(req, res) {
    var id = req.params.userId;
    User.findOneAndRemove({
        _id: id
    }, function(err, user) {
        if (!user) {
            return res.status(404).json({
                'message': 'User not found'
            });
        }
        res.status(200).json({});
    });
});

//API endpoints for MESSAGES

app.get('/messages', passport.authenticate('basic', {
    session: false
}), function(req, res) {
    var messages = [];
    var options = [{
        path: 'from'
    }, {
        path: 'to'
    }];
    var query = req.query;

    Message.find(query)
        .populate('from to')
        .exec(function(err, message) {
            return res.status(200).json(message);
        });
});


app.post('/messages', jsonParser, passport.authenticate('basic', {
        session: false
    }),

    function(req, res) {
        var fromId = req.user._id.toString();
        var fromIdInput = req.body.from;

        if (!req.body.text) {
            return res.status(422).json({
                "message": "Missing field: text"
            });
        }
        else if (typeof(req.body.text) !== "string") {
            return res.status(422).json({
                "message": "Incorrect field type: text"
            });
        }
        else if (typeof(req.body.to) !== "string") {
            return res.status(422).json({
                "message": "Incorrect field type: to"
            });
        }
        if (fromId !== fromIdInput) {
            return res.status(422).json({
                "message": "you can't steal another person's identication"
            });
        }
        //   else if(typeof(req.body.from) !== "string") {
        //       console.log(req.body.from);
        //       return res.status(422).json({"message": "Incorrect field type: from"});
        //   }

        User.findOne({
                _id: req.body.to
            }) //checks if query passes(syntax errors only)
            .then(function(user) {
                //checks if user is found/not
                if (!user) return res.status(422).json({
                    message: 'Incorrect field value: to'
                });
                User.findOne({
                    _id: req.body.from
                });
            })
            // .then(function(user) { //chain continues
            //     if (!user) return res.status(422).json({ message: 'Incorrect field value: from'});

        //have id = _id, and store all messages
        Message.create(req.body, function(err, message) {
            //console.log(message);
            if (err) {
                console.error(err);
                return res.sendStatus(500);
            }
            return res.status(201).location("/messages/" + message._id).json({});
        });
    }); //catch runs when there is query runs into an error
// .catch(function(err){
//     console.error(err);
//     return res.sendStatus(500);
// });
// });

// app.get('/users', 
//     passport.authenticate('basic', {session: false}),
//     function(req, res) {
//         User.find({}, function(err, user) { //blank obj means it searches for EVERYTHING
//             if(err) {
//                 return res.status(err + 'basic authentication failed');
//             }
//             res.json(user);
//         });
//     }
// );



app.get("/messages/:messageId",
    jsonParser,
    passport.authenticate('basic', {
        session: false
    }),
    function(req, res) {

        //authentication username should be able to see messages that he/she sent(from) or received(to)
        //this is the user id from the authentication
        var userId = req.user._id.toString();

        var msgID = req.params.messageId;

        Message
            .findOne({
                _id: msgID
            })
            .populate('to from')
            .exec(function(err, message) {

                //these are the user id's from the message to and from based on found message
                var msgUserFromId = message.from._id.toString();
                var msgUserToId = message.to._id.toString();
                
                if (err) {
                    console.error(err);
                    return res.sendStatus(500);
                }
                if (!message) {
                    return res.status(404).json({
                        "message": "Message not found"
                    });
                }

                //if the id from authentication matches either the sent or receiver
                //message will show
                if (userId === msgUserFromId || userId === msgUserToId) {
                    return res.status(200).json(message);
                }
                //otherwise, return error
                return res.status(404).json({
                    "message": "Cannot retrieve unauthorized message"
                });
            });
    });

var runServer = function(callback) {
    var databaseUri = process.env.DATABASE_URI || global.databaseUri || 'mongodb://localhost/sup';
    mongoose.connect(databaseUri).then(function() {
        var port = process.env.PORT || 8080;
        var server = app.listen(port, function() {
            console.log('Listening on localhost:' + port);
            if (callback) {
                callback(server);
                console.log('server running');
            }
        });
    })
    .catch(function(err){
        console.log(err)
    });
};

if (require.main === module) {
    runServer();
};

exports.app = app;
exports.runServer = runServer;
