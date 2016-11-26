var mongo = require("./mongo");
var mongoURL = "mongodb://apps92:shim123@ds155727.mlab.com:55727/airbnbproto";
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Users = require('../Models/user');
var bcrypt = require('bcryptjs');
var uniqueIDGenerator = require('../routes/uniqueIDGenerator');
var passport = require('passport');
require('./passport')(passport);
var moment = require('moment');
var LocalStrategy = require('passport-local').Strategy;

//initial setup
var winston = require('winston');
winston.add(winston.transports.File, { filename: 'public/LogFiles/AirbnbAnalysis.json' });
winston.remove(winston.transports.Console);

var userSignup = function(req,res){

	console.log("Inside signup user");
	req.body.user.user_id = uniqueIDGenerator.returnUniqueID();

	if(req.body.user.UserType=="Host")
		req.body.user.user_status = "inactive";
	else
		req.body.user.user_status = "active";
	
	var salt = bcrypt.genSaltSync(10); //encryption
	if(typeof req.body.user.password !== "undefined"){
		var hash = bcrypt.hashSync(req.body.user.password, salt); //encryption	
	}
	if(req.body.user.password == null || req.body.user.firstname == null 
			|| req.body.user.email == null ){
		res.json({"result":"These fields cannot be null"});
		return;
	} else{
		req.body.user.password = hash;	
	}
	Users.find({"email":req.body.user.email},function(err,user){
		console.log("found");
		console.log(user);
		
		if(user.length > 0){
			res.status(400);
			res.json({"result":"user already present"});
			return;
		}

		var user = new Users(req.body.user);
		user.save(function(err,result){
				if(!err){
					console.log(result);
					res.status(200);
					res.json({"result":"user LoggedIn"});
					return;
				}
				else{
					console.log("inside error");
					console.log(err);
					return;
				}
					
			});
		

	})
	
	
};
/*passport.use('user',new LocalStrategy({
    usernameField: 'email'
},
function(username, password, done) {
  console.log("I am checking here"+username);
  console.log("I am checking password"+password);
  Users.findOne({ email: username }, function (err, user) {
  if (err) { return done(err); }
  if (!user) {
	  console.log("Wrong Email");
    return done(null, false, { message: 'Incorrect email.' });
  }		      
  console.log(user);
  var hash = user.password;
	console.log(hash);
    if(!bcrypt.compareSync(password, hash)){
    	console.log("Wrong password");
    	return done(null, false, { message: 'Incorrect password.' });
    }
    console.log("Correct password");
  
  return done(null, user);
});
}
));*/


var authenticateLocal = function (req,res,next){

	console.log("inside Passport signin register");

	passport.authenticate('user',function(err,user,info){
	if(err) {
      return next(err);
    }
    if(!user) {
    	res.status(400);
		res.json(info);
		return;
     // return res.redirect('/');
    }
    req.logIn(user, {session:false}, function(err) {
      if(err) {
        return next(err);
      }
      console.log(user);
      console.log("storing in session");
	 //console.log("Testing for user",res);
	 if(user.avgrating==null||user.avgrating==undefined)
	 {
	 	user.avgrating=0;
	 }
	     var userObject = {
	     	"firstname": user.firstname,
	     	"lastname" : user.lastname,
	     	"avgrating" : user.avgrating,
	     	"emailId": user.email,
	     	"UserType": user.UserType,
	     	"user_id":user.user_id,
	     	"address" : user.address,
	     	"session_id" : uniqueIDGenerator.returnUniqueID(),
	     	"user_tracker" : []
	     }
	 	req.session.user = userObject;
	 	console.log("session id "+req.session.user.session_id);

	 	//log capture
	 	//remove previous file everytime and add the one in which next log is to be stored
	 	winston.remove(winston.transports.File);
		winston.add(winston.transports.File, { filename: 'public/LogFiles/AirbnbAnalysis.json' });
	 	winston.log('info', 'login button clicked', { page_name : 'login_page', user_email : req.session.user.emailId, city : req.session.user.address.city, state : req.session.user.address.state, country : req.session.user.address.country});

	 	winston.remove(winston.transports.File);
		winston.add(winston.transports.File, { filename: 'public/LogFiles/UserTracking.json' });
		//req.session.user.user_tracker.push(["login_page", new Date]);
		req.session.user.user_tracker.push("login_page");
	 	winston.log('info', 'user tracker updated', {session_id : req.session.user.session_id, user_email : req.session.user.emailId, "user_tracker" : req.session.user.user_tracker});


	 	//console.log(req.session.emailId);
		res.json({"userLoggedIn":true});
		return;
		 //return res.redirect('/');
	});
	
})(req, res, next);
};


