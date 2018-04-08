/**
 * Created by nicolas baillod on 07.04.2018.
 */

var express = require('express');
var app = express();
var path = require('path');
var jquery = require('jquery');
var bodyParser = require('body-parser');
var jsonfile = require('jsonfile');
var fs = require('fs');

var file = './DataBase/users.json'




app.use(express.static('public'));
app.use('/jquery', express.static(__dirname + '/node_modules/jquery/dist/'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:false}));


app.get('/signup', function(req,res,next){
    res.sendFile(path.join(__dirname+'/public/HTML/SignUp.html'));
});

app.post('/gettingdata', function (req, res, next) {

    var username=req.body.username;
    var password=req.body.password;

    var user = {
        username: username,
        password: password
    };
    saveUser(user, function(err){
        if(err){
            res.status(404).send('User not saved');
            return;
        }
        res.send('User saved');
    });

});

function saveUser(user, callback){
    fs.writeFile(file, JSON.stringify(user), callback);
}


app.get('/login', function (req, res, next) {
    res.sendFile(path.join(__dirname+'/public/HTML/Login.html'));
});


app.post('/login', function (req, res, next) {

    // you might like to do a database look-up or something more scalable here
    if (req.body.username && req.body.username === req.body.password ) {
        res.redirect('/');
    } else {
        res.redirect('/login');
    }
});

app.get('/',function(req,res){

        res.sendFile(path.join(__dirname+'/public/HTML/Courriel.html'));
    });

app.get('/EmailListe',function(req,res){

    res.sendFile(path.join(__dirname+'/public/HTML/EmailListe.html'));

});

app.get('/ComposeEmail',function(req,res){

    res.sendFile(path.join(__dirname+'/public/HTML/ComposeEmail.html'));

});
app.get('/CarnetAdresse',function(req,res){

    res.sendFile(path.join(__dirname+'/public/HTML/CarnetAdresse.html'));

});

app.listen(3000);
console.log("server up and running ");
