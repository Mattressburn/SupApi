var mongoose = require('mongoose');
var user = require('./user');
var bcrypt = require('bcryptjs');

var MessageSchema = new mongoose.Schema({
    from: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    to: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    text: {
        type: String,
        required: true
    }
});

MessageSchema.methods.validatePassword = function(password, callback) {
        bcrypt.compare(password, user.password, function(err, isValid) {
            if (err) {
                callback(err);
                return;
            }
            callback(null, isValid);
        });
};

var Message = mongoose.model('Message', MessageSchema);
module.exports = Message;
