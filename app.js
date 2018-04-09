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
var NodeRSA = require('node-rsa');


app.use(express.static('public'));

app.use('/jquery', express.static(__dirname + '/node_modules/jquery/dist/'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:false}));


var currentUser;
//sign up


app.get('/signup', function(req,res,next){
    res.sendFile(path.join(__dirname+'/public/HTML/SignUp.html'));
});

app.post('/gettingdata', function (req, res, next) {

    var username=req.body.username;
    var password=req.body.password;


    var user = {
        username: username,
        password: password,
        Publickey: new NodeRSA({b:512}).exportKey('public')
    };

    saveUser(user, function(err){
        if(err){
            res.status(404).send('User not saved, already exists');
            return;
        }
        res.send('User saved');

    });


function saveUser(user, callback){
    fs.writeFile('./DataBase/users/'+ username + '.json', JSON.stringify(user), callback);
    fs.chmod('./DataBase/users/'+ username + '.json', 4444, function(err){
        if(err)
            console.log(err);
    });
}
});

//login

app.get('/login', function (req, res, next) {
    res.sendFile(path.join(__dirname+'/public/HTML/Login.html'));
});


app.post('/postlogin', function (req, res, next) {

    fs.open('./DataBase/users/'+ req.body.username + '.json', 'r', (err, fd) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.send(req.body.username+'does not exists, please sign up')
                return;
            }
            throw err;
        }
       fs.readFile('./DataBase/users/'+ req.body.username + '.json', 'utf8', function(err, data){
           if(err)
               console.error(err)
          currentUser=JSON.parse(data);
           if(currentUser.password === req.body.password) {
               res.sendFile(path.join(__dirname+'/public/HTML/Courriel.html'));
           }else{
               res.redirect('/login');
           }
       })
});

});

app.get('/',function(req,res){

        res.sendFile(path.join(__dirname+'/public/HTML/Login.html'));
    });

app.get('/EmailListe',function(req,res){

    res.sendFile(path.join(__dirname+'/public/HTML/EmailListe.html'));

});

app.get('/ComposeEmail',function(req,res){

    res.sendFile(path.join(__dirname+'/public/HTML/ComposeEmail.html'));

});

app.post('/send', function(req,res) {

    var message = req.body.message;
    var destinataire = req.body.destinataire;
    var objet = req.body.objet;

    var key = new NodeRSA();


    fs.open('./DataBase/users/' + destinataire + '.json', 'r', (err, fd) => {
        if(err) {
            if(err.code === 'ENOENT') {
                res.send(destinataire + ' does not exists')
                return;
            }
            throw err;
        }
    });

        var dest = fs.readFileSync('./DataBase/users/' + destinataire + '.json', 'utf8');

        var parsDest = JSON.parse(dest);

        var keyData = parsDest.Publickey;
        console.log(keyData);
        key.importKey(keyData, 'public');

            var encrypted = key.encrypt(message, 'base64','utf8');

            var email = {
                from: currentUser.Publickey,
                to: parsDest.Publickey,
                objet: objet,
                message: encrypted
            }
    if (!fs.existsSync('./Database/emails/' + destinataire + '.json')) {
        fs.writeFileSync('./Database/emails/' + destinataire + '.json', JSON.stringify(email));
    }else{
                fs.appendFileSync('./Database/emails/' + destinataire + '.json', ','+JSON.stringify(email))
    }

});
app.get('/CarnetAdresse',function(req,res){

    res.sendFile(path.join(__dirname+'/public/HTML/CarnetAdresse.html'));

});

app.listen(3000);
console.log("server up and running");
