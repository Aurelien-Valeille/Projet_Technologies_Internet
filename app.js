/**
 * Created by nicolas baillod on 07.04.2018.
 */

var express = require('express');
var app = express();
var path = require('path');

app.use(express.static('public'));


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
