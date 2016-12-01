var mongo = require("./mongo");
var mongoURL = "mongodb://apps92:shim123@ds155727.mlab.com:55727/airbnbproto";
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Trip = require('./Models/trip');


var submitReviewForTrip = function(msg,callback) {


	Trip.update({"trip_id":msg.trip_id}, {$push : {Reviews : {ratings : msg.ratings, feedback : msg.feedback, photo : msg.photo}}}, function(err,result) {
		if(!err){
			console.log(result);
			callback(null,{"status":200,"result":"Review Submitted"});
			}
		else{
			console.log(err);
			callback(err,{"status":400,"result":"Bad Request"});
		}
	});

};

exports.submitReviewForTrip = submitReviewForTrip;