/*
var userLogIn = function(req,res){
	console.log("Inside user sign in");
	

	Users.findOne({"email":req.body.UserLogin.email},function(err,user){
 		if(err || user == null){
 			console.log("user not found");
 			res
 			.status(404)
 			.send({"result":"user not found"});
 			return;
 		}
 				
 
      var hash = user.password;
 		console.log(hash);
      if(bcrypt.compareSync(req.body.UserLogin.password, hash)){
      	console.log("successful login");
      	req.session.email = user.email;
      	req.session.username = user.firstname;
      	res
  		.status(200)
  		.send({"result":"user Logged in"});
  		return;
      } else{
    	  res
    		.status(400)
    		.send({"result":"Wrong Password"});
      }
 })
	
};
*/
var deleteLogin = function(req,res){
	Users.update({"email":req.body.user.email}, {$set : {user_status : "inactive" }}, function(err, removed){	
		console.log(removed);
		if(err || removed == null){
			res
			.status(400)
			.send({"result":"Bad Request"});
			return;
		}
		
		res
		.status(200)
		.send({"result":"User Deleted"});
	} );
 	};
//updateHostProfile function updates host profile details
var updateHostProfile = function(req,res){
 		console.log("Inside user Profile Update");
 		var dateString = req.body.birthMonth + "-" + req.body.birthDay + "-" + req.body.birthYear;
 		console.log(dateString);
 		console.log(req.body);
 		var momentObj = moment(dateString, 'MM-DD-YYYY');
 		var hostBirthDay = momentObj.format('YYYY-MM-DD');
 		console.log(hostBirthDay);
 		req.body.birthdate = hostBirthDay; //to save the host birthday
 		req.body.UserType = "host";
 		
 		var query = {'email':req.body.email};

 		//console.log(req.body.user);
 		
 		Users.findOneAndUpdate(query, req.body, {upsert:false}, function(err, doc){
 			
 		    if (err) {
 		    	res
 				.status(400)
 				.send({"result":"Bad request"});
 				return;
 		    }
 		    else {
 		    	console.log(doc);
 		res
 	 	.status(200)
 	 	.send({"result":"User Updated"});
 			
 		};
 		})
 		
};


var updateProfile = function(req,res){
	console.log("Inside user Profile Update");
	var query = {'email':req.body.user.email};

	//console.log(req.body.user);
	
	Users.findOneAndUpdate(query, req.body.user, {upsert:false}, function(err, doc){
		
	    if (err) {
	    	res
			.status(400)
			.send({"result":"Bad request"});
			return;
	    }
	    else {
	    	console.log(doc);
	res
 	.status(200)
 	.send({"result":"User Updated"});
		
	};
	})	
};

var getLoginUserDetails = function(req,res){
	console.log("Inside Get user");
	
 	
 	Users.findOne({"email":req.session.user.emailId},function(err,user){
 		if(err || user == null){
 			res
 			.status(404)
 			.send({"result":"user not found"});
 			return;
 			
 		}
 		res
 		.status(200)
 		.send({"result":user});
 	});
	
};

var getUserProfile = function(req,res){

	if(req.session.user==undefined||req.session.user==null)
	{
		console.log("No Session");
		//res.status(400);
		res.status(401);
		res.json({"response":"Not Authenticated. Please login first"});
	}

else{
	console.log("Inside Get LoggedIn user service");
	 	
 	Users.findOne({"email":req.session.user.emailId},function(err,user){
 		if(err || user == null){
 			res
 			.status(400)
 			.send({"result":"user not found"});
 			return;
 			
 		}

 		var UserObject = 
 		{
		 	"firstname": user.firstname,
		    "lastname": user.lastname,
		    "email": user.email,
		    "user_id": user.user_id,
		    "type": user.type,
		    "UserType": user.UserType,
		    "phone" :user.phone,
		    "address": user.address,
		    "creditcard":user.carddetails,
 		};
 				
 		res
 		.status(200)
 		.send({"user":UserObject});
 	});
	
	}
};


var isUserLoggedIn = function(req,res) {

	if(req.session.user==undefined||req.session.user==null)
	{
		console.log("No Session");
		//res.status(400);
		res.status(401);
		res.json({"response":"Not Authenticated. Please login first"});
	}
	else{
		res.status(200);
		res.json({"response":"Authenticated."});	
	}
}

var logout = function(req,res) {
	

	//log capture, always remove previous file everytime and add the one in which next log is to be stored
		winston.remove(winston.transports.File);
		winston.add(winston.transports.File, { filename: 'public/LogFiles/AirbnbAnalysis.json' });
		winston.log('info', 'logout button clicked', { page_name : 'logout_page', user_email : req.session.user.emailId, city : req.session.user.address.city, state : req.session.user.address.state, country : req.session.user.address.country});	 	

		winston.remove(winston.transports.File);
		winston.add(winston.transports.File, { filename: 'public/LogFiles/UserTracking.json' });
		req.session.user.user_tracker.push("logout_page");
		winston.log('info', 'user tracker updated', {session_id : req.session.user.session_id, user_email : req.session.user.emailId, "user_tracker" : req.session.user.user_tracker});

	req.session.destroy();
	res.json({"userLoggedIn":false});

}

exports.updateHostProfile = updateHostProfile;
exports.getUserProfile = getUserProfile;
exports.userSignup = userSignup;
//exports.userLogIn = userLogIn;
exports.deleteUser = deleteLogin;
exports.updateUser = updateProfile;
exports.getLoginUserDetails = getLoginUserDetails;
exports.authenticateLocal = authenticateLocal;
exports.isUserLoggedIn = isUserLoggedIn;
exports.logout = logout;
